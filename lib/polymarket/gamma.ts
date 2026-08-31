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

/** Raised when Gamma returns a market we cannot trust enough to show or bet on. */
export class GammaPayloadError extends Error {}

type Raw = Record<string, unknown>;

/** Gamma encodes these three fields as JSON *strings*, not arrays. */
function decodeStringArray(value: unknown, field: string): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== "string") {
    throw new GammaPayloadError(`${field}: expected a JSON-encoded array, got ${typeof value}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new GammaPayloadError(`${field}: not valid JSON`);
  }
  if (!Array.isArray(parsed)) {
    throw new GammaPayloadError(`${field}: JSON did not decode to an array`);
  }
  return parsed.map(String);
}

/** Gamma returns most numbers as strings; missing values become null. */
function num(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function normalizeMarket(raw: unknown): Market {
  if (!raw || typeof raw !== "object") {
    throw new GammaPayloadError("market: expected an object");
  }
  const r = raw as Raw;

  const labels = decodeStringArray(r.outcomes, "outcomes");
  const prices = decodeStringArray(r.outcomePrices, "outcomePrices");
  const tokenIds = decodeStringArray(r.clobTokenIds, "clobTokenIds");

  if (labels.length !== prices.length || labels.length !== tokenIds.length) {
    throw new GammaPayloadError(
      `outcome arrays disagree in length: ${labels.length}/${prices.length}/${tokenIds.length}`,
    );
  }

  const outcomes: Outcome[] = labels.map((label, i) => {
    const price = num(prices[i]);
    if (price === null) {
      throw new GammaPayloadError(`outcomePrices[${i}]: not a number`);
    }
    return { label, price, tokenId: tokenIds[i] };
  });

  return {
    id: String(r.id ?? ""),
    question: String(r.question ?? ""),
    slug: String(r.slug ?? ""),
    outcomes,
    volume: num(r.volume) ?? 0,
    volume24hr: num(r.volume24hr) ?? 0,
    liquidity: num(r.liquidity) ?? 0,
    endDate: r.endDate ? String(r.endDate) : null,
    bestBid: num(r.bestBid),
    bestAsk: num(r.bestAsk),
    active: Boolean(r.active),
    closed: Boolean(r.closed),
    restricted: Boolean(r.restricted),
  };
}

async function getJson(url: URL): Promise<unknown> {
  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`Gamma request failed: ${res.status} ${url.pathname}`);
  }
  return res.json();
}

/** Drop markets Gamma returns in a shape we can't trust, rather than failing the page. */
function normalizeAll(rows: unknown[]): Market[] {
  const out: Market[] = [];
  for (const row of rows) {
    try {
      out.push(normalizeMarket(row));
    } catch {
      // A single malformed market must not blank the whole list.
    }
  }
  return out;
}

export async function fetchMarkets(opts: {
  limit?: number;
  cursor?: string | null;
  tagId?: string;
  /** Gamma order field; defaults to the shipped 24h-volume ordering (004 / UX-2). */
  order?: string;
  ascending?: boolean;
} = {}): Promise<MarketPage> {
  const url = new URL(`${GAMMA_BASE}/markets/keyset`);
  url.searchParams.set("closed", "false");
  url.searchParams.set("order", opts.order ?? "volume24hr");
  url.searchParams.set("ascending", String(opts.ascending ?? false));
  url.searchParams.set("limit", String(opts.limit ?? 20));
  if (opts.cursor) url.searchParams.set("after_cursor", opts.cursor);
  if (opts.tagId) url.searchParams.set("tag_id", opts.tagId);

  const body = (await getJson(url)) as Raw;
  // Live keyset responses key the array as `markets` (verified 2026-08-31).
  const rows = Array.isArray(body.markets) ? body.markets : [];
  const next = body.next_cursor;
  return {
    markets: normalizeAll(rows),
    nextCursor: next === null || next === undefined || next === "" ? null : String(next),
  };
}

export async function searchMarkets(query: string, limit = 20): Promise<Market[]> {
  const url = new URL(`${GAMMA_BASE}/public-search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit_per_type", String(limit));

  const body = (await getJson(url)) as Raw;
  // public-search returns { events, pagination } — markets are nested inside each
  // event, with no top-level markets array (verified 2026-08-31).
  const fromEvents = Array.isArray(body.events)
    ? (body.events as Raw[]).flatMap((e) => (Array.isArray(e.markets) ? e.markets : []))
    : [];
  const direct = Array.isArray(body.markets) ? body.markets : [];
  return normalizeAll([...fromEvents, ...direct]).filter((m) => !m.closed);
}

/**
 * One market by id. The keyset list cannot answer "is this market closed?" —
 * it is query-scoped and sends `closed=false`, so absence from it conflates
 * "filtered out" with "closed". This endpoint carries the authoritative flag
 * (verified 2026-08-31; see the polymarket-api skill).
 *
 * Returns null when the market does not exist; throws when upstream fails, so a
 * caller can tell "gone" from "unreachable" and keep its last good data.
 */
export async function fetchMarketById(id: string): Promise<Market | null> {
  const url = new URL(`${GAMMA_BASE}/markets/${encodeURIComponent(id)}`);

  const res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Gamma request failed: ${res.status} ${url.pathname}`);
  }

  const body = (await res.json()) as unknown;
  const raw = Array.isArray(body) ? body[0] : body;
  if (!raw) return null;

  try {
    return normalizeMarket(raw);
  } catch {
    // A market we cannot trust is not a market we should price a bet from.
    return null;
  }
}
