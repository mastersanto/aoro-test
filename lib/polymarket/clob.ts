/**
 * CLOB read-only price access. These endpoints need no authentication
 * (verified 2026-08-31; see .claude/skills/polymarket-api/SKILL.md).
 *
 * Deliberately plain fetch rather than @polymarket/client: these are three
 * unauthenticated GETs, and the SDK's value is order construction and signing,
 * which arrives in Phase 6. Pulling a v0.x SDK and its eight transitive
 * dependencies in for read-only prices would violate Art. VI's smallest-
 * dependency-set rule. plan.md records this deviation.
 */

export const CLOB_BASE = "https://clob.polymarket.com";

export type BookLevel = { price: number; size: number };
export type Book = { bids: BookLevel[]; asks: BookLevel[] };

export class ClobRequestError extends Error {}

async function getJson(url: URL): Promise<Record<string, unknown>> {
  let res: { ok: boolean; status: number; json: () => Promise<unknown> };
  try {
    res = await fetch(url.toString(), { headers: { accept: "application/json" } });
  } catch (cause) {
    throw new ClobRequestError(`CLOB request failed: ${url.pathname}`, { cause });
  }
  if (!res.ok) {
    throw new ClobRequestError(`CLOB request failed: ${res.status} ${url.pathname}`);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** The CLOB returns numbers as strings; a bad one must not become NaN downstream. */
function requireNumber(value: unknown, field: string): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) {
    throw new ClobRequestError(`${field}: expected a number, got ${JSON.stringify(value)}`);
  }
  return n;
}

function optionalNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Best price for one outcome token. Buy side is what a bettor pays. */
export async function fetchPrice(tokenId: string, side: "buy" | "sell" = "buy"): Promise<number> {
  const url = new URL(`${CLOB_BASE}/price`);
  url.searchParams.set("token_id", tokenId);
  url.searchParams.set("side", side);
  const body = await getJson(url);
  return requireNumber(body.price, "price");
}

export async function fetchMidpoint(tokenId: string): Promise<number> {
  const url = new URL(`${CLOB_BASE}/midpoint`);
  url.searchParams.set("token_id", tokenId);
  const body = await getJson(url);
  return requireNumber(body.mid, "mid");
}

function levels(raw: unknown): BookLevel[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((l) => {
    const level = l as Record<string, unknown>;
    return { price: optionalNumber(level.price), size: optionalNumber(level.size) };
  });
}

export async function fetchBook(tokenId: string): Promise<Book> {
  const url = new URL(`${CLOB_BASE}/book`);
  url.searchParams.set("token_id", tokenId);
  const body = await getJson(url);
  return { bids: levels(body.bids), asks: levels(body.asks) };
}
