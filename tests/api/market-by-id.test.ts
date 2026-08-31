/**
 * AR-1 re-hydration (feature 003).
 *
 * The selected market must refresh from ITS OWN endpoint. The keyset list is a
 * query-scoped page of 24 fetched with closed=false, so a market's absence from
 * it means "filtered out or closed" and cannot distinguish the two — inferring
 * closure from absence would withdraw a valid recommendation and close the sheet
 * on a bettable market whenever the user typed in the search box.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/polymarket/gamma", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/polymarket/gamma")>();
  return { ...actual, fetchMarketById: vi.fn() };
});

import { fetchMarketById, normalizeMarket } from "@/lib/polymarket/gamma";
import { GET } from "@/app/api/market/[id]/route";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);

function call(id = market.id) {
  return GET(new Request(`http://localhost/api/market/${id}`), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  vi.mocked(fetchMarketById).mockResolvedValue(market);
});
afterEach(() => vi.clearAllMocks());

describe("GET /api/market/[id]", () => {
  it("returns the market fetched by its own id", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.market.id).toBe(market.id);
    expect(fetchMarketById).toHaveBeenCalledWith(market.id);
  });

  it("carries the closed flag, which is the only source of closure", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue({ ...market, closed: true });
    const body = await (await call()).json();
    expect(body.market.closed).toBe(true);
  });

  it("reports not-found distinctly, so a caller can tell it from an outage", async () => {
    vi.mocked(fetchMarketById).mockResolvedValue(null);
    expect((await call("no-such-market")).status).toBe(404);
  });

  it("degrades on an upstream failure without leaking internals", async () => {
    vi.mocked(fetchMarketById).mockRejectedValue(
      new Error("Gamma request failed: 500 https://gamma-api.polymarket.com/markets/1"),
    );
    const res = await call();
    expect(res.status).toBe(503);
    const body = JSON.stringify(await res.json());
    expect(body).not.toContain("gamma-api.polymarket.com");
  });

  it("rejects an unusable id rather than calling upstream", async () => {
    const res = await GET(new Request("http://localhost/api/market/"), {
      params: Promise.resolve({ id: "  " }),
    });
    expect(res.status).toBe(400);
    expect(fetchMarketById).not.toHaveBeenCalled();
  });
});
