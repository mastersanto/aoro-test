/**
 * GET /api/quotes — current prices for the markets a user holds demo positions
 * in (004 / UX-4).
 *
 * Exists because neither existing refresh covers these: `003`'s is keyed on the
 * SELECTED market, and the list's is query-scoped. A position in a market the
 * user has scrolled past is covered by neither.
 *
 * TWO SOURCES, each where it is the only correct one:
 *
 *  - An OPEN market is priced from the order book, which is where demo bets
 *    fill (`Widget.tsx`, `fetchPrice(tokenId, "buy")`). Quoting Gamma's listed
 *    price instead would show a gain or loss the instant a bet was placed,
 *    produced by nothing but the two sources disagreeing.
 *  - A CLOSED market is priced from Gamma. The order book does not survive
 *    resolution — `/price` answers "No orderbook exists for the requested
 *    token id" (verified 2026-08-31), so a book-only design cannot settle
 *    anything and every finished position would read as unpriceable. Gamma is
 *    also the source the ["0","0"] observation is about, and it returns EVERY
 *    outcome, which is what makes "a different outcome won" decidable at all:
 *    the client only knows the tokens it holds.
 *
 * The closed flag itself comes from Gamma's by-id endpoint, which is
 * authoritative — absence from a query-scoped list conflates "filtered out"
 * with "closed".
 */
import { NextResponse } from "next/server";
import { fetchMarketById } from "@/lib/polymarket/gamma";
import { fetchPrice } from "@/lib/polymarket/clob";

export const dynamic = "force-dynamic";

/** One session's demo positions are typically fewer than five; this is a ceiling. */
export const MAX_QUOTED = 20;

/** Same cadence as every other refresh, so the figures never disagree for long. */
export const QUOTE_TTL_MS = 30_000;

type Quote = { closed: boolean; at: number; prices: Record<string, number> };
type Payload = { quotes: Record<string, Quote> };

// Process-local, public market data only — no user state (001 out-of-scope).
const cache = new Map<string, { payload: Payload; at: number }>();

/** Test seam. */
export function resetQuoteCache(): void {
  cache.clear();
}

function ids(raw: string | null): string[] {
  if (!raw) return [];
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX_QUOTED);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const markets = ids(searchParams.get("markets"));
  const tokens = ids(searchParams.get("tokens"));

  if (markets.length === 0) return NextResponse.json({ quotes: {} });

  const key = JSON.stringify({ markets, tokens });
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && now - hit.at < QUOTE_TTL_MS) {
    return NextResponse.json(hit.payload);
  }

  // One failed quote must not cost the others: a position that cannot be priced
  // is reported as unvalued downstream, which is very different from an error
  // page where a whole panel of positions used to be.
  const [marketResults, priceResults] = await Promise.all([
    Promise.all(markets.map((id) => fetchMarketById(id).catch(() => null))),
    // Books are fetched for every requested token; the closed ones simply go
    // unused rather than costing a round trip that always 404s.
    Promise.all(
      tokens.map(async (id) => {
        try {
          return [id, await fetchPrice(id, "buy")] as const;
        } catch {
          return [id, null] as const;
        }
      }),
    ),
  ]);

  const priced = new Map(priceResults.filter(([, p]) => typeof p === "number"));

  const quotes: Record<string, Quote> = {};
  marketResults.forEach((market, i) => {
    // A market that no longer exists is simply absent. Downstream that is
    // "unvalued" — never a loss.
    if (!market) return;

    const prices: Record<string, number> = {};
    if (market.closed) {
      // Settlement, from the only source that still has it — and for every
      // outcome, not just the ones the holder asked about.
      for (const outcome of market.outcomes) prices[outcome.tokenId] = outcome.price;
    } else {
      for (const outcome of market.outcomes) {
        const p = priced.get(outcome.tokenId);
        if (typeof p === "number") prices[outcome.tokenId] = p;
      }
    }
    quotes[markets[i]] = { closed: market.closed, at: now, prices };
  });

  const payload: Payload = { quotes };
  cache.set(key, { payload, at: now });
  return NextResponse.json(payload);
}
