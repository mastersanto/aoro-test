"use client";

import { useEffect, useState } from "react";
import type { BetDraft, BetMode } from "@/lib/bet";
import type { Market, Outcome } from "@/lib/polymarket/gamma";
import type { GroundedSuggestion } from "@/lib/ai/grounding";
import { createDemoState, placeDemoBet } from "@/lib/demo";
import type { GeoDecision } from "@/lib/geo";
import { realBettingAvailability } from "@/lib/betting-availability";
import { fetchPrice } from "@/lib/polymarket/clob";
import { AssistPanel } from "@/components/AssistPanel";
import { BetPanel } from "@/components/BetPanel";
import { DemoPositions } from "@/components/DemoPositions";
import { MarketList } from "@/components/MarketList";
import { formatUsdPrecise } from "@/lib/format";

export function Widget() {
  const [mode, setMode] = useState<BetMode>("demo");
  const [market, setMarket] = useState<Market | null>(null);
  const [preselected, setPreselected] = useState<Outcome | null>(null);
  const [demo, setDemo] = useState(createDemoState);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoDecision | null>(null);

  // Ask the server whether real betting may be offered here (US-5). The effect
  // only subscribes; state is set in the async continuation.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/geo");
        const decision: GeoDecision = await res.json();
        if (!cancelled) setGeo(decision);
      } catch {
        // Unknown region fails closed, same as the server's own default.
        if (!cancelled) {
          setGeo({
            country: null,
            bettingAllowed: false,
            reason: "We could not determine your region, so real betting is turned off. Demo mode is available.",
          });
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // Phase 6 (T23-T27) flips this to true once the wallet and CLOB signing land.
  // Everything else in the predicate keeps applying without further changes.
  const WALLET_READY = false;

  const availability = realBettingAvailability({
    geo,
    marketRestricted: Boolean(market?.restricted),
    walletReady: WALLET_READY,
  });
  const geoBlocked = geo !== null && !geo.bettingAllowed;

  /**
   * Article II: using a suggestion only fills in the form. It selects the market
   * and outcome and stops — it opens no confirmation and places nothing.
   */
  function handleUseSuggestion(s: GroundedSuggestion) {
    setMarket(s.market);
    setPreselected(s.outcome);
    setNotice(null);
    setError(null);
  }

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

        {geoBlocked && (
          <p role="status" className="text-xs text-neutral-600 dark:text-neutral-300">
            Real betting unavailable{geo?.country ? ` in ${geo.country}` : ""} — browsing, AI
            assistance and demo mode remain available.
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
        <MarketList
          selectedId={market?.id ?? null}
          onSelect={(m) => {
            setMarket(m);
            setPreselected(null);
          }}
        />

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <AssistPanel onUseSuggestion={handleUseSuggestion} />

          <BetPanel
            key={preselected?.tokenId ?? market?.id ?? "none"}
            market={market}
            initialOutcome={preselected}
            mode={mode}
            onPlace={handlePlace}
            bettingDisabled={mode === "real" && !availability.allowed}
            disabledReason={mode === "real" ? availability.reason : undefined}
            balanceUsd={mode === "demo" ? demo.balanceUsd : undefined}
          />
          <DemoPositions positions={demo.positions} />
        </div>
      </div>
    </div>
  );
}
