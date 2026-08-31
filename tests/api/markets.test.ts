import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/polymarket/gamma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/gamma")>();
  // Keep the real normalizer; stub only the network calls.
  return { ...actual, fetchMarkets: vi.fn(), searchMarkets: vi.fn() };
});

import { fetchMarkets, normalizeMarket, searchMarkets } from "@/lib/polymarket/gamma";
import { CACHE_TTL_MS, GET, resetMarketCache } from "@/app/api/markets/route";
import fixture from "../fixtures/gamma-keyset.json";

const markets = fixture.markets.map(normalizeMarket);
const page = { markets, nextCursor: "CURSOR2" };

function call(url = "http://localhost/api/markets") {
  return GET(new Request(url));
}

beforeEach(() => {
  vi.useFakeTimers();
  resetMarketCache();
  vi.mocked(fetchMarkets).mockResolvedValue(page);
  vi.mocked(searchMarkets).mockResolvedValue(markets);
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("GET /api/markets", () => {
  it("returns normalized markets and the next cursor", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.markets).toHaveLength(2);
    expect(body.markets[0].outcomes[0].label).toBe("Thiago Agustin Tirante");
    expect(body.nextCursor).toBe("CURSOR2");
  });

  it("serves a second identical request from cache within the TTL", async () => {
    await call();
    await call();
    expect(fetchMarkets).toHaveBeenCalledTimes(1);
  });

  it("refetches once the TTL has elapsed", async () => {
    await call();
    vi.advanceTimersByTime(CACHE_TTL_MS + 1);
    await call();
    expect(fetchMarkets).toHaveBeenCalledTimes(2);
  });

  it("caches per query, so a different search is not served another query's results", async () => {
    await call("http://localhost/api/markets?q=bitcoin");
    await call("http://localhost/api/markets?q=ethereum");
    expect(searchMarkets).toHaveBeenCalledTimes(2);
  });

  it("routes a q parameter to search", async () => {
    await call("http://localhost/api/markets?q=bitcoin");
    expect(searchMarkets).toHaveBeenCalledWith("bitcoin", expect.any(Number));
    expect(fetchMarkets).not.toHaveBeenCalled();
  });

  it("forwards tag and cursor to the keyset fetch", async () => {
    await call("http://localhost/api/markets?tag=politics&cursor=ABC&limit=7");
    expect(fetchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ tagId: "politics", cursor: "ABC", limit: 7 }),
    );
  });

  it("degrades to the last good page when upstream rate-limits", async () => {
    await call();
    vi.advanceTimersByTime(CACHE_TTL_MS + 1);
    vi.mocked(fetchMarkets).mockRejectedValue(new Error("Gamma request failed: 429"));

    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.markets).toHaveLength(2);
    expect(body.stale).toBe(true);
  });

  it("returns 503 with a plain-language message when upstream fails and nothing is cached", async () => {
    vi.mocked(fetchMarkets).mockRejectedValue(new Error("Gamma request failed: 429"));
    const res = await call();
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/unavailable|try again/i);
  });

  it("never leaks upstream internals to the client", async () => {
    vi.mocked(fetchMarkets).mockRejectedValue(
      new Error("Gamma request failed: 429 https://gamma-api.polymarket.com/markets/keyset"),
    );
    const body = await (await call()).json();
    expect(JSON.stringify(body)).not.toContain("gamma-api.polymarket.com");
    expect(JSON.stringify(body)).not.toContain("keyset");
  });
});

describe("GET /api/markets — sort (004 / UX-2)", () => {
  it("passes the resolved order to Gamma", async () => {
    await call("http://localhost/api/markets?sort=ending-soon");
    expect(fetchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ order: "endDate", ascending: true }),
    );
  });

  it("falls back to the default order for an unknown sort id", async () => {
    // The id comes from the query string; it must be resolved through the
    // whitelist rather than forwarded upstream.
    await call("http://localhost/api/markets?sort=../../etc/passwd");
    expect(fetchMarkets).toHaveBeenCalledWith(
      expect.objectContaining({ order: "volume24hr", ascending: false }),
    );
  });

  it("keys the cache on sort, so two sorts never serve each other's page", async () => {
    await call("http://localhost/api/markets?sort=hot");
    await call("http://localhost/api/markets?sort=ending-soon");
    expect(fetchMarkets).toHaveBeenCalledTimes(2);
  });

  it("ignores sort while searching — /public-search cannot order", async () => {
    await call("http://localhost/api/markets?q=fed&sort=ending-soon");
    expect(searchMarkets).toHaveBeenCalled();
    expect(fetchMarkets).not.toHaveBeenCalled();
  });
})
