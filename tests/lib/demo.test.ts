import { describe, expect, it, vi } from "vitest";
import {
  DEMO_STARTING_BALANCE,
  InsufficientDemoBalanceError,
  createDemoState,
  placeDemoBet,
} from "@/lib/demo";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const outcome = market.outcomes[0]; // listed price 0.09
const draft = { market, outcome, amountUsd: 90 };

describe("demo account", () => {
  it("starts with a $1,000 practice balance and no positions", () => {
    const s = createDemoState();
    expect(s.balanceUsd).toBe(DEMO_STARTING_BALANCE);
    expect(s.balanceUsd).toBe(1000);
    expect(s.positions).toEqual([]);
  });

  it("debits the stake and records a position", () => {
    const s = placeDemoBet(createDemoState(), { draft, fillPrice: 0.09 });
    expect(s.balanceUsd).toBe(910);
    expect(s.positions).toHaveLength(1);
    expect(s.positions[0]).toMatchObject({
      marketId: market.id,
      outcomeLabel: outcome.label,
      costUsd: 90,
      priceAtFill: 0.09,
    });
  });

  it("fills at the live price passed in, not the stale listed price", () => {
    // Listed price is 0.09, but the book has moved to 0.18 by the time we fill.
    const s = placeDemoBet(createDemoState(), { draft, fillPrice: 0.18 });
    expect(s.positions[0].priceAtFill).toBe(0.18);
    expect(s.positions[0].shares).toBeCloseTo(500, 2); // 90 / 0.18, not 90 / 0.09
  });

  it("accumulates positions across bets", () => {
    let s = createDemoState();
    s = placeDemoBet(s, { draft, fillPrice: 0.09 });
    s = placeDemoBet(s, { draft: { ...draft, amountUsd: 10 }, fillPrice: 0.5 });
    expect(s.positions).toHaveLength(2);
    expect(s.balanceUsd).toBe(900);
  });

  it("refuses a stake larger than the practice balance", () => {
    expect(() =>
      placeDemoBet(createDemoState(), { draft: { ...draft, amountUsd: 1001 }, fillPrice: 0.5 }),
    ).toThrow(InsufficientDemoBalanceError);
  });

  it("allows spending the balance exactly to zero", () => {
    const s = placeDemoBet(createDemoState(), {
      draft: { ...draft, amountUsd: DEMO_STARTING_BALANCE },
      fillPrice: 0.5,
    });
    expect(s.balanceUsd).toBe(0);
  });

  it("rejects a non-positive stake", () => {
    expect(() => placeDemoBet(createDemoState(), { draft: { ...draft, amountUsd: 0 }, fillPrice: 0.5 })).toThrow();
    expect(() => placeDemoBet(createDemoState(), { draft: { ...draft, amountUsd: -5 }, fillPrice: 0.5 })).toThrow();
  });

  it("rejects an unusable fill price instead of producing infinite shares", () => {
    expect(() => placeDemoBet(createDemoState(), { draft, fillPrice: 0 })).toThrow();
    expect(() => placeDemoBet(createDemoState(), { draft, fillPrice: 1.4 })).toThrow();
  });

  it("never mutates the state it is given", () => {
    const before = createDemoState();
    const snapshot = structuredClone(before);
    placeDemoBet(before, { draft, fillPrice: 0.09 });
    expect(before).toEqual(snapshot);
  });

  it("gives every position a distinct id", () => {
    let s = createDemoState();
    s = placeDemoBet(s, { draft, fillPrice: 0.09 });
    s = placeDemoBet(s, { draft, fillPrice: 0.09 });
    expect(new Set(s.positions.map((p) => p.id)).size).toBe(2);
  });

  it("persists nothing — the practice balance is per session and resets on reload", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem");
    let s = createDemoState();
    s = placeDemoBet(s, { draft, fillPrice: 0.09 });
    expect(setItem).not.toHaveBeenCalled();
    // A fresh session starts clean.
    expect(createDemoState().balanceUsd).toBe(DEMO_STARTING_BALANCE);
    setItem.mockRestore();
  });
});
