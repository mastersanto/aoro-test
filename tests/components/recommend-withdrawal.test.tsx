/**
 * AR-1 withdrawal WIRING (feature 003 T14) — distinct from the decision
 * function T3 tests. A component that computes "stale" and renders the argument
 * anyway passes every unit test and still shows advice about a price that no
 * longer exists.
 */
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { MAX_AGE_MS, PRICE_TOLERANCE } from "@/lib/ai/recommendation";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const favoured = market.outcomes[0]; // 0.09

const repriced = (p: number) => ({
  ...market,
  outcomes: market.outcomes.map((o, i) => (i === 0 ? { ...o, price: p } : o)),
});

const RECOMMENDATION = {
  resolvesOn: "Resolves on the published result.",
  priceImplies: "The price shows how the outcomes trade against each other.",
  caseFor: "It requires the stated terms to be met.",
  caseAgainst: "It fails if they are not.",
  favouredTokenId: favoured.tokenId,
  arguedAtPrice: favoured.price,
};

let byId = market;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  byId = market;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/recommend")) return { ok: true, status: 200, json: async () => ({ recommendation: RECOMMENDATION }) };
      if (u.includes("/api/market/")) return { ok: true, status: 200, json: async () => ({ market: byId }) };
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => ({ country: "BR", bettingAllowed: true }) };
      if (u.includes("/api/markets")) return { ok: true, status: 200, json: async () => ({ markets: [market], nextCursor: null, stale: false }) };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function recommend() {
  render(<Widget />);
  const heading = await screen.findByRole("heading", { name: /Tirante/i }, { timeout: 3000 });
  fireEvent.click(heading.closest('[role="button"]')!);
  fireEvent.click(await screen.findByRole("button", { name: /what would you favou?r/i }));
  await waitFor(() => expect(screen.getByTestId("recommendation")).toBeInTheDocument());
}

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

describe("a recommendation is withdrawn, not left to age", () => {
  it("stays while the price is within tolerance", async () => {
    await recommend();
    byId = repriced(favoured.price + PRICE_TOLERANCE);
    await advance(31_000);
    expect(screen.getByTestId("recommendation")).toBeInTheDocument();
    expect(screen.queryByText(/no longer matches|has moved/i)).not.toBeInTheDocument();
  });

  it("withdraws the argument when the price moves beyond tolerance, and says why", async () => {
    await recommend();
    byId = repriced(favoured.price + PRICE_TOLERANCE + 0.05);
    await advance(31_000);

    expect(screen.getByText(/price has moved|no longer matches/i)).toBeInTheDocument();
    // The argument itself must be gone, not merely annotated.
    expect(screen.queryByTestId("case-for")).not.toBeInTheDocument();
    // And it cannot be acted on.
    expect(screen.queryByRole("button", { name: /use this/i })).not.toBeInTheDocument();
  });

  it("withdraws when the market closes", async () => {
    await recommend();
    byId = { ...market, closed: true };
    await advance(31_000);

    // Scoped to the recommendation: since 005 the bet panel ALSO says the market
    // closed, which is correct and would make an unscoped match ambiguous.
    const panel = screen.getByLabelText(/outcome recommendation/i);
    expect(within(panel).getByText(/closed/i)).toBeInTheDocument();
    expect(screen.queryByTestId("case-for")).not.toBeInTheDocument();
  });

  it("withdraws once it is older than the age limit", async () => {
    await recommend();
    await advance(MAX_AGE_MS + 31_000);

    expect(screen.queryByTestId("case-for")).not.toBeInTheDocument();
    expect(screen.getByText(/no longer|out of date|moved on/i)).toBeInTheDocument();
  });
});
