/**
 * Pagination state machine for the market list (004 / UX-1).
 * Pure: no fetching, no React. The list holds the result.
 */
import type { Market } from "@/lib/polymarket/gamma";

/**
 * Add the next page after what is already loaded.
 *
 * Keyset pagination orders by a mutable field (24h volume by default), so a
 * market whose volume moves between two requests can legitimately be returned
 * on both pages. Without de-duplication that renders the same row twice, and
 * React warns about the duplicate key.
 *
 * The copy already on screen wins: replacing it would make rows change price at
 * the moment "Load more" is pressed, which reads as the list shuffling.
 */
export function appendPage(existing: Market[], incoming: Market[]): Market[] {
  const seen = new Set(existing.map((m) => m.id));
  const out = [...existing];
  for (const m of incoming) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}

/**
 * Fold a refresh of the first page into the loaded list.
 *
 * The interval refresh only ever fetches page 1. Replacing the list with it —
 * which is what the list did before 004 — would truncate every later page every
 * 30 seconds, so a reader who pressed "Load more" would silently lose it.
 *
 * Order is the order already on screen. A market that overtakes another on
 * volume between refreshes must not jump rows under the reader's cursor;
 * re-ordering happens when the reader asks for it, by changing the sort.
 */
export function mergeRefresh(existing: Market[], fresh: Market[]): Market[] {
  if (fresh.length === 0) return existing;

  const byId = new Map(fresh.map((m) => [m.id, m]));
  const out = existing.map((m) => byId.get(m.id) ?? m);

  const known = new Set(existing.map((m) => m.id));
  for (const m of fresh) {
    if (!known.has(m.id)) out.push(m);
  }
  return out;
}
