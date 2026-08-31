/**
 * GET /api/markets — server-side proxy for Gamma market discovery (US-1).
 * Proxied rather than called from the browser so there is one data path, one
 * normalization point, and a short cache against undocumented rate limits.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Cache lifetime for a market page. Rate limits are undocumented; stay polite. */
export const CACHE_TTL_MS = 30_000;

/** Test seam: drop all cached entries. */
export function resetMarketCache(): void {}

export async function GET(_request: Request) {
  return NextResponse.json({ markets: [], nextCursor: null, stale: false });
}
