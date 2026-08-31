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
export class InvalidAmountError extends Error {}

/** Money is shown to the user, so never carry more precision than cents. */
function toCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function estimatePayout(amountUsd: number, price: number): PayoutEstimate {
  if (!Number.isFinite(price) || price <= 0 || price > 1) {
    // p<=0 divides by zero; p>1 would imply a payout below the stake.
    throw new InvalidPriceError(`price must be within (0, 1], got ${price}`);
  }
  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    throw new InvalidAmountError(`amount must be a non-negative number, got ${amountUsd}`);
  }
  if (amountUsd === 0) {
    return { shares: 0, payout: 0, profit: 0 };
  }

  const shares = toCents(amountUsd / price);
  const payout = toCents(shares); // each share settles at $1
  return { shares, payout, profit: toCents(payout - amountUsd) };
}
