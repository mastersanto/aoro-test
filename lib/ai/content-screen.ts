/**
 * AR-3 content screen — feature 003.
 *
 * Removes the FORMS persuasion reliably takes from an argued recommendation.
 * The spec is explicit that this reduces harm rather than eliminating it; see
 * the Known limits section there. Pure by design: no model call, no network, so
 * every rule is testable directly.
 */

export type Part = "resolvesOn" | "priceImplies" | "caseFor" | "caseAgainst";
export type Parts = Record<Part, string>;

export type ScreenResult =
  | { ok: true }
  | { ok: false; rule: string; part: Part; evidence: string };

export const MAX_PART_CHARS = 320;

// T1 RED: implemented in T2.
export function screenRecommendation(_parts: Parts): ScreenResult {
  return { ok: true };
}
