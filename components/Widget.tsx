"use client";

import { useEffect, useRef, useState } from "react";
import type { BetDraft, BetMode } from "@/lib/bet";
import type { Market, Outcome } from "@/lib/polymarket/gamma";
import type { GroundedSuggestion } from "@/lib/ai/grounding";
import { createDemoState, placeDemoBet } from "@/lib/demo";
import type { GeoDecision } from "@/lib/geo";
import { realBettingAvailability } from "@/lib/betting-availability";

/** Same cadence as the market list, so the two never disagree for long. */
const MARKET_REFRESH_MS = 30_000;
import { fetchPrice } from "@/lib/polymarket/clob";
import { AssistPanel } from "@/components/AssistPanel";
import { BetPanel } from "@/components/BetPanel";
import { BetSheet, useIsNarrow } from "@/components/BetSheet";
import { RecommendPanel, type Recommendation } from "@/components/RecommendPanel";
import { freshness } from "@/lib/ai/recommendation";
import { DemoPositions } from "@/components/DemoPositions";
import { valuePositions, type Quote } from "@/lib/demo-valuation";
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
  const [sheetOpen, setSheetOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<GroundedSuggestion[] | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [withheldReason, setWithheldReason] = useState<string | null>(null);
  const recRequest = useRef(0);
  const [recAt, setRecAt] = useState(0);
  const [now, setNow] = useState(0);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [marketStale, setMarketStale] = useState(false);
  const narrow = useIsNarrow();

  // Keep the selected market's price current (003 / AR-1). The list is a
  // query-scoped page, so a market leaving it says nothing about closure —
  // this refreshes by id, and closure comes only from the market's own flag.
  const selectedId = market?.id ?? null;
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;

    const refresh = async () => {
      try {
        const res = await fetch(`/api/market/${encodeURIComponent(selectedId)}`);
        if (cancelled) return;
        if (!res.ok) {
          // Keep the last good data — but SAY SO. This price is what the
          // confirmation renders as Article II's price, so a frozen figure
          // presented as current is the most consequential silence in the app
          // (004 / UX-5).
          setMarketStale(true);
          return;
        }
        const body = (await res.json()) as { market?: Market };
        if (cancelled || !body.market || body.market.id !== selectedId) return;
        setMarket(body.market);
        setMarketStale(false);
      } catch {
        // Keep what we have rather than blanking a selection the user made.
        if (!cancelled) setMarketStale(true);
      }
    };

    const first = setTimeout(refresh, 0);
    const repeat = setInterval(refresh, MARKET_REFRESH_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [selectedId]);

  // Value the demo positions (004 / UX-4). Neither existing refresh covers
  // these: 003's is keyed on the SELECTED market and the list's is
  // query-scoped, so a position in a market the user scrolled past is quoted by
  // neither. Same 30-second cadence as everything else — not a second clock.
  const positionKey = demo.positions.map((p) => `${p.marketId}:${p.tokenId}`).join(",");
  useEffect(() => {
    if (!positionKey) return;
    let cancelled = false;

    const refresh = async () => {
      const pairs = positionKey.split(",").map((s) => s.split(":"));
      const params = new URLSearchParams({
        markets: [...new Set(pairs.map((p) => p[0]))].join(","),
        tokens: [...new Set(pairs.map((p) => p[1]))].join(","),
      });
      try {
        const res = await fetch(`/api/quotes?${params}`);
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { quotes?: Record<string, Quote> };
        if (!cancelled && body.quotes) {
          setQuotes(body.quotes);
          // Stamp the clock with the quotes so freshness is judged against when
          // they actually arrived, and never read in render (Date.now() there
          // is impure and re-renders unpredictably).
          setNow(Date.now());
        }
      } catch {
        // Keep the last quotes; demo-valuation ages them out on its own, so a
        // frozen number is reported as not valued rather than as current.
      }
    };

    const first = setTimeout(refresh, 0);
    const repeat = setInterval(refresh, MARKET_REFRESH_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [positionKey]);

  // The clock that ages quotes out. Without it a position whose quote went
  // stale would keep rendering its last value as "now".
  useEffect(() => {
    if (demo.positions.length === 0) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [demo.positions.length]);

  // A recommendation must age out even when nothing else changes on screen, so
  // expiry cannot depend on an incidental re-render.
  useEffect(() => {
    if (!recommendation) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [recommendation]);

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
  const marketClosed = Boolean(market?.closed);

  // AR-7: the bet entry leads only when it can actually be acted on. Every
  // reason counts — region, market restriction, an unbuilt wallet — not just
  // the regional one, since the shipped default is blocked on the wallet in
  // every permitted region.
  const betEntryActionable =
    market !== null && !marketClosed && (mode === "demo" || availability.allowed);

  // An argument is bound to the price it was made from (003 / AR-1). Decided
  // here against the live market, so the panel cannot render a stale case.
  const recState =
    recommendation && market
      ? freshness({
          arguedAtPrice: recommendation.arguedAtPrice,
          currentPrice: market.outcomes.find((o) => o.tokenId === recommendation.favouredTokenId)?.price,
          createdAt: recAt,
          now,
          marketClosed,
        })
      : "fresh";
  const withdrawnReason =
    recState === "fresh"
      ? null
      : recState === "closed"
        ? "This market has closed, so this view no longer applies."
        : recState === "expired"
          ? "This view is out of date — prices have moved on since it was written."
          : "The price has moved since this was written, so it no longer matches the market.";

  /**
   * Article II: using a suggestion only fills in the form. It selects the market
   * and outcome and stops — it opens no confirmation and places nothing.
   */
  /**
   * One place where the selection changes, so advice can never outlive the
   * market it was about (003 / AR-1). Bumping recRequest also strands any
   * response still in flight.
   */
  function selectMarket(next: Market | null, outcome: Outcome | null = null) {
    recRequest.current += 1;
    setMarketStale(false);
    setRecommendation(null);
    setWithheldReason(null);
    setRecError(null);
    setSuggestions(null); // advice about OTHER markets goes too
    setMarket(next);
    setPreselected(outcome);
    setSheetOpen(next !== null);
  }

  async function requestRecommendation() {
    if (!market || recLoading) return;
    const id = ++recRequest.current;
    const askedAbout = market.id;

    setRecLoading(true);
    setRecError(null);
    setWithheldReason(null);
    try {
      const res = await fetch("/api/recommend", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ marketId: askedAbout }),
      });
      const body = await res.json();
      // Never render against a market this was not asked about.
      if (id !== recRequest.current) return;

      if (!res.ok) setRecError(body.error ?? "AI assistance is briefly unavailable.");
      else if (body.withheld) setWithheldReason(body.reason ?? "No view to offer.");
      else {
        const at = Date.now();
        setRecommendation(body.recommendation ?? null);
        setRecAt(at);
        setNow(at);
      }
    } catch {
      if (id === recRequest.current) setRecError("Could not reach the server. Please try again.");
    } finally {
      if (id === recRequest.current) setRecLoading(false);
    }
  }

  function handleUseSuggestion(s: GroundedSuggestion) {
    selectMarket(s.market, s.outcome);
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
      let fillSource: "book" | "listed" = "book";
      try {
        fillPrice = await fetchPrice(draft.outcome.tokenId, "buy");
      } catch {
        // Keep the listed price, but RECORD that we did: a cost basis from one
        // source valued against another shows a difference that is the sources
        // disagreeing, not the market moving (004 / UX-4).
        fillSource = "listed";
      }

      const next = placeDemoBet(demo, { draft, fillPrice, fillSource });
      setDemo(next);
      setNotice(
        `DEMO bet placed: ${formatUsdPrecise(draft.amountUsd)} on "${draft.outcome.label}". No real money moved.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "That demo bet could not be placed.");
    }
  }

  // Built once and placed in exactly one of two containers, so there is never a
  // second bet-entry surface (Art. II).
  const betPanel = (
    <BetPanel
      // mode is part of the identity: a stake chosen against a practice
      // balance must never carry into real money (003 / AR-1).
      key={`${mode}:${preselected?.tokenId ?? market?.id ?? "none"}`}
      market={market}
      initialOutcome={preselected}
      mode={mode}
      onPlace={handlePlace}
      bettingDisabled={mode === "real" && !availability.allowed}
      disabledReason={
        mode === "real"
          ? geoBlocked
            ? "Real betting is unavailable in your region — the reason is shown above. Demo mode still works."
            : availability.reason
          : undefined
      }
      balanceUsd={mode === "demo" ? demo.balanceUsd : undefined}
      marketClosed={marketClosed}
    />
  );

  // Rendered in exactly one position, chosen by actionability — never twice.
  const betPanelSection = narrow ? null : betPanel;

  return (
    <div className="flex flex-col gap-6">
      {(notice || error) && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
          {notice && (
            <p
              role="status"
              className="pointer-events-auto max-w-md rounded-control border border-demo/40 bg-panel px-3 py-2 text-xs text-demo shadow-lg"
            >
              {notice}
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="pointer-events-auto max-w-md rounded-control border border-down/40 bg-panel px-3 py-2 text-xs text-down shadow-lg"
            >
              {error}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-control border border-line-strong p-0.5" role="group" aria-label="Betting mode">
          {(["demo", "real"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={`min-h-11 rounded px-4 text-xs font-medium transition ${
                mode === m
                  ? "bg-ink text-ground"
                  : "text-muted"
              }`}
            >
              {m === "demo" ? "Demo" : "Real money"}
            </button>
          ))}
        </div>

        {mode === "demo" && (
          <p className="rounded bg-demo/15 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-demo">
            DEMO — practice balance {formatUsdPrecise(demo.balanceUsd)}
          </p>
        )}

        {geoBlocked && (
          // Carried here, beside the control that chooses real money, rather
          // than only inside the bet panel: AR-7 can demote that panel, and
          // AR-5 requires this explanation not to move with it (001 US-5,
          // 002 VR-3).
          <p role="status" className="max-w-prose text-xs text-muted">
            Real betting unavailable{geo?.country ? ` in ${geo.country}` : ""} — {geo?.reason}{" "}
            Browsing, AI assistance and demo mode remain available.
          </p>
        )}
      </div>


      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <MarketList
          selectedId={market?.id ?? null}
          onSelect={(m) => selectMarket(m)}
        />

        <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          {betEntryActionable && betPanelSection}

          {market && marketStale && (
            <p
              role="status"
              data-testid="market-stale"
              className="rounded-control border border-line-strong bg-white/5 px-3 py-2 text-xs text-muted"
            >
              This market&rsquo;s price could not be refreshed just now, so the figures
              below may be a little behind. It keeps trying every 30 seconds.
            </p>
          )}

          {market && (
            <RecommendPanel
              market={market}
              recommendation={recommendation}
              loading={recLoading}
              error={recError}
              withheldReason={withheldReason}
              withdrawnReason={withdrawnReason}
              onRequest={requestRecommendation}
              onUse={(outcome) => setPreselected(outcome)}
            />
          )}

          {market && (
            <button
              type="button"
              onClick={() => selectMarket(null)}
              className="min-h-11 rounded-control border border-line-strong px-3 text-xs text-muted hover:bg-white/5"
            >
              Clear selection
            </button>
          )}

          <AssistPanel
            onUseSuggestion={handleUseSuggestion}
            suggestions={suggestions}
            onSuggestions={setSuggestions}
          />

          {!betEntryActionable && betPanelSection}

          <DemoPositions {...valuePositions(demo.positions, quotes, now)} />
        </div>
      </div>

      <BetSheet open={narrow && sheetOpen && market !== null} onDismiss={() => setSheetOpen(false)}>
        {betPanel}
      </BetSheet>
    </div>
  );
}
