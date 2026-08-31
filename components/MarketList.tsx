"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Market } from "@/lib/polymarket/gamma";
import { CATEGORIES } from "@/lib/categories";
import { MarketCard } from "@/components/MarketCard";

const REFRESH_MS = 30_000;

type Payload = { markets: Market[]; nextCursor: string | null; stale?: boolean; error?: string };

export function MarketList({
  selectedId,
  onSelect,
}: {
  selectedId?: string | null;
  onSelect?: (market: Market) => void;
} = {}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const requestId = useRef(0);

  const load = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const params = new URLSearchParams({ limit: "24" });
      if (debounced) params.set("q", debounced);
      if (categoryId) params.set("tag", categoryId);

      const res = await fetch(`/api/markets?${params}`);
      const body: Payload = await res.json();
      // A slower earlier request must not overwrite a newer result.
      if (id !== requestId.current) return;

      if (!res.ok) {
        setError(body.error ?? "Market data is temporarily unavailable.");
      } else {
        setMarkets(body.markets ?? []);
        setStale(Boolean(body.stale));
        setError(null);
      }
    } catch {
      if (id === requestId.current) setError("Could not reach the server. Retrying shortly.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [debounced, categoryId]);

  // Refresh on filter change and then on an interval — no page reload (US-1).
  // The effect only subscribes to timers; every state update happens in a timer
  // callback, never synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const fire = () => {
      void load();
    };
    const first = setTimeout(fire, 0);
    const repeat = setInterval(fire, REFRESH_MS);
    return () => {
      clearTimeout(first);
      clearInterval(repeat);
    };
  }, [load]);

  return (
    <section aria-label="Markets" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search markets — e.g. bitcoin, election, fed"
          aria-label="Search markets"
          className="min-h-11 w-full rounded-control border border-line-strong bg-panel px-3 text-sm text-ink outline-none placeholder:text-dim focus:border-up"
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            aria-pressed={categoryId === null}
            className={`min-h-11 rounded-full border px-4 text-xs transition ${
              categoryId === null
                ? "border-ink bg-ink text-ground"
                : "border-line-strong text-muted hover:border-white/35"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
              aria-pressed={c.id === categoryId}
              className={`min-h-11 rounded-full border px-4 text-xs transition ${
                c.id === categoryId
                  ? "border-ink bg-ink text-ground"
                  : "border-line-strong text-muted hover:border-white/35"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {stale && !error && (
        <p role="status" className="rounded-control border border-line-strong bg-white/5 px-3 py-2 text-xs text-muted">
          Showing recently cached prices — the exchange is briefly unavailable.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-control bg-down/10 px-3 py-2 text-xs text-down">
          {error}
        </p>
      )}

      {loading && markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-dim">Loading markets…</p>
      ) : markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-dim">
          No open markets match that search.
        </p>
      ) : (
        <div className="overflow-hidden rounded-panel border border-line bg-panel">
          {markets.map((m) => (
            <MarketCard
              key={m.id}
              market={m}
              selected={m.id === selectedId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}
