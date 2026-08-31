/**
 * Bet domain types shared by the panel, the confirmation, and the placement paths.
 * Constitution Art. II: a draft only becomes an order after explicit confirmation.
 */
import type { Market, Outcome } from "@/lib/polymarket/gamma";

export type BetMode = "real" | "demo";

export type BetDraft = {
  market: Market;
  outcome: Outcome;
  amountUsd: number;
};
