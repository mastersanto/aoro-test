/**
 * Top-level Polymarket categories, resolved from Gamma's /tags/slug/{slug}
 * endpoint on 2026-08-31. The generic /tags listing returns unordered
 * long-tail tags, so these ids are pinned rather than discovered at runtime.
 */
export type Category = { id: string; label: string };

export const CATEGORIES: Category[] = [
  { id: "2", label: "Politics" },
  { id: "21", label: "Crypto" },
  { id: "1", label: "Sports" },
  { id: "225", label: "Economics" },
  { id: "1401", label: "Tech" },
  { id: "101970", label: "World" },
];
