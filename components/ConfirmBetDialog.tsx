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
  onConfirm,
  onCancel,
}: {
  draft: BetDraft;
  mode: BetMode;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { payout } = estimatePayout(draft.amountUsd, draft.outcome.price);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="w-full max-w-md rounded-lg border border-black/10 bg-white p-5 shadow-xl dark:border-white/15 dark:bg-neutral-900"
      >
        <h2 id="confirm-title" className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          Confirm your bet
        </h2>

        {mode === "demo" && (
          <p className="mt-2 rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
            DEMO — no real money moves
          </p>
        )}

        <p className="mt-3 text-sm text-neutral-700 dark:text-neutral-200">{draft.market.question}</p>

        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Outcome</dt>
            <dd data-testid="confirm-outcome" className="font-medium text-neutral-900 dark:text-neutral-100">
              {draft.outcome.label}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Amount</dt>
            <dd data-testid="confirm-amount" className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatUsdPrecise(draft.amountUsd)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-neutral-500">Price</dt>
            <dd data-testid="confirm-price" className="font-mono tabular-nums text-neutral-900 dark:text-neutral-100">
              {formatPercent(draft.outcome.price)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-black/10 pt-2 dark:border-white/10">
            <dt className="text-neutral-500">Estimated payout</dt>
            <dd data-testid="confirm-payout" className="font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100">
              {formatUsdPrecise(payout)}
            </dd>
          </div>
        </dl>

        <p className="mt-3 text-xs text-neutral-500">
          Estimates use the current price and may move before the order fills.
        </p>

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-md border border-black/15 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:border-white/20 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-neutral-900"
          >
            {pending ? "Placing…" : "Place bet"}
          </button>
        </div>
      </div>
    </div>
  );
}
