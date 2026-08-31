/**
 * GET /api/markets — server-side proxy for Gamma market discovery (US-1).
 * Proxied rather than called from the browser so there is one data path, one
 * normalization point, and a short cache against undocumented rate limits.
 */
import { NextResponse } from "next/server";
import { fetchMarkets, searchMarkets, type Market } from "@/lib/polymarket/gamma";
import { resolveSort } from "@/lib/market-sort";

export const dynamic = "force-dynamic";

/** Cache lifetime for a market page. Rate limits are undocumented; stay polite. */
export const CACHE_TTL_MS = 30_000;

/** Upper bound on how long a stale page may still be served during an outage. */
const STALE_MAX_MS = 10 * 60_000;

type Payload = { markets: Market[]; nextCursor: string | null };
type Entry = { payload: Payload; at: number };

// Process-local cache. No user data lives here — only public market pages —
// so it holds no server-side user state (spec out-of-scope).
const cache = new Map<string, Entry>();

/** Test seam: drop all cached entries. */
export function resetMarketCache(): void {
  cache.clear();
}

/**
 * Search and browse paginate differently upstream — a page number and a keyset
 * cursor. The client holds one opaque `nextCursor` either way; translating is
 * this route's job, so the list needs no branch of its own (004 / UX-1).
 */
async function searchPage(query: string, limit: number, cursor?: string): Promise<Payload> {
  const parsed = Number(cursor);
  const page = Number.isInteger(parsed) && parsed > 1 ? parsed : 1;

  const { markets, hasMore } = await searchMarkets(query, limit, page);
  return { markets, nextCursor: hasMore ? String(page + 1) : null };
}

function clampLimit(raw: string | null): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.min(Math.max(Math.trunc(n), 1), 50);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const tagId = searchParams.get("tag") ?? undefined;
  const cursor = searchParams.get("cursor") ?? undefined;
  const limit = clampLimit(searchParams.get("limit"));
  // Resolved through the whitelist: an unknown id becomes the default rather
  // than reaching Gamma's query string (004 / UX-2).
  const sort = resolveSort(searchParams.get("sort"));

  const key = JSON.stringify({ query, tagId, cursor, limit, sort: sort.id });
  const hit = cache.get(key);
  const now = Date.now();

  if (hit && now - hit.at < CACHE_TTL_MS) {
    return NextResponse.json({ ...hit.payload, stale: false });
  }

  try {
    const payload: Payload = query
      ? await searchPage(query, limit, cursor)
      : await fetchMarkets({
          limit,
          cursor,
          tagId,
          order: sort.order,
          ascending: sort.ascending,
        });

    cache.set(key, { payload, at: now });
    return NextResponse.json({ ...payload, stale: false });
  } catch {
    // Upstream is unhappy (rate limit, outage). Prefer slightly old truth over
    // an empty screen, but never serve something indefinitely old.
    if (hit && now - hit.at < STALE_MAX_MS) {
      return NextResponse.json({ ...hit.payload, stale: true });
    }
    // Deliberately generic: upstream hosts and paths are not the client's business.
    return NextResponse.json(
      { error: "Market data is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    );
  }
}
