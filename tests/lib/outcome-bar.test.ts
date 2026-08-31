import { describe, expect, it } from "vitest";
import { barSegments } from "@/lib/outcome-bar";

const o = (label: string, price: number, tokenId = label) => ({ label, price, tokenId });

describe("barSegments", () => {
  it("splits a two-outcome market in proportion to price", () => {
    const s = barSegments([o("Yes", 0.19), o("No", 0.81)]);
    expect(s.map((x) => Math.round(x.percent))).toEqual([19, 81]);
  });

  it("always fills the bar exactly", () => {
    for (const prices of [[0.09, 0.91], [0.5, 0.5], [0.33, 0.33, 0.34], [0.2, 0.3, 0.5]]) {
      const s = barSegments(prices.map((p, i) => o(`o${i}`, p)));
      const total = s.reduce((n, x) => n + x.percent, 0);
      expect(total).toBeCloseTo(100, 6);
    }
  });

  it("normalizes when prices do not sum to 1", () => {
    // Real books drift; the bar must still describe relative odds.
    const s = barSegments([o("A", 0.6), o("B", 0.6)]);
    expect(s.map((x) => Math.round(x.percent))).toEqual([50, 50]);
  });

  it("renders a single-outcome market as a full bar", () => {
    expect(barSegments([o("Only", 0.42)])).toEqual([
      { tokenId: "Only", label: "Only", percent: 100 },
    ]);
  });

  it("handles a many-outcome market without dropping any", () => {
    const s = barSegments(Array.from({ length: 8 }, (_, i) => o(`c${i}`, 0.125)));
    expect(s).toHaveLength(8);
    expect(s.every((x) => x.percent > 0)).toBe(true);
  });

  it("never produces NaN from a zero or missing price", () => {
    const s = barSegments([o("A", 0), o("B", 0)]);
    expect(s.every((x) => Number.isFinite(x.percent))).toBe(true);
    expect(s.reduce((n, x) => n + x.percent, 0)).toBeCloseTo(100, 6);
  });

  it("ignores negative prices rather than inverting the bar", () => {
    const s = barSegments([o("A", -0.5), o("B", 0.5)]);
    expect(s.every((x) => x.percent >= 0)).toBe(true);
    expect(s.reduce((n, x) => n + x.percent, 0)).toBeCloseTo(100, 6);
  });

  it("returns nothing for no outcomes", () => {
    expect(barSegments([])).toEqual([]);
  });

  it("keeps label and token id alongside each width", () => {
    const s = barSegments([o("Yes", 0.19, "t1"), o("No", 0.81, "t2")]);
    expect(s[0]).toMatchObject({ tokenId: "t1", label: "Yes" });
    expect(s[1]).toMatchObject({ tokenId: "t2", label: "No" });
  });
});
