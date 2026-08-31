import { describe, expect, it } from "vitest";
import { InvalidPriceError, estimatePayout } from "@/lib/payout";

describe("estimatePayout", () => {
  it("buys shares at the outcome price, each settling at $1", () => {
    // $10 at 25c buys 40 shares, worth $40 if the outcome resolves YES.
    expect(estimatePayout(10, 0.25)).toEqual({ shares: 40, payout: 40, profit: 30 });
  });

  it("returns almost no profit on a near-certain outcome", () => {
    const e = estimatePayout(100, 0.99);
    expect(e.shares).toBeCloseTo(101.01, 2);
    expect(e.payout).toBeCloseTo(101.01, 2);
    expect(e.profit).toBeCloseTo(1.01, 2);
  });

  it("returns a large payout on a long shot", () => {
    const e = estimatePayout(5, 0.02);
    expect(e.shares).toBeCloseTo(250, 2);
    expect(e.payout).toBeCloseTo(250, 2);
    expect(e.profit).toBeCloseTo(245, 2);
  });

  it("rounds money to cents so the confirmation cannot show a fake precision", () => {
    const e = estimatePayout(10, 0.33);
    expect(e.payout).toBe(Number(e.payout.toFixed(2)));
    expect(e.profit).toBe(Number(e.profit.toFixed(2)));
  });

  it("treats a zero stake as a zero position rather than an error", () => {
    expect(estimatePayout(0, 0.5)).toEqual({ shares: 0, payout: 0, profit: 0 });
  });

  it("rejects a negative stake", () => {
    expect(() => estimatePayout(-5, 0.5)).toThrow();
  });

  it("rejects prices outside the (0, 1] range, which would divide by zero or imply free money", () => {
    expect(() => estimatePayout(10, 0)).toThrow(InvalidPriceError);
    expect(() => estimatePayout(10, -0.1)).toThrow(InvalidPriceError);
    expect(() => estimatePayout(10, 1.5)).toThrow(InvalidPriceError);
  });

  it("rejects non-finite inputs", () => {
    expect(() => estimatePayout(Number.NaN, 0.5)).toThrow();
    expect(() => estimatePayout(10, Number.NaN)).toThrow(InvalidPriceError);
  });

  it("never reports a payout below the stake for a valid price", () => {
    for (const p of [0.01, 0.1, 0.5, 0.9, 1]) {
      const e = estimatePayout(25, p);
      expect(e.payout).toBeGreaterThanOrEqual(25);
      expect(e.profit).toBeGreaterThanOrEqual(0);
    }
  });
});
