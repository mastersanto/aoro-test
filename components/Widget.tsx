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
import { SelectedMarketCard } from "@/components/SelectedMarketCard";
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
  const [suggestions, setSuggestions] = useState<GroundedSuggestion[] | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState<string | null>(null);
  const [withheldReason, setWithheldReason] = useState<string | null>(null);
  const recRequest = useRef(0);
  const [recAt, setRecAt] = useState(0);
  const [now, setNow] = useState(0);
  const railRef = useRef<HTMLDivElement>(null);
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [marketStale, setMarketStale] = useState(false);

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
            reason: "We could not determine your region, so real betting is off. Demo mode still works.",
          });
        }
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, []);

  // US-2 (real betting) was withdrawn by the project owner on 2026-08-31, so this
  // is permanently false. The region and per-market checks in the predicate below
  // still run, and still run first.
  const REAL_BETTING_BUILT = false;

  const availability = realBettingAvailability({
    geo,
    marketRestricted: Boolean(market?.restricted),
    realBettingBuilt: REAL_BETTING_BUILT,
  });
  const geoBlocked = geo !== null && !geo.bettingAllowed;
  const marketClosed = Boolean(market?.closed);

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

    // 005 / DR-2 replaces the bottom sheet. The rail is first in document order,
    // so at narrow width it is above the list the selection came from; bringing
    // it into view is what the sheet used to do by overlaying instead.
    if (next) {
      requestAnimationFrame(() => {
        // Optional-called: jsdom implements no layout and so no scrollIntoView.
        railRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
      });
    }
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

  // Built once and mounted in exactly one place (Art. II, 005 / DR-1).
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

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
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
          <p className="rounded bg-demo/15 px-2 py-1 text-xs font-semibold text-demo">
            DEMO · practice {formatUsdPrecise(demo.balanceUsd)}
          </p>
        )}

        {geoBlocked && (
          // Carried here, beside the control that chooses real money, rather
          // than only inside the bet panel: AR-7 can demote that panel, and
          // AR-5 requires this explanation not to move with it (001 US-5,
          // 002 VR-3).
          <p role="status" className="max-w-prose text-xs text-muted">
            {/* 006 / LE-1 — the REASON is rendered, not summarised away. A first
                attempt put it in a title attribute, which hides compliance
                information from every touch user; the length was cut at source
                instead (lib/geo.ts). Region, refusal and demo alternative all
                stay on screen (Art. V, 001 US-5, 003 AR-5). */}
            Real betting unavailable{geo?.country ? ` in ${geo.country}` : ""} — {geo?.reason}
          </p>
        )}
      </div>


      {/* 005 / DR-2 — the rail comes FIRST in document order, so the phone
          ordering falls out of the markup rather than needing a second
          presentation. At lg it sits on the left. */}
      <div className="grid gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:gap-6">
        <div ref={railRef} data-testid="rail" className="flex min-w-0 scroll-mt-4 flex-col gap-4">
          {/* One fixed order. No application state reorders these (DR-1). */}
          <SelectedMarketCard market={market} onClear={() => selectMarket(null)} />

          {/* Order is fixed (DR-1); presence is not. With nothing selected the
              card above already says to pick one, and a second card repeating it
              pushed the first market row below the fold at 390px. */}
          {market && betPanel}

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

          {market && marketStale && (
            <p
              role="status"
              data-testid="market-stale"
              className="rounded-control border border-line-strong bg-white/5 px-3 py-2 text-xs text-muted"
            >
              This market&rsquo;s price could not be refreshed just now, so the figures
              above may be a little behind. It keeps trying every 30 seconds.
            </p>
          )}

          <DemoPositions {...valuePositions(demo.positions, quotes, now)} />
        </div>

        {/* min-w-0: grid items default to min-width:auto, so the textarea's
            intrinsic width blew the single-column grid past 390px and scrolled
            the whole document sideways. */}
        <div className="flex min-w-0 flex-col gap-4">
          {/* 005 / DR-4 — the finder lives where finding happens. */}
          <AssistPanel
            onUseSuggestion={handleUseSuggestion}
            suggestions={suggestions}
            onSuggestions={setSuggestions}
          />

          <MarketList
            selectedId={market?.id ?? null}
            onSelect={(m) => selectMarket(m)}
          />
        </div>
      </div>
    </div>
  );
}
