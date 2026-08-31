/**
 * POST /api/recommend — feature 003, Phase 3.
 * The model's schema carries text and ids only; every figure is the route's.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const parse = vi.fn();
vi.mock("@/lib/ai/client", () => ({
  ASSIST_MODEL: "claude-opus-5",
  MissingApiKeyError: class MissingApiKeyError extends Error {},
  getAnthropic: () => ({ messages: { parse } }),
}));
vi.mock("@/lib/polymarket/gamma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/gamma")>();
  return { ...actual, fetchMarketById: vi.fn() };
});

import { fetchMarketById, normalizeMarket } from "@/lib/polymarket/gamma";
import { POST } from "@/app/api/recommend/route";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const token = market.outcomes[0].tokenId;

const GOOD = {
  resolvesOn: "Resolves on the ATP's published result for this fixture.",
  priceImplies: "The price shows how the outcomes are trading against each other.",
  caseFor: "This outcome requires the match to complete with the named player recorded as the winner.",
  caseAgainst: "It fails if the other player wins or the match is abandoned before a result stands.",
  favouredTokenId: token,
};

function post(body: unknown = { marketId: market.id }) {
  return POST(new Request("http://localhost/api/recommend", { method: "POST", body: JSON.stringify(body) }));
}

beforeEach(() => {
  vi.mocked(fetchMarketById).mockResolvedValue(market);
  parse.mockResolvedValue({ parsed_output: GOOD });
});
afterEach(() => vi.clearAllMocks());

describe("grounding", () => {
  it("re-fetches the market server-side rather than trusting the client", async () => {
    await post({ marketId: market.id, market: { ...market, question: "SPOOFED" } });
    expect(fetchMarketById).toHaveBeenCalledWith(market.id);
    const sent = String(parse.mock.calls[0][0].messages[0].content);
    expect(sent).not.toContain("SPOOFED");
    expect(sent).toContain(market.question);
  });

  it("rejects a favoured token that does not belong to the market", async () => {
    parse.mockResolvedValue({ parsed_output: { ...GOOD, favouredTokenId: "not-this-market" } });
    const body = await (await post()).json();
    expect(body.recommendation).toBeUndefined();
    expect(body.withheld).toBe(true);
  });

  it("inserts arguedAtPrice itself — it is never in the model's schema", async () => {
    const body = await (await post()).json();
    expect(body.recommendation.arguedAtPrice).toBeCloseTo(market.outcomes[0].price);

    const schema = parse.mock.calls[0][0].output_config.format.schema;
    const props = schema.properties;
    expect(Object.keys(props)).not.toContain("arguedAtPrice");
    // No numeric field anywhere in what the model may return.
    for (const key of Object.keys(props)) {
      expect(props[key].type).not.toBe("number");
      expect(props[key].type).not.toBe("integer");
    }
  });

  it("constrains the model to exactly the four named parts plus the token", async () => {
    await post();
    const props = parse.mock.calls[0][0].output_config.format.schema.properties;
    expect(Object.keys(props).sort()).toEqual(
      ["caseAgainst", "caseFor", "favouredTokenId", "priceImplies", "resolvesOn"],
    );
  });
});

describe("the content screen gates the response body", () => {
  it("withholds a recommendation that fails the screen", async () => {
    parse.mockResolvedValue({
      parsed_output: { ...GOOD, caseFor: "this outcome is very likely to resolve" },
    });
    const body = await (await post()).json();
    expect(body.withheld).toBe(true);
    expect(body.recommendation).toBeUndefined();
  });

  it("leaks no fragment of the rejected text, and the reason is app-authored", async () => {
    const rejected = "the market is badly underpricing this";
    parse.mockResolvedValue({ parsed_output: { ...GOOD, caseFor: rejected } });
    const raw = JSON.stringify(await (await post()).json());
    expect(raw).not.toContain("underpricing");
    expect(raw).not.toContain(rejected);
    expect(raw).toMatch(/no view/i);
  });

  it("withholds when the counter-case is missing (AR-2), never one-sided", async () => {
    parse.mockResolvedValue({ parsed_output: { ...GOOD, caseAgainst: "" } });
    const body = await (await post()).json();
    expect(body.withheld).toBe(true);
    expect(JSON.stringify(body)).not.toContain(GOOD.caseFor);
  });

  it("regenerates at most once, then withholds", async () => {
    parse.mockResolvedValue({ parsed_output: { ...GOOD, caseFor: "this is virtually certain" } });
    const body = await (await post()).json();
    expect(parse).toHaveBeenCalledTimes(2); // one retry, no loop
    expect(body.withheld).toBe(true);
  });

  it("accepts a compliant second attempt", async () => {
    parse
      .mockResolvedValueOnce({ parsed_output: { ...GOOD, caseFor: "this is very likely" } })
      .mockResolvedValueOnce({ parsed_output: GOOD });
    const body = await (await post()).json();
    expect(body.recommendation).toBeDefined();
    expect(body.withheld).toBeUndefined();
  });

  it("returns a recommendation or a withholding, never both and never partial", async () => {
    const ok = await (await post()).json();
    expect("withheld" in ok).toBe(false);
    expect(Object.keys(ok.recommendation).sort()).toEqual(
      ["arguedAtPrice", "caseAgainst", "caseFor", "favouredTokenId", "priceImplies", "resolvesOn"],
    );
  });
});

describe("failure branch (AR-1)", () => {
  it("400s without a market id", async () => {
    expect((await post({})).status).toBe(400);
    expect(parse).not.toHaveBeenCalled();
  });

  it("404s for a market that does not exist", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue(null);
    expect((await post()).status).toBe(404);
  });

  it("503s when the market cannot be fetched, without leaking internals", async () => {
    vi.mocked(fetchMarketById).mockRejectedValue(new Error("Gamma failed: 500 gamma-api.polymarket.com"));
    const res = await post();
    expect(res.status).toBe(503);
    expect(JSON.stringify(await res.json())).not.toContain("gamma-api");
  });

  it("503s on a model error without leaking provider detail", async () => {
    parse.mockRejectedValue(new Error("401 invalid x-api-key sk-ant-secret"));
    const res = await post();
    expect(res.status).toBe(503);
    const raw = JSON.stringify(await res.json());
    expect(raw).not.toContain("sk-ant");
    expect(raw).not.toContain("x-api-key");
  });

  it("withholds rather than crashing on an unparseable model response", async () => {
    parse.mockResolvedValue({ parsed_output: null });
    const res = await post();
    expect([200, 503]).toContain(res.status);
    expect((await res.json()).recommendation).toBeUndefined();
  });

  it("does not recommend on a closed market", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue({ ...market, closed: true });
    const body = await (await post()).json();
    expect(body.recommendation).toBeUndefined();
    expect(parse).not.toHaveBeenCalled();
  });
});
