/**
 * Demo (practice) account state — US-3.
 * Pure state machine: no network, no storage. Balance lives in memory only, so
 * it resets on reload and introduces no server-side user state (spec out-of-scope).
 */
import type { BetDraft } from "@/lib/bet";

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
};

export type DemoState = { balanceUsd: number; positions: DemoPosition[] };

export class InsufficientDemoBalanceError extends Error {}

export function createDemoState(): DemoState {
  return undefined as unknown as DemoState;
}

export function placeDemoBet(
  _state: DemoState,
  _args: { draft: BetDraft; fillPrice: number },
): DemoState {
  return undefined as unknown as DemoState;
}
