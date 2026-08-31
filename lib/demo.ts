/**
 * Demo (practice) account state — US-3.
 * Pure state machine: no network, no storage. Balance lives in memory only, so
 * it resets on reload and introduces no server-side user state (spec out-of-scope).
 */
import type { BetDraft } from "@/lib/bet";
import { estimatePayout } from "@/lib/payout";

export const DEMO_STARTING_BALANCE = 1000;

export type DemoPosition = {
  id: string;
  marketId: string;
  question: string;
  outcomeLabel: string;
  tokenId: string;
  shares: number;
  costUsd: number;
  priceAtFill: number;
  /**
   * Where `priceAtFill` came from. The widget falls back to the market list's
   * price when the order book is briefly unreachable, and a cost recorded that
   * way is not comparable with a value quoted from the book (004 / UX-4).
   */
  fillSource: "book" | "listed";
};

export type DemoState = { balanceUsd: number; positions: DemoPosition[] };

export class InsufficientDemoBalanceError extends Error {}

export function createDemoState(): DemoState {
  return { balanceUsd: DEMO_STARTING_BALANCE, positions: [] };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

let counter = 0;
function positionId(): string {
  counter += 1;
  return `demo-${Date.now().toString(36)}-${counter}`;
}

export function placeDemoBet(
  state: DemoState,
  {
    draft,
    fillPrice,
    fillSource = "book",
  }: { draft: BetDraft; fillPrice: number; fillSource?: "book" | "listed" },
): DemoState {
  // estimatePayout validates both the stake and the price, and is the same
  // helper the real flow uses — so demo cannot drift from real arithmetic.
  const { shares } = estimatePayout(draft.amountUsd, fillPrice);

  if (draft.amountUsd <= 0) {
    throw new Error("A demo bet needs a positive stake.");
  }
  if (draft.amountUsd > state.balanceUsd) {
    throw new InsufficientDemoBalanceError(
      `Stake ${draft.amountUsd} exceeds the practice balance ${state.balanceUsd}.`,
    );
  }

  const position: DemoPosition = {
    id: positionId(),
    marketId: draft.market.id,
    question: draft.market.question,
    outcomeLabel: draft.outcome.label,
    tokenId: draft.outcome.tokenId,
    shares,
    costUsd: round2(draft.amountUsd),
    priceAtFill: fillPrice,
    fillSource,
  };

  // New objects throughout: callers hold the previous state safely.
  return {
    balanceUsd: round2(state.balanceUsd - draft.amountUsd),
    positions: [...state.positions, position],
  };
}
