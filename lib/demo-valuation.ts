/**
 * What a demo position is worth now (004 / UX-4).
 *
 * Pure: no network, no clock of its own. The caller supplies quotes and the
 * time, so every branch below is directly testable.
 *
 * The design is one rule with three refusals. The rule: a position is worth its
 * shares at the current price, and a resolved market's price is its settlement.
 * The refusals exist because the rule, applied literally, invents results:
 *
 *  - Resolved markets often report prices of ["0","0"] (verified against the
 *    live exchange 2026-08-31). Read literally that is a total loss the
 *    exchange never published.
 *  - An open market with a missing or out-of-range price is the same
 *    fabrication in a different place. `BetPanel` already treats a price
 *    outside 0-1 as no information; it cannot mean "worth nothing" here.
 *  - The widget deliberately keeps its last good market data through an
 *    outage, so a quote must be young enough to be called current.
 *
 * In all three the position is reported as not valued and excluded from the
 * totals — never as zero, and never as a loss.
 */
import type { DemoPosition } from "@/lib/demo";

/** A price at or above this on a CLOSED market names the winning outcome. */
export const SETTLED = 0.99;

/** Older than this and a quote is no longer "current" (matches the refresh cadence x2). */
export const MAX_QUOTE_AGE_MS = 60_000;

export type Quote = {
  closed: boolean;
  /** When this quote was taken. */
  at: number;
  /** Price per outcome token id. */
  prices: Record<string, number>;
};

export type PositionStatus = "open" | "won" | "lost" | "unresolved" | "unvalued";

export type ValuedPosition = {
  position: DemoPosition;
  status: PositionStatus;
  /** null whenever the status carries no value — never 0 standing in for "unknown". */
  valueUsd: number | null;
  pnlUsd: number | null;
};

export type Totals = {
  costUsd: number | null;
  valueUsd: number | null;
  pnlUsd: number | null;
  /** How many positions could not be valued, so a total never hides them. */
  excluded: number;
};

function usable(price: number | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0 && price <= 1;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function valueOne(position: DemoPosition, quote: Quote | undefined, now: number): ValuedPosition {
  const unvalued = (status: PositionStatus = "unvalued"): ValuedPosition => ({
    position,
    status,
    valueUsd: null,
    pnlUsd: null,
  });

  if (!quote) return unvalued();
  if (!Number.isFinite(quote.at) || now - quote.at > MAX_QUOTE_AGE_MS) return unvalued();

  if (quote.closed) {
    // A winner is a single outcome at the settlement threshold. Two of them is
    // contradictory data, not a result to pick from.
    const winners = Object.entries(quote.prices).filter(([, p]) => usable(p) && p >= SETTLED);
    if (winners.length !== 1) return unvalued("unresolved");

    const won = winners[0][0] === position.tokenId;
    const valueUsd = won ? round2(position.shares) : 0;
    return {
      position,
      status: won ? "won" : "lost",
      valueUsd,
      pnlUsd: round2(valueUsd - position.costUsd),
    };
  }

  const price = quote.prices[position.tokenId];
  if (!usable(price)) return unvalued();

  const valueUsd = round2(position.shares * price);
  return { position, status: "open", valueUsd, pnlUsd: round2(valueUsd - position.costUsd) };
}

export function valuePositions(
  positions: DemoPosition[],
  quotes: Record<string, Quote>,
  now: number,
): { rows: ValuedPosition[]; totals: Totals } {
  const rows = positions.map((p) => valueOne(p, quotes[p.marketId], now));

  const valued = rows.filter((r) => r.valueUsd !== null);
  const excluded = rows.length - valued.length;

  if (valued.length === 0) {
    return { rows, totals: { costUsd: null, valueUsd: null, pnlUsd: null, excluded } };
  }

  // Cost is summed over the SAME positions as value. Totalling every cost
  // against a subset of values would show a loss of everything unpriceable.
  const costUsd = round2(valued.reduce((n, r) => n + r.position.costUsd, 0));
  const valueUsd = round2(valued.reduce((n, r) => n + (r.valueUsd ?? 0), 0));

  return { rows, totals: { costUsd, valueUsd, pnlUsd: round2(valueUsd - costUsd), excluded } };
}
