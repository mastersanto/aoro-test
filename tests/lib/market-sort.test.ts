import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SORT_OPTIONS, DEFAULT_SORT, resolveSort } from "@/lib/market-sort";
import { fetchMarkets } from "@/lib/polymarket/gamma";

describe("SORT_OPTIONS (UX-2)", () => {
  it("offers at least 24h volume, ending soonest and total volume", () => {
    const ids = SORT_OPTIONS.map((o) => o.id);
    expect(ids).toContain("hot");
    expect(ids).toContain("ending-soon");
    expect(ids).toContain("volume");
  });

  it("defaults to 24h volume descending — the shipped behaviour", () => {
    expect(DEFAULT_SORT.order).toBe("volume24hr");
    expect(DEFAULT_SORT.ascending).toBe(false);
  });

  it("orders soonest-to-end ascending, not descending", () => {
    // Descending would show the markets ending furthest away, which is the
    // opposite of what the label promises.
    const ending = SORT_OPTIONS.find((o) => o.id === "ending-soon")!;
    expect(ending.order).toBe("endDate");
    expect(ending.ascending).toBe(true);
  });

  it("gives every option a distinct id and a human label", () => {
    const ids = SORT_OPTIONS.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const o of SORT_OPTIONS) expect(o.label.trim().length).toBeGreaterThan(0);
  });

  it("does not offer startDate — it returned unusable values from Gamma", () => {
    expect(SORT_OPTIONS.some((o) => o.order === "startDate")).toBe(false);
  });
});

describe("resolveSort", () => {
  it("resolves a known id", () => {
    expect(resolveSort("ending-soon").order).toBe("endDate");
  });

  it("falls back to the default for an unknown id", () => {
    // User input must never reach the upstream query string directly.
    expect(resolveSort("'; DROP TABLE markets--")).toBe(DEFAULT_SORT);
    expect(resolveSort("volume24hr")).toBe(DEFAULT_SORT);
  });

  it("falls back for null and undefined", () => {
    expect(resolveSort(null)).toBe(DEFAULT_SORT);
    expect(resolveSort(undefined)).toBe(DEFAULT_SORT);
  });
});

describe("fetchMarkets sends the chosen order (UX-2)", () => {
  const calls: string[] = [];

  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ markets: [], next_cursor: null }) };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to 24h volume descending when no order is given", async () => {
    await fetchMarkets({});
    expect(calls[0]).toContain("order=volume24hr");
    expect(calls[0]).toContain("ascending=false");
  });

  it("sends the requested order and direction", async () => {
    await fetchMarkets({ order: "endDate", ascending: true });
    expect(calls[0]).toContain("order=endDate");
    expect(calls[0]).toContain("ascending=true");
  });
});

describe("orders that Gamma actually sorts numerically (004 audit round 2)", () => {
  it("does not offer `volume` or `liquidity` — Gamma sorts them as strings", async () => {
    // Verified live 2026-08-31: order=volume returns 99.99, 999.84, 9.99 —
    // lexicographic. The control would look right and return garbage, which is
    // the same defect that excluded `startDate`.
    for (const o of SORT_OPTIONS) {
      expect(o.order).not.toBe("volume");
      expect(o.order).not.toBe("liquidity");
    }
  });

  it("uses the numeric aliases instead", () => {
    const total = SORT_OPTIONS.find((o) => o.id === "volume")!;
    expect(total.order).toBe("volumeNum");
  });
});

describe("ending-soonest excludes markets that already ended", () => {
  const calls: string[] = [];
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string) => {
      calls.push(String(url));
      return { ok: true, status: 200, json: async () => ({ markets: [], next_cursor: null }) };
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends an end-date floor when ordering by end date", async () => {
    // Verified live: closed=false with order=endDate returns markets that ended
    // in October 2025, still flagged open. "Ending soonest" would be a wall of
    // dead markets.
    await fetchMarkets({ order: "endDate", ascending: true, endingAfter: "2026-08-31T00:00:00Z" });
    expect(calls[0]).toContain("end_date_min=");
  });

  it("sends no floor for other orderings", async () => {
    await fetchMarkets({ order: "volume24hr", ascending: false });
    expect(calls[0]).not.toContain("end_date_min=");
  });
});
