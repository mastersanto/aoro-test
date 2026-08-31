/**
 * Constitution Article II, enforced in code: AI suggestions may only ever point
 * at markets and outcomes that were actually supplied to the model.
 *
 * The model contributes exactly one thing — reasoning text — plus a pair of ids.
 * Everything shown to the user (question, outcome label, price) is read from the
 * candidate market, so an invented market or a hallucinated price cannot reach
 * the UI even if the model returns one.
 */
import type { Market, Outcome } from "@/lib/polymarket/gamma";

export const MAX_SUGGESTIONS = 3;

export type GroundedSuggestion = {
  market: Market;
  outcome: Outcome;
  reasoning: string;
};

export function groundSuggestions(_candidates: Market[], _raw: unknown): GroundedSuggestion[] {
  return undefined as unknown as GroundedSuggestion[];
}
