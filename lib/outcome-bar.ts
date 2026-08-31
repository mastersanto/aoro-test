/**
 * Proportional outcome bar geometry (VR-1).
 *
 * Binding under Art. VII, not styling: the widths are derived from price, and a
 * mis-scaled bar misstates the odds while every numeral on screen stays correct.
 */
import type { Outcome } from "@/lib/polymarket/gamma";

export type Segment = { tokenId: string; label: string; percent: number };

export function barSegments(outcomes: readonly Outcome[]): Segment[] {
  if (outcomes.length === 0) return [];

  // A price can be absent, zero or (defensively) negative; none of those may
  // produce a NaN width or an inverted segment.
  const weights = outcomes.map((o) =>
    Number.isFinite(o.price) && o.price > 0 ? o.price : 0,
  );
  const total = weights.reduce((n, w) => n + w, 0);

  // Books drift and prices need not sum to 1, so normalize rather than trusting
  // them. With no usable price at all, split the bar evenly instead of vanishing.
  const percents =
    total > 0
      ? weights.map((w) => (w / total) * 100)
      : outcomes.map(() => 100 / outcomes.length);

  return outcomes.map((o, i) => ({
    tokenId: o.tokenId,
    label: o.label,
    percent: percents[i],
  }));
}
