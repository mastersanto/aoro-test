/**
 * Market ordering (004 / UX-2).
 *
 * Ordering is a query the exchange performs, not a re-sort of the page already
 * loaded — sorting a subset would look correct and be wrong.
 *
 * Which orders are safe is not obvious and cost this feature an audit round.
 * Gamma sorts several numeric columns LEXICOGRAPHICALLY: `order=volume`
 * descending returns 99.99, then 999.84, then 9.99 (verified live
 * 2026-08-31), and `liquidity` behaves the same. Both look like they work.
 * The `…Num` aliases sort numerically and are what this uses. `startDate` is
 * excluded for the same reason.
 */

export type SortOption = {
  id: string;
  label: string;
  /** Gamma's `order` parameter. */
  order: string;
  ascending: boolean;
  /**
   * Exclude markets that have already ended.
   *
   * `closed=false` is not enough: ordering by end date ascending returns
   * markets dated October 2025 still flagged open (verified 2026-08-31), so
   * "Ending soonest" would open on a wall of dead markets.
   */
  requiresFutureEndDate?: boolean;
};

export const SORT_OPTIONS: readonly SortOption[] = [
  { id: "hot", label: "24h volume", order: "volume24hr", ascending: false },
  {
    id: "ending-soon",
    label: "Ending soonest",
    order: "endDate",
    ascending: true,
    requiresFutureEndDate: true,
  },
  { id: "volume", label: "Total volume", order: "volumeNum", ascending: false },
  { id: "liquidity", label: "Liquidity", order: "liquidityNum", ascending: false },
];

/** Today's behaviour, and the fallback for anything unrecognised. */
export const DEFAULT_SORT = SORT_OPTIONS[0];

export function resolveSort(id: string | null | undefined): SortOption {
  return SORT_OPTIONS.find((o) => o.id === id) ?? DEFAULT_SORT;
}
