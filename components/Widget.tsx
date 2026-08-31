"use client";

import { useState } from "react";
import type { BetDraft, BetMode } from "@/lib/bet";
import type { Market } from "@/lib/polymarket/gamma";
import { createDemoState, placeDemoBet } from "@/lib/demo";
import { fetchPrice } from "@/lib/polymarket/clob";
import { BetPanel } from "@/components/BetPanel";
import { DemoPositions } from "@/components/DemoPositions";
import { MarketList } from "@/components/MarketList";
import { formatUsdPrecise } from "@/lib/format";

export function Widget() {
  const [mode, setMode] = useState<BetMode>("demo");
  const [market, setMarket] = useState<Market | null>(null);
  const [demo, setDemo] = useState(createDemoState);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Real betting arrives in Phase 6 (wallet + CLOB order signing). Until then the
  // control is visible but explicitly unavailable rather than silently broken.
  const realUnavailableReason =
    "Real betting is not enabled in this build yet. Demo mode runs the same flow with a practice balance.";

  async function handlePlace(draft: BetDraft) {
    setError(null);
    setNotice(null);

    if (mode !== "demo") return; // BetPanel is disabled in real mode; belt and braces.

    try {
      // Fill at the live book price, falling back to the listed price if the
      // CLOB is briefly unreachable.
      let fillPrice = draft.outcome.price;
      try {
        fillPrice = await fetchPrice(draft.outcome.tokenId, "buy");
      } catch {
        /* keep the listed price */
      }

      const next = placeDemoBet(demo, { draft, fillPrice });
      setDemo(next);
      setNotice(
        `DEMO bet placed: ${formatUsdPrecise(draft.amountUsd)} on "${draft.outcome.label}". No real money moved.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "That demo bet could not be placed.");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-md border border-black/15 p-0.5 dark:border-white/20" role="group" aria-label="Betting mode">
          {(["demo", "real"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`rounded px-3 py-1 text-xs font-medium transition ${
                mode === m
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              {m === "demo" ? "Demo" : "Real money"}
            </button>
          ))}
        </div>

        {mode === "demo" && (
          <p className="rounded bg-amber-100 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-900/50 dark:text-amber-100">
            DEMO — practice balance {formatUsdPrecise(demo.balanceUsd)}
          </p>
        )}
      </div>

      {notice && (
        <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MarketList selectedId={market?.id ?? null} onSelect={setMarket} />

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <BetPanel
            market={market}
            mode={mode}
            onPlace={handlePlace}
            bettingDisabled={mode === "real"}
            disabledReason={mode === "real" ? realUnavailableReason : undefined}
            balanceUsd={mode === "demo" ? demo.balanceUsd : undefined}
          />
          <DemoPositions positions={demo.positions} />
        </div>
      </div>
    </div>
  );
}
