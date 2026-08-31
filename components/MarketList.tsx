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
          className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:border-white/15 dark:bg-neutral-900"
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            aria-pressed={categoryId === null}
            className={`rounded-full border px-3 py-1 text-xs transition ${
              categoryId === null
                ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                : "border-black/15 text-neutral-600 hover:border-neutral-400 dark:border-white/20 dark:text-neutral-300"
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
              className={`rounded-full border px-3 py-1 text-xs transition ${
                c.id === categoryId
                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                  : "border-black/15 text-neutral-600 hover:border-neutral-400 dark:border-white/20 dark:text-neutral-300"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {stale && !error && (
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          Showing recently cached prices — the exchange is briefly unavailable.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      )}

      {loading && markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">Loading markets…</p>
      ) : markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          No open markets match that search.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
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
