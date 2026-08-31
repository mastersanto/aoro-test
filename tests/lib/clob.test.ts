import { afterEach, describe, expect, it, vi } from "vitest";
import { CLOB_BASE, ClobRequestError, fetchBook, fetchMidpoint, fetchPrice } from "@/lib/polymarket/clob";

const TOKEN = "32338220190071351435772801779725302244575775216413325951443";

function mockFetch(body: unknown, ok = true, status = 200) {
  const spy = vi.fn().mockResolvedValue({ ok, status, json: async () => body });
  vi.stubGlobal("fetch", spy);
  return spy;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("fetchPrice", () => {
  it("asks the CLOB for the buy-side price of a token", async () => {
    const spy = mockFetch({ price: "0.044" });
    await fetchPrice(TOKEN, "buy");
    const url = new URL(spy.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe(`${CLOB_BASE}/price`);
    expect(url.searchParams.get("token_id")).toBe(TOKEN);
    expect(url.searchParams.get("side")).toBe("buy");
  });

  it("defaults to the buy side, which is what a bettor pays", async () => {
    const spy = mockFetch({ price: "0.044" });
    await fetchPrice(TOKEN);
    expect(new URL(spy.mock.calls[0][0] as string).searchParams.get("side")).toBe("buy");
  });

  it("converts the string price the API returns into a number", async () => {
    mockFetch({ price: "0.044" });
    const price = await fetchPrice(TOKEN);
    expect(price).toBeCloseTo(0.044);
    expect(typeof price).toBe("number");
  });

  it("throws when the upstream response is not ok", async () => {
    mockFetch({ error: "nope" }, false, 500);
    await expect(fetchPrice(TOKEN)).rejects.toThrow(ClobRequestError);
  });

  it("throws when the payload has no usable price rather than returning NaN", async () => {
    mockFetch({ price: "not-a-number" });
    await expect(fetchPrice(TOKEN)).rejects.toThrow(ClobRequestError);
  });
});

describe("fetchMidpoint", () => {
  it("reads the mid field the API returns", async () => {
    const spy = mockFetch({ mid: "0.0445" });
    const mid = await fetchMidpoint(TOKEN);
    expect(new URL(spy.mock.calls[0][0] as string).pathname).toBe("/midpoint");
    expect(mid).toBeCloseTo(0.0445);
  });
});

describe("fetchBook", () => {
  it("normalizes bids and asks into numeric levels", async () => {
    mockFetch({
      bids: [{ price: "0.04", size: "1200" }],
      asks: [{ price: "0.05", size: "800" }],
    });
    const book = await fetchBook(TOKEN);
    expect(book.bids[0]).toEqual({ price: 0.04, size: 1200 });
    expect(book.asks[0]).toEqual({ price: 0.05, size: 800 });
  });

  it("tolerates an empty book without throwing", async () => {
    mockFetch({});
    const book = await fetchBook(TOKEN);
    expect(book).toEqual({ bids: [], asks: [] });
  });
});
