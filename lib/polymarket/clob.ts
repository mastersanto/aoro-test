/**
 * CLOB read-only price access (no auth required).
 * Verified 2026-08-31; see .claude/skills/polymarket-api/SKILL.md.
 */

export const CLOB_BASE = "https://clob.polymarket.com";

export type BookLevel = { price: number; size: number };
export type Book = { bids: BookLevel[]; asks: BookLevel[] };

export class ClobRequestError extends Error {}

export async function fetchPrice(_tokenId: string, _side?: "buy" | "sell"): Promise<number> {
  return undefined as unknown as number;
}

export async function fetchMidpoint(_tokenId: string): Promise<number> {
  return undefined as unknown as number;
}

export async function fetchBook(_tokenId: string): Promise<Book> {
  return undefined as unknown as Book;
}
