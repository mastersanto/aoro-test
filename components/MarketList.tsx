"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Market } from "@/lib/polymarket/gamma";
import { CATEGORIES } from "@/lib/categories";
import { MarketCard } from "@/components/MarketCard";
import { appendPage, mergeRefresh } from "@/lib/market-page";
import { SORT_OPTIONS, DEFAULT_SORT } from "@/lib/market-sort";

const REFRESH_MS = 30_000;
const PAGE_SIZE = 24;

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
  const [sortId, setSortId] = useState(DEFAULT_SORT.id);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search results come back in relevance order and cannot be re-ordered:
  // /public-search ignores `order` (verified 2026-08-31). Sorting the page it
  // returned would sort a truncated subset and look right (004 / UX-2).
  const searching = debounced.length > 0;

  /**
   * What the loaded rows and cursor BELONG to.
   *
   * Holding the key alongside the data, and comparing it during render, is what
   * makes "a cursor never outlives its query" structural rather than a rule to
   * remember: a cursor from the previous query is not cleared by an effect that
   * might not have run yet — it is simply not the current query's cursor, so it
   * cannot be read (004 / UX-1).
   */
  const queryKey = JSON.stringify({
    q: debounced,
    tag: categoryId,
    sort: searching ? null : sortId,
  });
  const EMPTY = { key: queryKey, rows: [] as Market[], cursor: null as string | null };
  const [loaded, setLoaded] = useState(EMPTY);
  const current = loaded.key === queryKey ? loaded : EMPTY;
  const markets = current.rows;
  const cursor = current.cursor;

  // Don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  const requestId = useRef(0);

  function url(nextCursor: string | null): string {
    const params = new URLSearchParams({ limit: String(PAGE_SIZE) });
    if (debounced) params.set("q", debounced);
    if (categoryId) params.set("tag", categoryId);
    if (!searching) params.set("sort", sortId);
    if (nextCursor) params.set("cursor", nextCursor);
    return `/api/markets?${params}`;
  }

  /**
   * Load the first page for the current query.
   *
   * Runs on every query change and then on an interval. A refresh MERGES rather
   * than replaces: it only ever fetches page 1, so replacing would silently undo
   * "Load more" every 30 seconds (004 / UX-1).
   */
  const load = useCallback(async () => {
    const id = ++requestId.current;
    const key = queryKey;
    try {
      const res = await fetch(url(null));
      const body: Payload = await res.json();
      // A slower earlier request must not overwrite a newer result.
      if (id !== requestId.current) return;

      if (!res.ok) {
        setError(body.error ?? "Market data is temporarily unavailable.");
        return;
      }

      const incoming = body.markets ?? [];
      // Merge rather than replace: this only ever fetches page 1, so replacing
      // would silently undo "Load more" every 30 seconds. Against a different
      // query there is nothing to merge into, which the key comparison handles.
      setLoaded((prev) => {
        const same = prev.key === key && prev.rows.length > 0;
        return {
          key,
          rows: same ? mergeRefresh(prev.rows, incoming) : incoming,
          // This only ever fetches page 1, so its cursor points at page 2.
          // Overwriting an advanced cursor would make the next "Load more"
          // re-fetch a page already loaded, which appendPage dedupes to nothing
          // — the control would simply look dead.
          cursor: same ? prev.cursor : (body.nextCursor ?? null),
        };
      });
      setStale(Boolean(body.stale));
      setError(null);
    } catch {
      if (id === requestId.current) setError("Could not reach the server. Retrying shortly.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- url() reads these
  }, [queryKey]);

  // The effect only subscribes to timers; every state update happens in a timer
  // callback, never synchronously in the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    const fire = () => {
      void load();
    };
    const start = setTimeout(fire, 0);
    const repeat = setInterval(fire, REFRESH_MS);
    return () => {
      clearTimeout(start);
      clearInterval(repeat);
    };
  }, [load]);

  async function loadMore() {
    // One request at a time: three impatient presses must not fetch page 2 thrice.
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const key = queryKey;
    try {
      const res = await fetch(url(cursor));
      const body: Payload = await res.json();
      if (!res.ok) {
        // Keep every row already on screen — a failed "load more" must not cost
        // the reader the page they had.
        setError(body.error ?? "Could not load more markets.");
        return;
      }
      setLoaded((prev) => {
        // The query changed while this was in flight: this page answers a
        // question nobody is asking any more.
        if (prev.key !== key) return prev;
        return {
          key,
          rows: appendPage(prev.rows, body.markets ?? []),
          cursor: body.nextCursor ?? null,
        };
      });
      setError(null);
    } catch {
      setError("Could not load more markets.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <section aria-label="Markets" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search markets — e.g. bitcoin, election, fed"
            aria-label="Search markets"
            className="min-h-11 min-w-0 flex-1 rounded-control border border-line-strong bg-panel px-3 text-sm text-ink outline-none placeholder:text-dim focus:border-up"
          />
          <label className="flex items-center gap-2 text-xs text-muted">
            <span className="whitespace-nowrap">Sort</span>
            <select
              value={sortId}
              onChange={(e) => setSortId(e.target.value)}
              disabled={searching}
              aria-label="Sort markets"
              className="min-h-11 rounded-control border border-line-strong bg-panel px-2 text-xs text-ink outline-none focus:border-up disabled:opacity-50"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {searching && (
          <p className="text-xs text-dim">
            Search returns best matches, so sorting does not apply. Clear the search to sort.
          </p>
        )}

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
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-control bg-down/10 px-3 py-2 text-xs text-down">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 rounded-control border border-down/40 px-3 text-xs font-medium text-down hover:bg-down/10"
          >
            Try again
          </button>
          {/* It already retries by itself; a reader who cannot see that is being
              asked to guess whether pressing anything is required (004 / UX-5). */}
          <span className="text-muted">It also retries on its own every 30 seconds.</span>
        </div>
      )}

      {loading && markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-dim">Loading markets…</p>
      ) : markets.length === 0 ? (
        <p className="py-8 text-center text-sm text-dim">
          No open markets match that search.
        </p>
      ) : (
        <>
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

          {cursor && (
            <button
              type="button"
              onClick={() => void loadMore()}
              disabled={loadingMore}
              className="min-h-11 rounded-control border border-line-strong px-4 text-sm text-ink hover:bg-white/5 disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more markets"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
