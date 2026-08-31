"use client";

import type { Market, Outcome } from "@/lib/polymarket/gamma";
import { formatPercent } from "@/lib/format";

export type Recommendation = {
  resolvesOn: string;
  priceImplies: string;
  caseFor: string;
  caseAgainst: string;
  favouredTokenId: string;
  arguedAtPrice: number;
};

/**
 * The scoped recommendation (feature 003).
 *
 * The counter-case sits in the same container at the same type size as the case
 * for, and is never collapsed — AR-2 makes that a requirement rather than a
 * layout preference, because a one-sided argument is this feature's specific harm.
 */
export function RecommendPanel({
  market,
  recommendation,
  loading,
  error,
  withheldReason,
  withdrawnReason,
  onRequest,
  onUse,
}: {
  market: Market;
  recommendation: Recommendation | null;
  loading?: boolean;
  error?: string | null;
  withheldReason?: string | null;
  /** Set when the argument no longer matches the live market. The argument is
   *  then removed rather than annotated — an argument about a price that no
   *  longer exists is not a weaker argument, it is the wrong one. */
  withdrawnReason?: string | null;
  onRequest: () => void;
  onUse: (outcome: Outcome) => void;
}) {
  const favoured = recommendation
    ? market.outcomes.find((o) => o.tokenId === recommendation.favouredTokenId)
    : undefined;

  return (
    <section
      aria-label="Outcome recommendation"
      className="rounded-panel border border-line bg-panel p-4"
    >
      <h2 className="text-sm font-semibold text-ink">What would you favour here?</h2>
      <p className="mt-0.5 text-xs text-dim">An opinion from current prices. Not a prediction.</p>

      <button
        type="button"
        onClick={onRequest}
        disabled={loading}
        className="mt-2 min-h-11 w-full rounded-control border border-up/40 px-3 text-sm font-medium text-up hover:bg-up/10 disabled:opacity-50"
      >
        {loading ? "Thinking…" : "What would you favour?"}
      </button>

      {error && (
        <p role="alert" className="mt-3 rounded-control bg-down/10 px-3 py-2 text-xs text-down">
          {error}
        </p>
      )}
      {withheldReason && !error && (
        <p role="status" className="mt-3 rounded-control bg-white/5 px-3 py-2 text-xs text-muted">
          {withheldReason}
        </p>
      )}

      {recommendation && favoured && withdrawnReason && (
        <p role="alert" className="mt-3 rounded-control bg-demo/10 px-3 py-2 text-xs text-demo">
          {withdrawnReason}
        </p>
      )}

      {recommendation && favoured && !withdrawnReason && (
        <div data-testid="recommendation" className="mt-3 flex flex-col gap-2">

          <p className="text-xs leading-snug text-dim">
            About: <span className="text-muted">{market.question}</span>
          </p>

          <p className="text-sm text-ink">
            Favours <span className="font-medium text-up">{favoured.label}</span>{" "}
            <span className="font-figure tabular-nums text-up">{formatPercent(favoured.price)}</span>
          </p>


          <p className="rounded-control border border-line bg-white/5 px-3 py-2 text-xs text-muted">
            AI assistance is not financial advice. This is an opinion about current prices, not a
            prediction, and you decide every bet.
          </p>

          <dl className="flex flex-col gap-1.5 text-xs leading-snug">
            <div>
              <dt className="text-dim">Resolves on</dt>
              <dd className="text-muted">{recommendation.resolvesOn}</dd>
            </div>
            <div>
              <dt className="text-dim">What the price shows</dt>
              <dd className="text-muted">{recommendation.priceImplies}</dd>
            </div>
            <div>
              <dt className="text-dim">The case for</dt>
              <dd data-testid="case-for" className="text-muted">{recommendation.caseFor}</dd>
            </div>
            <div>
              <dt className="text-dim">What would make it lose</dt>
              <dd data-testid="case-against" className="text-muted">
                {recommendation.caseAgainst}
              </dd>
            </div>
          </dl>


          <button
            type="button"
            onClick={() => onUse(favoured)}
            className="min-h-11 rounded-control border border-up/40 px-3 text-xs font-medium text-up hover:bg-up/10"
          >
            Use this — fills the bet form
          </button>
        </div>
      )}
    </section>
  );
}
