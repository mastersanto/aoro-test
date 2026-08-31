import { afterEach, describe, expect, it, vi } from "vitest";
import { GAMMA_BASE, fetchMarketById } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", spy);
  return spy;
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchMarketById", () => {
  it("asks the by-id endpoint, not the keyset list", async () => {
    const spy = mockFetch(fixture.markets[0]);
    await fetchMarketById("3945923");
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${GAMMA_BASE}/markets/3945923`);
    // The list cannot answer this question: it is query-scoped and closed=false.
    expect(url.searchParams.get("closed")).toBeNull();
  });

  it("normalizes the market the same way the list does", async () => {
    mockFetch(fixture.markets[0]);
    const m = await fetchMarketById("3945923");
    expect(m?.outcomes[0].label).toBe("Thiago Agustin Tirante");
    expect(m?.outcomes[0].price).toBeCloseTo(0.09);
  });

  it("returns a closed market rather than hiding it — closure is the point", async () => {
    mockFetch({ ...fixture.markets[0], closed: true });
    expect((await fetchMarketById("3945923"))?.closed).toBe(true);
  });

  it("returns null for a market that does not exist", async () => {
    mockFetch({ error: "not found" }, false, 404);
    expect(await fetchMarketById("nope")).toBeNull();
  });

  it("throws on an upstream error, so a caller can keep the last good data", async () => {
    mockFetch({}, false, 500);
    await expect(fetchMarketById("3945923")).rejects.toThrow();
  });

  it("tolerates the endpoint returning a single-element array", async () => {
    mockFetch([fixture.markets[0]]);
    expect((await fetchMarketById("3945923"))?.id).toBe("3945923");
  });
});
