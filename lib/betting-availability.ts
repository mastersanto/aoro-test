/**
 * Whether REAL betting may be offered, and why not (US-5 / Art. V).
 *
 * Extracted as a pure function on purpose: geo must gate the control itself, not
 * merely the wording of a message.
 *
 * `realBettingBuilt` is permanently false as of 2026-08-31: the project owner
 * withdrew US-2, so this widget does not place real bets at all. The region and
 * per-market checks are KEPT and still run first. They are the compliance answer,
 * they were the expensive part to get right, and deleting working safety code to
 * match a scope cut is how a codebase quietly loses the reason it was careful.
 */
import type { GeoDecision } from "@/lib/geo";

export type AvailabilityInput = {
  geo: GeoDecision | null;
  marketRestricted?: boolean;
  /**
   * Whether this build can place a real bet at all. Permanently false — US-2 was
   * withdrawn 2026-08-31. Kept as a parameter rather than inlined so the
   * predicate still states the reason instead of assuming it.
   */
  realBettingBuilt: boolean;
};

export type Availability = { allowed: boolean; reason?: string };

export function realBettingAvailability({
  geo,
  marketRestricted = false,
  realBettingBuilt,
}: AvailabilityInput): Availability {
  // Region first: it is the compliance answer, and it outlives any scope decision
  // about whether real betting is built.
  if (geo === null) {
    return {
      allowed: false,
      reason: "We could not determine your region yet, so real betting is turned off. Demo mode is available.",
    };
  }
  if (!geo.bettingAllowed) {
    return {
      allowed: false,
      reason: geo.reason ?? "Real betting is not available in your region.",
    };
  }
  if (marketRestricted) {
    return {
      allowed: false,
      reason: "This market is restricted and cannot be bet on from the widget. Demo mode still works.",
    };
  }
  if (!realBettingBuilt) {
    return {
      allowed: false,
      // Not "yet": saying so would promise something that is not coming.
      reason:
        "This widget does not place real bets — it is demo-only by design. Demo mode runs the same flow against live prices with a practice balance.",
    };
  }
  return { allowed: true };
}
