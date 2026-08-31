"use client";

import { useState } from "react";
import type { BetDraft, BetMode } from "@/lib/bet";
import type { Market, Outcome } from "@/lib/polymarket/gamma";
import { ConfirmBetDialog } from "@/components/ConfirmBetDialog";
import { formatPercent, formatUsdPrecise } from "@/lib/format";

export type BetPanelProps = {
  market: Market | null;
  mode: BetMode;
  onPlace: (draft: BetDraft) => void | Promise<void>;
  bettingDisabled?: boolean;
  disabledReason?: string;
  balanceUsd?: number;
  /** Pre-selects an outcome (used by AI assist). Never triggers placement. */
  initialOutcome?: Outcome | null;
};

export function BetPanel({
  market,
  mode,
  onPlace,
  bettingDisabled = false,
  disabledReason,
  balanceUsd,
  initialOutcome = null,
}: BetPanelProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome);
  const [amount, setAmount] = useState("");
  const [draft, setDraft] = useState<BetDraft | null>(null);
  const [pending, setPending] = useState(false);

  const amountUsd = Number(amount);
  const amountValid = Number.isFinite(amountUsd) && amountUsd > 0;
  const withinBalance = balanceUsd === undefined || amountUsd <= balanceUsd;
  const canReview =
    Boolean(market) && Boolean(outcome) && amountValid && withinBalance && !bettingDisabled;

  /** The only place a draft is created. It opens the confirmation; it never places. */
  function review() {
    if (!market || !outcome || !canReview) return;
    setDraft({ market, outcome, amountUsd });
  }

  /** The only call site of onPlace in the entire component (Art. II). */
  async function confirm() {
    if (!draft || pending) return;
    setPending(true);
    try {
      await onPlace(draft);
      setDraft(null);
      setAmount("");
    } finally {
      setPending(false);
    }
  }

  if (!market) {
    return (
      <aside className="rounded-lg border border-black/10 bg-white p-4 text-sm text-neutral-500 dark:border-white/15 dark:bg-neutral-900">
        Choose a market to place a bet.
      </aside>
    );
  }

  return (
    <aside className="rounded-lg border border-black/10 bg-white p-4 dark:border-white/15 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
        {mode === "demo" ? "Place a demo bet" : "Place a bet"}
      </h2>
      {mode === "demo" && (
        <p className="mt-1 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
          DEMO
        </p>
      )}

      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-200">{market.question}</p>

      <form
        onSubmit={(e) => {
          // Submitting reviews; it never places (Art. II bypass check).
          e.preventDefault();
          review();
        }}
        className="mt-3 flex flex-col gap-3"
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label="Choose an outcome">
          {market.outcomes.map((o) => (
            <button
              key={o.tokenId}
              type="button"
              onClick={() => setOutcome(o)}
              aria-pressed={outcome?.tokenId === o.tokenId}
              disabled={bettingDisabled}
              className={`rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                outcome?.tokenId === o.tokenId
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-black/15 text-neutral-700 hover:border-neutral-400 dark:border-white/20 dark:text-neutral-200"
              }`}
            >
              {o.label} · {formatPercent(o.price)}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-600 dark:text-neutral-300">
            Amount {balanceUsd !== undefined && `(balance ${formatUsdPrecise(balanceUsd)})`}
          </span>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={amount}
            disabled={bettingDisabled}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="rounded-md border border-black/15 px-3 py-2 outline-none focus:border-neutral-500 disabled:opacity-50 dark:border-white/20 dark:bg-neutral-900"
          />
        </label>

        {bettingDisabled && disabledReason && (
          <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            {disabledReason}
          </p>
        )}
        {amountValid && !withinBalance && (
          <p role="status" className="text-xs text-red-700 dark:text-red-300">
            That is more than your balance.
          </p>
        )}

        <button
          type="button"
          onClick={review}
          disabled={!canReview}
          className="rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-white dark:text-neutral-900"
        >
          Review bet
        </button>
      </form>

      {draft && (
        <ConfirmBetDialog
          draft={draft}
          mode={mode}
          pending={pending}
          onConfirm={confirm}
          onCancel={() => setDraft(null)}
        />
      )}
    </aside>
  );
}
