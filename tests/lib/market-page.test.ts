import { describe, it, expect } from "vitest";
import { appendPage, mergeRefresh } from "@/lib/market-page";
import type { Market } from "@/lib/polymarket/gamma";

function market(id: string, price = 0.5, volume24hr = 100): Market {
  return {
    id,
    question: `Question ${id}?`,
    slug: `q-${id}`,
    outcomes: [
      { label: "Yes", price, tokenId: `${id}-yes` },
      { label: "No", price: 1 - price, tokenId: `${id}-no` },
    ],
    volume: 1000,
    volume24hr,
    liquidity: 500,
    endDate: "2026-12-31T00:00:00Z",
    bestBid: price - 0.01,
    bestAsk: price + 0.01,
    active: true,
    closed: false,
    restricted: false,
  };
}

describe("appendPage (UX-1)", () => {
  it("appends a second page after the first", () => {
    const out = appendPage([market("a"), market("b")], [market("c"), market("d")]);
    expect(out.map((m) => m.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("drops a market already loaded rather than rendering it twice", () => {
    // Keyset pagination orders by a mutable field, so a market whose volume
    // moves between requests can legitimately arrive on two consecutive pages.
    const out = appendPage([market("a"), market("b")], [market("b"), market("c")]);
    expect(out.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("keeps the copy already on screen when a duplicate arrives", () => {
    // Replacing it would make a row change price at the moment you press
    // "Load more", which reads as the list shuffling under you.
    const out = appendPage([market("a", 0.4)], [market("a", 0.9)]);
    expect(out).toHaveLength(1);
    expect(out[0].outcomes[0].price).toBe(0.4);
  });

  it("de-duplicates within the incoming page too", () => {
    const out = appendPage([], [market("a"), market("a"), market("b")]);
    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("returns the existing list unchanged for an empty page", () => {
    const existing = [market("a")];
    expect(appendPage(existing, []).map((m) => m.id)).toEqual(["a"]);
  });
});

describe("mergeRefresh (UX-1, plan constraint 2)", () => {
  it("updates a loaded market in place", () => {
    const out = mergeRefresh([market("a", 0.4), market("b", 0.6)], [market("a", 0.7)]);
    expect(out[0].outcomes[0].price).toBe(0.7);
  });

  it("keeps markets the refresh did not mention", () => {
    // The refresh only ever fetches page 1. Replacing wholesale would truncate
    // every page after the first, every 30 seconds.
    const out = mergeRefresh([market("a"), market("b"), market("c")], [market("a")]);
    expect(out.map((m) => m.id)).toEqual(["a", "b", "c"]);
  });

  it("preserves the order already on screen", () => {
    // A market that overtakes another on 24h volume must not jump rows under
    // the reader's cursor mid-refresh.
    const out = mergeRefresh(
      [market("a", 0.5, 100), market("b", 0.5, 90)],
      [market("b", 0.5, 999), market("a", 0.5, 100)],
    );
    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
  });

  it("appends a market the refresh newly introduces", () => {
    const out = mergeRefresh([market("a")], [market("a"), market("z")]);
    expect(out.map((m) => m.id)).toEqual(["a", "z"]);
  });

  it("leaves the loaded list alone when the refresh returns nothing", () => {
    const out = mergeRefresh([market("a"), market("b")], []);
    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
  });
});
