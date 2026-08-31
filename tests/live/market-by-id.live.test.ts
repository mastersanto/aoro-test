/**
 * Live checks for the by-id endpoint feature 003 re-hydrates from.
 * Excluded from `npm test`; run with `npm run test:live`.
 *
 * In its own file so the "no pre-existing test file modified" rule stays
 * literally true rather than needing an exception argued for it.
 */
import { describe, expect, it } from "vitest";
import { fetchMarkets } from "@/lib/polymarket/gamma";

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
