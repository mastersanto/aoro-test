/** Presentation helpers. Pure functions — no side effects, no network. */

export function formatUsd(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

/** Outcome prices are 0..1 probabilities; show them the way the exchange does. */
export function formatPercent(price: number): string {
  if (!Number.isFinite(price)) return "—";
  return `${Math.round(price * 100)}%`;
}

export function formatEndDate(iso: string | null): string {
  if (!iso) return "No end date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No end date";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
