/**
 * Gamma API client — read-only Polymarket market discovery.
 * Facts verified 2026-08-31; see .claude/skills/polymarket-api/SKILL.md.
 * Keyset endpoints only: the offset /markets endpoint is past its documented sunset.
 */

export const GAMMA_BASE = "https://gamma-api.polymarket.com";

export type Outcome = { label: string; price: number; tokenId: string };

export type Market = {
  id: string;
  question: string;
  slug: string;
  outcomes: Outcome[];
  volume: number;
  volume24hr: number;
  liquidity: number;
  endDate: string | null;
  bestBid: number | null;
  bestAsk: number | null;
  active: boolean;
  closed: boolean;
  restricted: boolean;
};

export type MarketPage = { markets: Market[]; nextCursor: string | null };

export class GammaPayloadError extends Error {}

// --- T4 RED: stubs below are implemented in T5 ---

export function normalizeMarket(_raw: unknown): Market {
  return undefined as unknown as Market;
}

export async function fetchMarkets(_opts?: {
  limit?: number;
  cursor?: string | null;
  tagId?: string;
}): Promise<MarketPage> {
  return undefined as unknown as MarketPage;
}

export async function searchMarkets(_query: string, _limit?: number): Promise<Market[]> {
  return undefined as unknown as Market[];
}
