/**
 * Geo gating — US-5 / constitution Article V.
 *
 * Polymarket's main platform restricts trading by jurisdiction; the US is
 * close-only (no new orders) as of 2026-08-31. See the polymarket-api skill.
 * This module decides only whether REAL betting may be offered. Browsing, AI
 * assistance and demo mode are never gated — they move no money.
 */

/** Full block (sanctions). No trading of any kind. */
export const BLOCKED_COUNTRIES = new Set(["IR", "KP", "SY", "CU", "RU", "BY"]);

/** Close-only: existing positions may be closed, but no new orders. */
export const CLOSE_ONLY_COUNTRIES = new Set([
  "US", "GB", "DE", "FR", "BE", "PL", "SG", "TH", "AU", "CA", "TW", "PT", "IT",
]);

export type GeoDecision = {
  country: string | null;
  bettingAllowed: boolean;
  reason?: string;
};

const UNKNOWN_REASON =
  "We could not determine your region, so real betting is turned off. Demo mode is available.";

export function evaluateGeo(country: string | null | undefined): GeoDecision {
  const code = (country ?? "").trim().toUpperCase();

  // Real money: an undeterminable region is not permission.
  if (!code) {
    return { country: null, bettingAllowed: false, reason: UNKNOWN_REASON };
  }
  if (BLOCKED_COUNTRIES.has(code)) {
    return {
      country: code,
      bettingAllowed: false,
      reason: "Polymarket is not available in your region.",
    };
  }
  if (CLOSE_ONLY_COUNTRIES.has(code)) {
    return {
      country: code,
      bettingAllowed: false,
      // Kept short deliberately (006 / LE-1): this renders above the market
      // list, and the long enumeration ran to a quarter of a 390px screen. The
      // substance is unchanged — what is refused, why, and what still works.
      // The widget's own framing supplies the region, so this does not repeat it.
      reason:
        "New bets are not available in your region — Polymarket's main exchange is close-only here. Demo mode still works.",
    };
  }
  return { country: code, bettingAllowed: true };
}
