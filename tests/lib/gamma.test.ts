import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GAMMA_BASE,
  GammaPayloadError,
  fetchMarkets,
  normalizeMarket,
  searchMarkets,
} from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const rawMarket = fixture.data[0];

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("normalizeMarket", () => {
  it("parses the JSON-encoded outcomes/outcomePrices/clobTokenIds strings into arrays", () => {
    const market = normalizeMarket(rawMarket);
    expect(Array.isArray(market.outcomes)).toBe(true);
    expect(market.outcomes).toHaveLength(2);
  });

  it("zips label, price and token id into each outcome, with price as a number", () => {
    const market = normalizeMarket(rawMarket);
    expect(market.outcomes[0]).toEqual({
      label: "Yes",
      price: 0.62,
      tokenId: "71358931...",
    });
    expect(market.outcomes[1].label).toBe("No");
    expect(market.outcomes[1].price).toBeCloseTo(0.38);
  });

  it("coerces Gamma's numeric strings to numbers", () => {
    const market = normalizeMarket(rawMarket);
    expect(market.volume).toBe(125000.5);
    expect(market.volume24hr).toBe(8300.25);
    expect(market.liquidity).toBe(45000);
    expect(market.bestBid).toBeCloseTo(0.61);
    expect(market.bestAsk).toBeCloseTo(0.63);
  });

  it("carries through the flags the widget depends on", () => {
    const market = normalizeMarket(rawMarket);
    expect(market.id).toBe("516710");
    expect(market.question).toBe("Will BTC close above $100k on Dec 31?");
    expect(market.closed).toBe(false);
    expect(market.active).toBe(true);
    // US-5 honors Gamma's per-market restriction flag.
    expect(normalizeMarket(fixture.data[1]).restricted).toBe(true);
  });

  it("rejects a payload whose encoded fields are not valid JSON", () => {
    expect(() => normalizeMarket({ ...rawMarket, outcomes: "[not json" })).toThrow(
      GammaPayloadError,
    );
  });

  it("rejects a payload whose outcome arrays disagree in length", () => {
    expect(() =>
      normalizeMarket({ ...rawMarket, outcomePrices: '["0.62"]' }),
    ).toThrow(GammaPayloadError);
  });
});

describe("fetchMarkets", () => {
  it("calls the keyset endpoint, never the sunset offset endpoint", async () => {
    const spy = mockFetch(fixture);
    await fetchMarkets();
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${GAMMA_BASE}/markets/keyset`);
  });

  it("requests only open markets, ordered by 24h volume descending", async () => {
    const spy = mockFetch(fixture);
    await fetchMarkets();
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.searchParams.get("closed")).toBe("false");
    expect(url.searchParams.get("order")).toBe("volume24hr");
    expect(url.searchParams.get("ascending")).toBe("false");
  });

  it("passes the keyset cursor and tag filter when given", async () => {
    const spy = mockFetch(fixture);
    await fetchMarkets({ cursor: "MjUwMA==", tagId: "politics", limit: 5 });
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.searchParams.get("after_cursor")).toBe("MjUwMA==");
    expect(url.searchParams.get("tag_id")).toBe("politics");
    expect(url.searchParams.get("limit")).toBe("5");
  });

  it("returns normalized markets plus the next cursor", async () => {
    mockFetch(fixture);
    const page = await fetchMarkets();
    expect(page.markets).toHaveLength(2);
    expect(page.markets[0].outcomes[0].label).toBe("Yes");
    expect(page.nextCursor).toBe("MjUwMA==");
  });

  it("reports a null cursor when the page is the last one", async () => {
    mockFetch({ data: fixture.data, next_cursor: null });
    const page = await fetchMarkets();
    expect(page.nextCursor).toBeNull();
  });

  it("throws on a non-ok upstream response so callers can degrade", async () => {
    mockFetch({ error: "rate limited" }, false, 429);
    await expect(fetchMarkets()).rejects.toThrow();
  });
});

describe("searchMarkets", () => {
  it("queries the public-search endpoint with the user's terms", async () => {
    const spy = mockFetch({ events: [], markets: fixture.data, tags: [] });
    await searchMarkets("bitcoin");
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/public-search");
    expect(url.searchParams.get("q")).toBe("bitcoin");
  });

  it("returns normalized markets from the search payload", async () => {
    mockFetch({ events: [], markets: fixture.data, tags: [] });
    const results = await searchMarkets("bitcoin");
    expect(results).toHaveLength(2);
    expect(results[0].question).toContain("BTC");
  });
});
