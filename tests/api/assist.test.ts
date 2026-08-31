import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const parse = vi.fn();

vi.mock("@/lib/ai/client", () => ({
  ASSIST_MODEL: "claude-opus-5",
  MissingApiKeyError: class MissingApiKeyError extends Error {},
  getAnthropic: () => ({ messages: { parse } }),
}));

vi.mock("@/lib/polymarket/gamma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/gamma")>();
  return { ...actual, fetchMarkets: vi.fn(), searchMarkets: vi.fn() };
});

import { fetchMarkets, normalizeMarket, searchMarkets } from "@/lib/polymarket/gamma";
import { POST } from "@/app/api/assist/route";
import fixture from "../fixtures/gamma-keyset.json";

const candidates = fixture.markets.map(normalizeMarket);
const [marketA] = candidates;

function post(body: unknown) {
  return POST(new Request("http://localhost/api/assist", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.mocked(fetchMarkets).mockResolvedValue({ markets: candidates, nextCursor: null });
  vi.mocked(searchMarkets).mockResolvedValue({ markets: [], hasMore: false });
  parse.mockResolvedValue({
    parsed_output: {
      suggestions: [
        { marketId: marketA.id, tokenId: marketA.outcomes[0].tokenId, reasoning: "Odds imply 9%." },
      ],
    },
  });
});

afterEach(() => vi.clearAllMocks());

describe("POST /api/assist", () => {
  it("returns suggestions grounded in real markets", async () => {
    const res = await post({ prompt: "tennis" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0].market.id).toBe(marketA.id);
    expect(body.suggestions[0].outcome.price).toBe(marketA.outcomes[0].price);
    expect(body.suggestions[0].reasoning).toBe("Odds imply 9%.");
  });

  it("drops a hallucinated market rather than surfacing it (Art. II)", async () => {
    parse.mockResolvedValue({
      parsed_output: {
        suggestions: [{ marketId: "does-not-exist", tokenId: "0", reasoning: "invented" }],
      },
    });
    const body = await (await post({ prompt: "anything" })).json();
    expect(body.suggestions).toEqual([]);
    expect(JSON.stringify(body)).not.toContain("invented");
  });

  it("ignores a price the model tries to assert", async () => {
    parse.mockResolvedValue({
      parsed_output: {
        suggestions: [
          { marketId: marketA.id, tokenId: marketA.outcomes[0].tokenId, reasoning: "r", price: 0.99 },
        ],
      },
    });
    const body = await (await post({ prompt: "x" })).json();
    expect(body.suggestions[0].outcome.price).toBe(marketA.outcomes[0].price);
    expect(body.suggestions[0].outcome.price).not.toBe(0.99);
  });

  it("only ever sends the model markets it fetched itself", async () => {
    await post({ prompt: "tennis" });
    const sent = parse.mock.calls[0][0];
    const payload = String(sent.messages[0].content);
    for (const m of candidates) expect(payload).toContain(m.id);
    expect(sent.model).toBe("claude-opus-5");
  });

  it("constrains the model with a schema instead of trusting free text", async () => {
    await post({ prompt: "tennis" });
    const sent = parse.mock.calls[0][0];
    expect(sent.output_config?.format?.type).toBe("json_schema");
    expect(sent.system).toMatch(/never invent/i);
  });

  it("rejects an empty prompt", async () => {
    const res = await post({ prompt: "   " });
    expect(res.status).toBe(400);
  });

  it("caps an oversized prompt rather than forwarding it whole", async () => {
    await post({ prompt: "x".repeat(5000) });
    const payload = String(parse.mock.calls[0][0].messages[0].content);
    expect(payload.match(/x+/)?.[0].length).toBeLessThanOrEqual(500);
  });

  it("returns an empty list, not an error, when no markets are available", async () => {
    vi.mocked(fetchMarkets).mockResolvedValue({ markets: [], nextCursor: null });
    const res = await post({ prompt: "x" });
    expect(res.status).toBe(200);
    expect((await res.json()).suggestions).toEqual([]);
    expect(parse).not.toHaveBeenCalled();
  });

  it("never leaks provider internals when the model call fails", async () => {
    parse.mockRejectedValue(new Error("401 invalid x-api-key sk-ant-secret"));
    const res = await post({ prompt: "x" });
    expect(res.status).toBe(503);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("sk-ant");
    expect(body).not.toContain("x-api-key");
    expect(body).toMatch(/unavailable/i);
  });
});

describe("assist grounding survives the search page shape (004 / UX-1)", () => {
  it("uses the markets inside a search page, not the page object", async () => {
    // 004 changed searchMarkets to return {markets, hasMore}. Treating that as
    // an array yields zero searched candidates — and every mocked test here
    // would still pass, which is exactly how this class of bug ships.
    const searched = { ...marketA, id: "searched-only", question: "Searched only?" };
    vi.mocked(searchMarkets).mockResolvedValue({ markets: [searched], hasMore: true });
    vi.mocked(fetchMarkets).mockResolvedValue({ markets: [], nextCursor: null });
    parse.mockResolvedValue({
      parsed_output: {
        suggestions: [
          { marketId: "searched-only", tokenId: searched.outcomes[0].tokenId, reasoning: "ok" },
        ],
      },
    });

    const body = await (await post({ prompt: "anything" })).json();

    // A search-only market can only be suggested if the route actually read it
    // out of the page object.
    expect(body.suggestions).toHaveLength(1);
    expect(body.suggestions[0].market.id).toBe("searched-only");
  });
});
