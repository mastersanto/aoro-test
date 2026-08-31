"use client";

import type { BetDraft, BetMode } from "@/lib/bet";
import { estimatePayout } from "@/lib/payout";
import { formatPercent, formatUsdPrecise } from "@/lib/format";

/**
 * Constitution Article II: the single confirmation every bet must pass through.
 * It shows market, outcome, amount, price and estimated payout, and placement
 * happens only via its own action — never from the panel behind it.
 */
export function ConfirmBetDialog({
  draft,
  mode,
  pending,
  livePrice,
  marketClosed = false,
  onConfirm,
  onCancel,
  onReview,
}: {
  draft: BetDraft;
  mode: BetMode;
  pending?: boolean;
  /** The outcome's price now. May differ from the draft's after a refresh. */
  livePrice?: number | null;
  marketClosed?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Return to the form so the user re-reviews at the new price. */
  onReview?: () => void;
}) {
  const { payout } = estimatePayout(draft.amountUsd, draft.outcome.price);

  // The draft stays authoritative: the number the user agreed to never changes
  // underneath them. A move is surfaced instead, and commitment is withdrawn
  // until they look again (003 / AR-1).
  const moved =
    typeof livePrice === "number" &&
    Number.isFinite(livePrice) &&
    Math.abs(livePrice - draft.outcome.price) > 0.0001;
  const blocked = marketClosed || moved;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-panel border border-line-strong bg-panel p-5 shadow-2xl"
      >
        <h2 id="confirm-title" className="text-sm font-semibold text-ink">
          Confirm your bet
        </h2>

        {mode === "demo" && (
          <p className="mt-2 inline-block rounded bg-demo/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-demo">
            DEMO — no real money moves
          </p>
        )}

        <p className="mt-3 text-sm leading-snug text-ink [overflow-wrap:anywhere]">{draft.market.question}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-dim">Outcome</dt>
            <dd data-testid="confirm-outcome" className="font-medium text-ink">
              {draft.outcome.label}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-dim">Amount</dt>
            <dd data-testid="confirm-amount" className="font-figure tabular-nums text-ink">
              {formatUsdPrecise(draft.amountUsd)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-dim">Price</dt>
            <dd data-testid="confirm-price" className="font-figure tabular-nums text-ink">
              {formatPercent(draft.outcome.price)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-line pt-2">
            <dt className="text-dim">Estimated payout</dt>
            <dd data-testid="confirm-payout" className="font-figure tabular-nums font-semibold text-up">
              {formatUsdPrecise(payout)}
            </dd>
          </div>
        </dl>

        {marketClosed && (
          <p role="alert" className="mt-3 rounded-control bg-down/10 px-3 py-2 text-xs text-down">
            This market has closed since you opened this. No bet can be placed on it.
          </p>
        )}
        {moved && !marketClosed && (
          <p role="alert" className="mt-3 rounded-control bg-demo/10 px-3 py-2 text-xs text-demo">
            The price has moved to {formatPercent(livePrice!)} since you reviewed this.
            Nothing was placed — look again before confirming.
          </p>
        )}

        <p className="mt-3 text-xs text-dim">
          Estimates use the current price and may move before the order fills.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-control border border-line-strong px-3 text-sm text-ink hover:bg-white/5"
          >
            Cancel
          </button>
          {blocked ? (
            <button
              type="button"
              onClick={onReview ?? onCancel}
              className="min-h-11 flex-1 rounded-control border border-line-strong px-3 text-sm font-semibold text-ink hover:bg-white/5"
            >
              {marketClosed ? "Close" : "Review again"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className="min-h-11 flex-1 rounded-control bg-up px-3 text-sm font-semibold text-on-up disabled:opacity-60"
            >
              {pending ? "Placing…" : "Place bet"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
