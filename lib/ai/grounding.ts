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

type RawSuggestion = { marketId?: unknown; tokenId?: unknown; reasoning?: unknown };

export function groundSuggestions(candidates: Market[], raw: unknown): GroundedSuggestion[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { suggestions?: unknown }).suggestions;
  if (!Array.isArray(list) || candidates.length === 0) return [];

  const byId = new Map(candidates.map((m) => [m.id, m]));
  const out: GroundedSuggestion[] = [];

  for (const entry of list) {
    if (out.length >= MAX_SUGGESTIONS) break;
    if (!entry || typeof entry !== "object") continue;

    const { marketId, tokenId, reasoning } = entry as RawSuggestion;
    const market = byId.get(String(marketId));
    if (!market) continue; // market was never supplied to the model

    const outcome: Outcome | undefined = market.outcomes.find(
      (o) => o.tokenId === String(tokenId),
    );
    if (!outcome) continue; // token does not belong to this market

    // market and outcome are the objects we fetched — not anything the model wrote.
    out.push({
      market,
      outcome,
      reasoning: typeof reasoning === "string" ? reasoning : "",
    });
  }

  return out;
}
