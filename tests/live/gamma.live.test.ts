/**
 * Live network checks against the real Gamma API. Excluded from `npm test` so the
 * default suite stays hermetic; run with `npm run test:live`.
 * These are the repeatable form of task Verify lines that say "a live call ...".
 */
import { describe, expect, it } from "vitest";
import { fetchMarkets, searchMarkets } from "@/lib/polymarket/gamma";

describe("Gamma (live)", () => {
  it("returns open markets ordered by 24h volume, descending", async () => {
    const page = await fetchMarkets({ limit: 5 });
    expect(page.markets.length).toBeGreaterThan(0);
    expect(page.markets.every((m) => !m.closed)).toBe(true);

    const volumes = page.markets.map((m) => m.volume24hr);
    expect(volumes).toEqual([...volumes].sort((a, b) => b - a));
  }, 30_000);

  it("normalizes the JSON-encoded fields on live data", async () => {
    const page = await fetchMarkets({ limit: 3 });
    for (const m of page.markets) {
      expect(m.outcomes.length).toBeGreaterThan(0);
      for (const o of m.outcomes) {
        expect(typeof o.label).toBe("string");
        expect(Number.isFinite(o.price)).toBe(true);
        expect(o.tokenId).toMatch(/^\d+$/);
      }
    }
  }, 30_000);

  it("pages forward with the keyset cursor", async () => {
    const first = await fetchMarkets({ limit: 2 });
    expect(first.nextCursor).toBeTruthy();
    const second = await fetchMarkets({ limit: 2, cursor: first.nextCursor });
    const firstIds = first.markets.map((m) => m.id);
    expect(second.markets.some((m) => firstIds.includes(m.id))).toBe(false);
  }, 30_000);

  it("finds markets by keyword", async () => {
    const results = await searchMarkets("bitcoin", 5);
    expect(results.length).toBeGreaterThan(0);
  }, 30_000);
});

describe("CLOB read-only (live)", () => {
  it("returns a usable buy price, midpoint and book for a live token", async () => {
    const { fetchBook, fetchMidpoint, fetchPrice } = await import("@/lib/polymarket/clob");
    const page = await fetchMarkets({ limit: 1 });
    const tokenId = page.markets[0].outcomes[0].tokenId;

    const price = await fetchPrice(tokenId, "buy");
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThanOrEqual(1);

    const mid = await fetchMidpoint(tokenId);
    expect(mid).toBeGreaterThan(0);

    const book = await fetchBook(tokenId);
    expect(Array.isArray(book.bids)).toBe(true);
    expect(Array.isArray(book.asks)).toBe(true);
  }, 30_000);
});

describe("Gamma by-id (live)", () => {
  it("returns a single market with an authoritative closed flag", async () => {
    const { fetchMarketById } = await import("@/lib/polymarket/gamma");
    const page = await fetchMarkets({ limit: 1 });
    const id = page.markets[0].id;

    const market = await fetchMarketById(id);
    expect(market).not.toBeNull();
    expect(market!.id).toBe(id);
    expect(typeof market!.closed).toBe("boolean");
    expect(market!.outcomes.length).toBeGreaterThan(0);
  }, 30_000);

  it("returns null for a market id that does not exist", async () => {
    const { fetchMarketById } = await import("@/lib/polymarket/gamma");
    expect(await fetchMarketById("000000000")).toBeNull();
  }, 30_000);
});
