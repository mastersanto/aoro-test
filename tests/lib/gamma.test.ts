import { afterEach, describe, expect, it, vi } from "vitest";
import {
  GAMMA_BASE,
  GammaPayloadError,
  fetchMarkets,
  normalizeMarket,
  searchMarkets,
} from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";
import searchFixture from "../fixtures/gamma-search.json";

const rawMarket = fixture.markets[0];

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
    const [first, second] = market.outcomes;
    expect(first.label).toBe("Thiago Agustin Tirante");
    expect(first.price).toBeCloseTo(0.09);
    expect(first.tokenId).toMatch(/^\d+$/); // real CLOB token ids are long decimal strings
    expect(second.label).toBe("Adrian Mannarino");
    expect(second.price).toBeCloseTo(0.91);
  });

  it("coerces Gamma's numeric strings to numbers", () => {
    const market = normalizeMarket(rawMarket);
    // Gamma mixes types on the wire: volume/liquidity are strings, volume24hr a float.
    expect(typeof rawMarket.volume).toBe("string");
    expect(typeof rawMarket.volume24hr).toBe("number");
    expect(market.volume).toBeCloseTo(811543.44, 1);
    expect(market.volume24hr).toBeCloseTo(810797.88, 1);
    expect(market.liquidity).toBeCloseTo(13846.18, 1);
    expect(market.bestBid).toBeCloseTo(0.08);
    expect(market.bestAsk).toBeCloseTo(0.1);
  });

  it("carries through the flags the widget depends on", () => {
    const market = normalizeMarket(rawMarket);
    expect(market.id).toBe("3945923");
    expect(market.question).toContain("Tirante");
    expect(market.closed).toBe(false);
    expect(market.active).toBe(true);
    // US-5 honors Gamma's per-market restriction flag (true on this live market).
    expect(market.restricted).toBe(true);
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
    expect(page.markets[0].outcomes[0].label).toBe("Thiago Agustin Tirante");
    expect(page.nextCursor).toBe(fixture.next_cursor);
  });

  it("reports a null cursor when the page is the last one", async () => {
    mockFetch({ markets: fixture.markets, next_cursor: null });
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
    const spy = mockFetch(searchFixture);
    await searchMarkets("bitcoin");
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.pathname).toBe("/public-search");
    expect(url.searchParams.get("q")).toBe("bitcoin");
  });

  it("returns normalized markets from the search payload", async () => {
    mockFetch(searchFixture);
    const results = await searchMarkets("bitcoin");
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].question).toContain("Bitcoin");
  });
});
