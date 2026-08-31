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
  /** True when the market has closed since it was selected. */
  marketClosed?: boolean;
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
  marketClosed = false,
  initialOutcome = null,
}: BetPanelProps) {
  const [outcome, setOutcome] = useState<Outcome | null>(initialOutcome);
  const [amount, setAmount] = useState("");
  const [draft, setDraft] = useState<BetDraft | null>(null);
  const [pending, setPending] = useState(false);

  const amountUsd = Number(amount);
  const amountValid = Number.isFinite(amountUsd) && amountUsd > 0;
  const withinBalance = balanceUsd === undefined || amountUsd <= balanceUsd;
  // A 0-priced outcome would make the payout estimate throw while the dialog
  // renders, so it can never become a reviewable draft.
  const priceUsable = outcome !== null && outcome.price > 0 && outcome.price <= 1;
  const canReview =
    Boolean(market) && priceUsable && amountValid && withinBalance && !bettingDisabled;

  /** The only place a draft is created. It opens the confirmation; it never places. */
  function review() {
    if (!market || !outcome || !canReview) return;
    setDraft({ market, outcome, amountUsd });
  }

  /** The only call site of onPlace in the entire component (Art. II). */
  async function confirm() {
    if (!draft || pending) return;
    // Re-check at the moment of placement: the draft may have been opened before
    // the region decision arrived or before the market/mode changed.
    if (bettingDisabled || marketClosed) {
      setDraft(null);
      return;
    }
    // The price may have moved since review; the dialog surfaces that and the
    // user must look again, so nothing is placed from a stale draft.
    const live = market?.outcomes.find((o) => o.tokenId === draft.outcome.tokenId)?.price;
    if (typeof live === "number" && Math.abs(live - draft.outcome.price) > 0.0001) return;
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
      <aside className="rounded-panel border border-line bg-panel p-4 text-sm text-dim">
        Choose a market to place a bet.
      </aside>
    );
  }

  return (
    <aside className="rounded-panel border border-line bg-panel p-4">
      <h2 className="text-sm font-semibold text-ink">
        {mode === "demo" ? "Place a demo bet" : "Place a bet"}
      </h2>
      {mode === "demo" && (
        <p className="mt-1 inline-block rounded bg-demo/15 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-demo">
          DEMO
        </p>
      )}

      <p className="mt-2 text-sm leading-snug text-ink [overflow-wrap:anywhere]">{market.question}</p>

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
              className={`min-h-11 rounded-control border px-3 text-sm transition disabled:opacity-50 ${
                outcome?.tokenId === o.tokenId
                  ? "border-up bg-up/15 text-up"
                  : "border-line-strong text-muted hover:border-white/35"
              }`}
            >
              {o.label} · {formatPercent(o.price)}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">
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
            className="min-h-11 rounded-control border border-line-strong bg-ground px-3 font-figure tabular-nums text-ink outline-none focus:border-up disabled:opacity-50"
          />
        </label>

        {bettingDisabled && disabledReason && (
          <p role="status" className="rounded-control bg-white/5 px-3 py-2 text-xs text-muted">
            {disabledReason}
          </p>
        )}
        {outcome !== null && !priceUsable && (
          <p role="status" className="text-xs text-down">
            This outcome has no usable price right now, so it cannot be bet on.
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
          className="min-h-11 rounded-control bg-up px-3 text-sm font-semibold text-on-up disabled:opacity-40"
        >
          Review bet
        </button>
      </form>

      {draft && (
        <ConfirmBetDialog
          draft={draft}
          mode={mode}
          pending={pending}
          livePrice={market.outcomes.find((o) => o.tokenId === draft.outcome.tokenId)?.price}
          marketClosed={marketClosed}
          onConfirm={confirm}
          onCancel={() => setDraft(null)}
          onReview={() => setDraft(null)}
        />
      )}
    </aside>
  );
}
