"use client";

import type { BetDraft, BetMode } from "@/lib/bet";
import type { Market } from "@/lib/polymarket/gamma";

export type BetPanelProps = {
  market: Market | null;
  mode: BetMode;
  onPlace: (draft: BetDraft) => void | Promise<void>;
  bettingDisabled?: boolean;
  disabledReason?: string;
  balanceUsd?: number;
};

// T11 RED: implemented in T12.
export function BetPanel(_props: BetPanelProps) {
  return <div />;
}
