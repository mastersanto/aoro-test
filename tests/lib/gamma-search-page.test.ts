/**
 * Paginated search (004 / UX-1).
 *
 * /public-search returns `pagination: {hasMore, totalResults}` and accepts
 * `page=N` (verified live 2026-08-31). The shipped client discarded both, which
 * capped search at one page while more results existed upstream.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { searchMarkets } from "@/lib/polymarket/gamma";

const calls: string[] = [];

function stub(body: unknown) {
  vi.stubGlobal("fetch", async (url: string) => {
    calls.push(String(url));
    return { ok: true, status: 200, json: async () => body };
  });
}

const event = (id: string) => ({
  markets: [
    {
      id,
      question: `Market ${id}?`,
      slug: `m-${id}`,
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.4","0.6"]',
      clobTokenIds: `["${id}-y","${id}-n"]`,
      volume: "10",
      volume24hr: "5",
      liquidity: "3",
      endDate: "2026-12-31T00:00:00Z",
      active: true,
      closed: false,
      restricted: false,
    },
  ],
});

beforeEach(() => {
  calls.length = 0;
});
afterEach(() => vi.unstubAllGlobals());

describe("searchMarkets pagination", () => {
  it("reports that more results exist when the exchange says so", async () => {
    stub({ events: [event("a")], pagination: { hasMore: true, totalResults: 900 } });
    const res = await searchMarkets("bitcoin", 20);
    expect(res.hasMore).toBe(true);
    expect(res.markets.map((m) => m.id)).toEqual(["a"]);
  });

  it("reports no more results when the exchange says so", async () => {
    stub({ events: [event("a")], pagination: { hasMore: false, totalResults: 1 } });
    expect((await searchMarkets("bitcoin", 20)).hasMore).toBe(false);
  });

  it("treats a missing pagination block as no more results", async () => {
    // Better to under-promise than to render a control that fetches nothing.
    stub({ events: [event("a")] });
    expect((await searchMarkets("bitcoin", 20)).hasMore).toBe(false);
  });

  it("requests the page it was asked for", async () => {
    stub({ events: [event("b")], pagination: { hasMore: true } });
    await searchMarkets("bitcoin", 20, 3);
    expect(calls[0]).toContain("page=3");
  });

  it("does not send a page parameter for the first page", async () => {
    stub({ events: [event("a")], pagination: { hasMore: true } });
    await searchMarkets("bitcoin", 20);
    expect(calls[0]).not.toContain("page=");
  });

  it("still drops closed markets from results", async () => {
    const closed = event("c");
    closed.markets[0].closed = true;
    stub({ events: [closed], pagination: { hasMore: false } });
    expect((await searchMarkets("x", 20)).markets).toHaveLength(0);
  });
});
