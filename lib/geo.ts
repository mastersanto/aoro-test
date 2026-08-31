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

export function evaluateGeo(_country: string | null | undefined): GeoDecision {
  return undefined as unknown as GeoDecision;
}
