/**
 * Whether REAL betting may be offered, and why not (US-5 / Art. V).
 *
 * Extracted as a pure function on purpose: geo must gate the control itself, not
 * merely the wording of a message. Phase 6 flips `walletReady` and this predicate
 * keeps enforcing the compliance answer without further changes.
 */
import type { GeoDecision } from "@/lib/geo";

export type AvailabilityInput = {
  geo: GeoDecision | null;
  marketRestricted?: boolean;
  /** False until Phase 6 wires the wallet and CLOB order signing. */
  walletReady: boolean;
};

export type Availability = { allowed: boolean; reason?: string };

export function realBettingAvailability({
  geo,
  marketRestricted = false,
  walletReady,
}: AvailabilityInput): Availability {
  // Region first: it is the compliance answer and outlives the wallet work.
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
  if (!walletReady) {
    return {
      allowed: false,
      reason: "Real betting is not enabled in this build yet. Demo mode runs the same flow with a practice balance.",
    };
  }
  return { allowed: true };
}
