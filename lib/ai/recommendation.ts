/**
 * AR-1 freshness — feature 003.
 *
 * An argument is bound to the price it was made from. Article II requires
 * reasoning "with current odds"; a case argued at one price sitting beside a bet
 * entry at another is not that. Pure: no clock of its own, no network, so every
 * boundary is testable exactly.
 */

/** Withdrawal thresholds. Fixed by the spec, not by the implementer. */
export const PRICE_TOLERANCE = 0.02; // 2 percentage points, either direction
export const MAX_AGE_MS = 10 * 60_000; // 10 minutes

export type Freshness = "fresh" | "stale" | "expired" | "closed";

export type FreshnessInput = {
  /** The price the argument was made from, recorded by the route. */
  arguedAtPrice: number;
  /** The outcome's price now, from the application's own market data. */
  currentPrice: number | null | undefined;
  /** When the recommendation was produced. */
  createdAt: number;
  now: number;
  marketClosed?: boolean;
};

export function freshness({
  arguedAtPrice,
  currentPrice,
  createdAt,
  now,
  marketClosed = false,
}: FreshnessInput): Freshness {
  // Closed first: it is the most final reason, and reporting "stale" for a
  // market that has resolved would understate what happened.
  if (marketClosed) return "closed";

  if (now - createdAt > MAX_AGE_MS) return "expired";

  // Without a usable price on both sides there is nothing to compare, and
  // "fresh" would be an assertion rather than a measurement.
  if (!Number.isFinite(arguedAtPrice)) return "stale";
  if (currentPrice === null || currentPrice === undefined || !Number.isFinite(currentPrice)) {
    return "stale";
  }

  return Math.abs(currentPrice - arguedAtPrice) > PRICE_TOLERANCE ? "stale" : "fresh";
}
