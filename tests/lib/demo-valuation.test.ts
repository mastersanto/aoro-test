/**
 * Valuing demo positions (004 / UX-4).
 *
 * The three refusals are the point of this module. Resolved markets often
 * report prices of ["0","0"] (verified against the live exchange 2026-08-31),
 * and the obvious rule — "a position is worth its shares at its price" — reads
 * that as a total loss the exchange never published. The same fabrication is
 * reachable on an open market with a missing price, and on a quote so old it is
 * no longer current.
 */
import { describe, it, expect } from "vitest";
import { valuePositions, type Quote } from "@/lib/demo-valuation";
import type { DemoPosition } from "@/lib/demo";

const NOW = 1_700_000_000_000;

function position(over: Partial<DemoPosition> = {}): DemoPosition {
  return {
    id: "p1",
    marketId: "m1",
    question: "Will it?",
    outcomeLabel: "Yes",
    tokenId: "t-yes",
    shares: 100,
    costUsd: 40,
    priceAtFill: 0.4,
    fillSource: "book",
    ...over,
  };
}

function quote(over: Partial<Quote> = {}): Quote {
  return {
    closed: false,
    at: NOW,
    prices: { "t-yes": 0.5, "t-no": 0.5 },
    ...over,
  };
}

const value = (positions: DemoPosition[], quotes: Record<string, Quote>) =>
  valuePositions(positions, quotes, NOW);

describe("an open market with a usable price", () => {
  it("values the position at shares times the current price", () => {
    const { rows } = value([position()], { m1: quote() });
    expect(rows[0].status).toBe("open");
    expect(rows[0].valueUsd).toBeCloseTo(50);
  });

  it("reports the difference against what it cost", () => {
    const { rows } = value([position()], { m1: quote() });
    expect(rows[0].pnlUsd).toBeCloseTo(10);
  });

  it("reports a real loss as a loss", () => {
    const { rows } = value([position()], { m1: quote({ prices: { "t-yes": 0.1 } }) });
    expect(rows[0].status).toBe("open");
    expect(rows[0].pnlUsd).toBeCloseTo(-30);
  });
});

describe("prices that carry no information are not zeros", () => {
  it("treats a missing quote as unvalued, not worthless", () => {
    const { rows } = value([position()], {});
    expect(rows[0].status).toBe("unvalued");
    expect(rows[0].valueUsd).toBeNull();
    expect(rows[0].pnlUsd).toBeNull();
  });

  it("treats a market missing the held token as unvalued", () => {
    const { rows } = value([position()], { m1: quote({ prices: { "t-other": 0.7 } }) });
    expect(rows[0].status).toBe("unvalued");
  });

  it("treats a zero price on an OPEN market as unvalued", () => {
    // BetPanel already refuses to price a bet outside 0-1; the same number
    // cannot simultaneously mean "no information" there and "worth nothing" here.
    const { rows } = value([position()], { m1: quote({ prices: { "t-yes": 0 } }) });
    expect(rows[0].status).toBe("unvalued");
  });

  it("treats a price above 1 as unvalued", () => {
    const { rows } = value([position()], { m1: quote({ prices: { "t-yes": 1.4 } }) });
    expect(rows[0].status).toBe("unvalued");
  });

  it("treats a stale quote as unvalued rather than calling it current", () => {
    // The widget deliberately keeps its last good market data through an outage,
    // so without an age check a frozen number would be labelled "current value".
    const { rows } = value([position()], { m1: quote({ at: NOW - 10 * 60_000 }) });
    expect(rows[0].status).toBe("unvalued");
  });

  it("accepts a quote that is merely recent", () => {
    const { rows } = value([position()], { m1: quote({ at: NOW - 5_000 }) });
    expect(rows[0].status).toBe("open");
  });
});

describe("closed markets", () => {
  it("settles a won position at one dollar a share", () => {
    const { rows } = value([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0.9999989, "t-no": 0.0000010 } }),
    });
    expect(rows[0].status).toBe("won");
    expect(rows[0].valueUsd).toBeCloseTo(100);
    expect(rows[0].pnlUsd).toBeCloseTo(60);
  });

  it("settles a lost position at zero", () => {
    const { rows } = value([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0.0000010, "t-no": 0.9999989 } }),
    });
    expect(rows[0].status).toBe("lost");
    expect(rows[0].valueUsd).toBe(0);
    expect(rows[0].pnlUsd).toBeCloseTo(-40);
  });

  it("NEVER reports a loss when the data names no winner", () => {
    // The whole reason this module exists. Verified: many resolved markets
    // report ["0","0"], from which nothing follows.
    const { rows } = value([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0, "t-no": 0 } }),
    });
    expect(rows[0].status).toBe("unresolved");
    expect(rows[0].valueUsd).toBeNull();
    expect(rows[0].pnlUsd).toBeNull();
  });

  it("is unresolved when no outcome reaches the settlement threshold", () => {
    const { rows } = value([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0.6, "t-no": 0.4 } }),
    });
    expect(rows[0].status).toBe("unresolved");
  });

  it("is unresolved when two outcomes both look settled", () => {
    // Contradictory data is not a winner; picking one would invent a result.
    const { rows } = value([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0.999, "t-no": 0.999 } }),
    });
    expect(rows[0].status).toBe("unresolved");
  });

  it("settles a market with more than two outcomes", () => {
    const { rows } = value([position({ tokenId: "t-c" })], {
      m1: quote({ closed: true, prices: { "t-a": 0, "t-b": 0, "t-c": 0.9999 } }),
    });
    expect(rows[0].status).toBe("won");
  });

  it("reports a loss when a different outcome of three won", () => {
    const { rows } = value([position({ tokenId: "t-a" })], {
      m1: quote({ closed: true, prices: { "t-a": 0, "t-b": 0.9999, "t-c": 0 } }),
    });
    expect(rows[0].status).toBe("lost");
  });
});

describe("totals", () => {
  const quotes = {
    m1: quote(),
    m2: quote({ closed: true, prices: { "t-yes": 0, "t-no": 0 } }),
  };
  const positions = [
    position({ id: "a" }),
    position({ id: "b", marketId: "m2" }),
    position({ id: "c", marketId: "gone" }),
  ];

  it("sums only what could be valued", () => {
    const { totals } = value(positions, quotes);
    expect(totals.valueUsd).toBeCloseTo(50);
  });

  it("sums the cost of the positions it valued, so the difference is comparable", () => {
    // Totalling all three costs against one position's value would show a
    // fabricated loss of everything that could not be priced.
    const { totals } = value(positions, quotes);
    expect(totals.costUsd).toBeCloseTo(40);
    expect(totals.pnlUsd).toBeCloseTo(10);
  });

  it("states how many positions it could not value", () => {
    const { totals } = value(positions, quotes);
    expect(totals.excluded).toBe(2);
  });

  it("reports nothing rather than zero when nothing could be valued", () => {
    const { totals } = value([position({ marketId: "gone" })], {});
    expect(totals.valueUsd).toBeNull();
    expect(totals.pnlUsd).toBeNull();
    expect(totals.excluded).toBe(1);
  });

  it("handles an empty portfolio", () => {
    const { rows, totals } = value([], {});
    expect(rows).toEqual([]);
    expect(totals.excluded).toBe(0);
    expect(totals.valueUsd).toBeNull();
  });

  it("keeps every position in the output, valued or not", () => {
    const { rows } = value(positions, quotes);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.position.id)).toEqual(["a", "b", "c"]);
  });
});
