/**
 * Proportional outcome bar geometry (VR-1).
 *
 * Binding under Art. VII, not styling: the widths are derived from price, and a
 * mis-scaled bar misstates the odds while every numeral on screen stays correct.
 */
import type { Outcome } from "@/lib/polymarket/gamma";

export type Segment = { tokenId: string; label: string; percent: number };

export function barSegments(_outcomes: readonly Outcome[]): Segment[] {
  return undefined as unknown as Segment[];
}
