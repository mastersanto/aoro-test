/**
 * Payout math for outcome shares (US-2/US-3).
 * A share of a winning outcome settles at $1, so $A at price p buys A/p shares.
 * Pure functions — no network, no side effects.
 */

export type PayoutEstimate = {
  /** Outcome shares bought. */
  shares: number;
  /** Total returned if the outcome resolves YES (shares x $1). */
  payout: number;
  /** Payout minus what was staked. */
  profit: number;
};

export class InvalidPriceError extends Error {}

export function estimatePayout(_amountUsd: number, _price: number): PayoutEstimate {
  return undefined as unknown as PayoutEstimate;
}
