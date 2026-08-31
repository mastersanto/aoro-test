import { describe, expect, it } from "vitest";
import { MAX_AGE_MS, PRICE_TOLERANCE, freshness } from "@/lib/ai/recommendation";

const T0 = 1_700_000_000_000;
const base = { arguedAtPrice: 0.19, currentPrice: 0.19, createdAt: T0, now: T0 };

describe("freshness", () => {
  it("is fresh within both bounds", () => {
    expect(freshness(base)).toBe("fresh");
    expect(freshness({ ...base, currentPrice: 0.2, now: T0 + 60_000 })).toBe("fresh");
  });

  it("goes stale when the price moves more than the tolerance, either direction", () => {
    expect(freshness({ ...base, currentPrice: 0.19 + PRICE_TOLERANCE + 0.001 })).toBe("stale");
    expect(freshness({ ...base, currentPrice: 0.19 - PRICE_TOLERANCE - 0.001 })).toBe("stale");
  });

  it("holds at exactly the tolerance — the boundary is the spec's, not an implementer's", () => {
    expect(freshness({ ...base, currentPrice: 0.19 + PRICE_TOLERANCE })).toBe("fresh");
    expect(freshness({ ...base, currentPrice: 0.19 - PRICE_TOLERANCE })).toBe("fresh");
  });

  it("expires strictly after the age limit, and holds exactly at it", () => {
    expect(freshness({ ...base, now: T0 + MAX_AGE_MS })).toBe("fresh");
    expect(freshness({ ...base, now: T0 + MAX_AGE_MS + 1 })).toBe("expired");
  });

  it("reports closed regardless of price or age", () => {
    expect(freshness({ ...base, marketClosed: true })).toBe("closed");
    expect(freshness({ ...base, marketClosed: true, currentPrice: 0.19 })).toBe("closed");
  });

  it("prefers closed over stale and expired, since it is the more final reason", () => {
    expect(
      freshness({ ...base, marketClosed: true, currentPrice: 0.9, now: T0 + MAX_AGE_MS * 5 }),
    ).toBe("closed");
  });

  it("never reads fresh without a usable current price", () => {
    for (const currentPrice of [null, undefined, Number.NaN]) {
      expect(freshness({ ...base, currentPrice })).not.toBe("fresh");
    }
  });

  it("treats an unusable argued-at price as not fresh either", () => {
    expect(freshness({ ...base, arguedAtPrice: Number.NaN })).not.toBe("fresh");
  });

  it("every state is reachable", () => {
    const seen = new Set([
      freshness(base),
      freshness({ ...base, currentPrice: 0.5 }),
      freshness({ ...base, now: T0 + MAX_AGE_MS + 1 }),
      freshness({ ...base, marketClosed: true }),
    ]);
    expect(seen).toEqual(new Set(["fresh", "stale", "expired", "closed"]));
  });

  it("uses the spec's numbers", () => {
    expect(PRICE_TOLERANCE).toBeCloseTo(0.02);
    expect(MAX_AGE_MS).toBe(600_000);
  });
});
