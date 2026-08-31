/**
 * GET /api/quotes — what demo positions are worth (004 / UX-4).
 *
 * The price must come from the ORDER BOOK, not the market list. Demo bets fill
 * at fetchPrice(tokenId, "buy"); valuing that cost against Gamma's
 * outcomePrices would show a gain or loss the instant a bet is placed, caused
 * by nothing but the two sources disagreeing.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/polymarket/gamma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/gamma")>();
  return { ...actual, fetchMarketById: vi.fn() };
});
vi.mock("@/lib/polymarket/clob", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/clob")>();
  return { ...actual, fetchPrice: vi.fn() };
});

import { fetchMarketById, normalizeMarket } from "@/lib/polymarket/gamma";
import { fetchPrice } from "@/lib/polymarket/clob";
import { GET, MAX_QUOTED, resetQuoteCache, QUOTE_TTL_MS } from "@/app/api/quotes/route";
import fixture from "../fixtures/gamma-keyset.json";

const [marketA] = fixture.markets.map(normalizeMarket);
const tokenA = marketA.outcomes[0].tokenId;
const tokenB = marketA.outcomes[1].tokenId;

function call(qs: string) {
  return GET(new Request(`http://localhost/api/quotes?${qs}`));
}

beforeEach(() => {
  vi.useFakeTimers();
  resetQuoteCache();
  vi.mocked(fetchMarketById).mockResolvedValue(marketA);
  vi.mocked(fetchPrice).mockResolvedValue(0.42);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/quotes", () => {
  it("quotes several positions in one call", async () => {
    const res = await call(`markets=${marketA.id}&tokens=${tokenA},${tokenB}`);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.quotes[marketA.id].prices[tokenA]).toBe(0.42);
    expect(body.quotes[marketA.id].prices[tokenB]).toBe(0.42);
  });

  it("prices from the order book, not the market list", async () => {
    // marketA's listed price is 0.09; the book says 0.42. The book wins.
    vi.mocked(fetchPrice).mockResolvedValue(0.42);
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();

    expect(fetchPrice).toHaveBeenCalledWith(tokenA, "buy");
    expect(body.quotes[marketA.id].prices[tokenA]).toBe(0.42);
    expect(body.quotes[marketA.id].prices[tokenA]).not.toBe(marketA.outcomes[0].price);
  });

  it("carries the authoritative closed flag per market", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue({ ...marketA, closed: true });
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();
    expect(body.quotes[marketA.id].closed).toBe(true);
  });

  it("stamps each quote with when it was taken", async () => {
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();
    expect(typeof body.quotes[marketA.id].at).toBe("number");
  });

  it("omits a market that no longer exists rather than failing", async () => {
    // Absent becomes "unvalued" downstream — never a loss.
    vi.mocked(fetchMarketById).mockResolvedValue(null);
    const res = await call(`markets=gone&tokens=${tokenA}`);
    expect(res.status).toBe(200);
    expect((await res.json()).quotes.gone).toBeUndefined();
  });

  it("keeps the other quotes when one book request fails", async () => {
    vi.mocked(fetchPrice).mockImplementation(async (id: string) => {
      if (id === tokenA) throw new Error("book unavailable");
      return 0.6;
    });
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA},${tokenB}`)).json();

    expect(body.quotes[marketA.id].prices[tokenA]).toBeUndefined();
    expect(body.quotes[marketA.id].prices[tokenB]).toBe(0.6);
  });

  it("caps how many markets one call may ask for", async () => {
    const many = Array.from({ length: MAX_QUOTED + 15 }, (_, i) => `m${i}`).join(",");
    await call(`markets=${many}&tokens=${tokenA}`);
    expect(vi.mocked(fetchMarketById).mock.calls.length).toBeLessThanOrEqual(MAX_QUOTED);
  });

  it("serves an identical request from cache within the TTL", async () => {
    await call(`markets=${marketA.id}&tokens=${tokenA}`);
    await call(`markets=${marketA.id}&tokens=${tokenA}`);
    expect(fetchMarketById).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has elapsed", async () => {
    await call(`markets=${marketA.id}&tokens=${tokenA}`);
    vi.advanceTimersByTime(QUOTE_TTL_MS + 1);
    await call(`markets=${marketA.id}&tokens=${tokenA}`);
    expect(fetchMarketById).toHaveBeenCalledTimes(2);
  });

  it("returns an empty map for no ids rather than an error", async () => {
    const res = await call("");
    expect(res.status).toBe(200);
    expect((await res.json()).quotes).toEqual({});
    expect(fetchMarketById).not.toHaveBeenCalled();
  });
});

describe("closed markets are priced from Gamma, not the book (audit round 2)", () => {
  it("settles from the market payload when the book no longer exists", async () => {
    // Verified live: /price on a resolved market's token answers
    // "No orderbook exists for the requested token id". A book-only design
    // makes every settled position unpriceable — won and lost unreachable.
    vi.mocked(fetchMarketById).mockResolvedValue({ ...marketA, closed: true });
    vi.mocked(fetchPrice).mockRejectedValue(new Error("No orderbook exists"));

    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();

    expect(body.quotes[marketA.id].closed).toBe(true);
    expect(body.quotes[marketA.id].prices[tokenA]).toBe(marketA.outcomes[0].price);
  });

  it("returns every outcome of a closed market, not only the ones asked about", async () => {
    // "A different outcome won" is undecidable from the tokens a holder sends.
    vi.mocked(fetchMarketById).mockResolvedValue({ ...marketA, closed: true });
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();

    expect(Object.keys(body.quotes[marketA.id].prices).sort()).toEqual(
      marketA.outcomes.map((o) => o.tokenId).sort(),
    );
  });

  it("still prices an OPEN market from the book", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue(marketA);
    vi.mocked(fetchPrice).mockResolvedValue(0.42);
    const body = await (await call(`markets=${marketA.id}&tokens=${tokenA}`)).json();
    expect(body.quotes[marketA.id].prices[tokenA]).toBe(0.42);
  });
})
