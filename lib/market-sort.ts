/**
 * Market ordering (004 / UX-2).
 *
 * Ordering is a query the exchange performs, not a re-sort of the page already
 * loaded — sorting a subset would look correct and be wrong. These are the
 * orders Gamma's keyset endpoint accepts, verified live 2026-08-31.
 * `startDate` is deliberately absent: it returned unusable values.
 */

export type SortOption = {
  id: string;
  label: string;
  /** Gamma's `order` parameter. */
  order: string;
  ascending: boolean;
};

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: "hot", label: "24h volume", order: "volume24hr", ascending: false },
  { id: "ending-soon", label: "Ending soonest", order: "endDate", ascending: true },
  { id: "volume", label: "Total volume", order: "volume", ascending: false },
  { id: "liquidity", label: "Liquidity", order: "liquidity", ascending: false },
];

/** Today's behaviour, and the fallback for anything unrecognised. */
export const DEFAULT_SORT = SORT_OPTIONS[0];

export function resolveSort(id: string | null | undefined): SortOption {
  return SORT_OPTIONS.find((o) => o.id === id) ?? DEFAULT_SORT;
}
