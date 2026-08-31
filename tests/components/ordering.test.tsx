/**
 * The rail's fixed order, and the replacement for 003 AR-7 (005 / DR-1).
 *
 * AR-7 made the bet entry lead when actionable and follow the assistant when not.
 * The intent was right — never present a bet entry the user cannot act on as
 * though it were the main event — but the mechanism was document order, which
 * left the rail with no order anyone could learn.
 *
 * The replacement is state, not position: a bet entry that cannot be acted on
 * exposes no outcome control, no amount field and no review control. That is
 * stronger than the ordering it replaces — it holds at every width, and a reader
 * cannot defeat it by scrolling.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { BetPanel } from "@/components/BetPanel";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
let geo: { country: string | null; bettingAllowed: boolean; reason?: string } = {
  country: "BR",
  bettingAllowed: true,
};
let served = market;
let recommendResponse: unknown = { withheld: true, reason: "No view." };

beforeEach(() => {
  recommendResponse = { withheld: true, reason: "No view." };
  geo = { country: "BR", bettingAllowed: true };
  served = market;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
      if (u.includes("/api/market/")) return ok({ market: served });
      if (u.includes("/api/geo")) return ok(geo);
      if (u.includes("/api/quotes")) return ok({ quotes: {} });
      if (u.includes("/api/markets")) return ok({ markets: [served], nextCursor: null, stale: false });
      if (u.includes("/api/recommend")) return ok(recommendResponse);
      return ok({ price: "0.09" });
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

async function selectMarket() {
  const heading = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(heading.closest('[role="button"]')!);
}

/**
 * How many times a string appears in the rail's text, wrapped or not.
 * Element-wise matchers miss "About: <question>"; this does not.
 */
function countInRail(needle: string): number {
  const text = screen.getByTestId("rail").textContent ?? "";
  return text.split(needle).length - 1;
}

/** Document order of the rail's landmark sections. */
function railOrder(): string[] {
  const wanted = ["Selected market", "Place a demo bet", "Place a bet", "Outcome recommendation", "Demo positions"];
  return Array.from(document.querySelectorAll<HTMLElement>("aside, section"))
    .map((el) => el.getAttribute("aria-label") ?? el.querySelector("h2")?.textContent ?? "")
    .filter((t) => wanted.some((l) => t.includes(l)));
}

describe("DR-1 — the rail has one order, and it does not move", () => {
  it("renders market, bet, advisor, positions in that order", async () => {
    render(<Widget />);
    await selectMarket();
    await waitFor(() => expect(railOrder().length).toBeGreaterThan(2));

    const order = railOrder();
    const marketCard = order.findIndex((t) => t.includes("Selected market"));
    const bet = order.findIndex((t) => /Place a( demo)? bet/.test(t));
    const rec = order.findIndex((t) => t.includes("Outcome recommendation"));

    expect(marketCard).toBeGreaterThanOrEqual(0);
    expect(marketCard).toBeLessThan(bet);
    expect(bet).toBeLessThan(rec);
  });

  it("keeps that order when the bet CANNOT be acted on", async () => {
    // The exact state AR-7 used to reorder for. Nothing moves any more.
    geo = { country: "US", bettingAllowed: false, reason: "close-only here" };
    render(<Widget />);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await selectMarket();
    await waitFor(() => expect(railOrder().length).toBeGreaterThan(2));

    const order = railOrder();
    const bet = order.findIndex((t) => /Place a( demo)? bet/.test(t));
    const rec = order.findIndex((t) => t.includes("Outcome recommendation"));
    expect(bet).toBeLessThan(rec);
  });

  it("keeps that order when the market has closed", async () => {
    served = { ...market, closed: true };
    render(<Widget />);
    await selectMarket();
    await waitFor(() => expect(railOrder().length).toBeGreaterThan(2));

    const order = railOrder();
    const bet = order.findIndex((t) => /Place a( demo)? bet/.test(t));
    const rec = order.findIndex((t) => t.includes("Outcome recommendation"));
    expect(bet).toBeLessThan(rec);
  });
});

describe("DR-1 — a bet entry that cannot be acted on is not an entry", () => {
  function expectNoBetControls(scope: HTMLElement) {
    expect(within(scope).queryByRole("group", { name: /choose an outcome/i })).toBeNull();
    expect(within(scope).queryByLabelText(/amount/i)).toBeNull();
    expect(within(scope).queryByRole("button", { name: /review bet/i })).toBeNull();
  }

  it("offers nothing to press when the region blocks real betting", async () => {
    render(
      <BetPanel
        market={market}
        mode="real"
        onPlace={vi.fn()}
        bettingDisabled
        disabledReason="Real betting is unavailable in your region."
      />,
    );
    expectNoBetControls(document.body);
    expect(screen.getByText(/unavailable in your region/i)).toBeInTheDocument();
  });

  it("offers nothing to press when the market has closed", async () => {
    render(<BetPanel market={{ ...market, closed: true }} mode="demo" onPlace={vi.fn()} marketClosed />);
    expectNoBetControls(document.body);
  });

  it("offers nothing to press with no market chosen", async () => {
    render(<BetPanel market={null} mode="demo" onPlace={vi.fn()} />);
    expectNoBetControls(document.body);
  });

  it("still offers the controls when the bet CAN be acted on", async () => {
    // The other half of the invariant: this must not be vacuous.
    render(<BetPanel market={market} mode="demo" onPlace={vi.fn()} balanceUsd={1000} />);
    expect(screen.getByRole("group", { name: /choose an outcome/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review bet/i })).toBeInTheDocument();
  });
});

describe("DR-3 — the market is stated once", () => {
  it("does not restate it inside the recommendation either", async () => {
    // The first cut of DR-3 removed the question from the bet panel and left it
    // in the recommendation's "About:" line — a second statement that only
    // appears once a recommendation renders, which is why the withheld-response
    // case above did not catch it.
    recommendResponse = {
      recommendation: {
        favouredTokenId: market.outcomes[0].tokenId,
        arguedAtPrice: market.outcomes[0].price,
        resolvesOn: "The published result.",
        priceShows: "The market prices this as the less favoured side.",
        caseFor: "What the resolution criteria require.",
        caseAgainst: "What would prevent it.",
      },
    };
    render(<Widget />);
    await selectMarket();
    fireEvent.click(await screen.findByRole("button", { name: /what would you favour/i }));
    await screen.findByTestId("recommendation");

    expect(countInRail(market.question)).toBe(1);
  });

  it("shows the question exactly once in the rail", async () => {
    render(<Widget />);
    await selectMarket();
    await screen.findByTestId("selected-market");

    // Counted over the rail's TEXT, not by element matching. getAllByText with a
    // string is an exact per-element match, so it misses a restatement wrapped in
    // other words — "About: <question>" slipped straight through it, which a
    // mutation caught after the first version of this test called itself proven.
    expect(countInRail(market.question)).toBe(1);

    // and it is the header card that carries it, not the bet panel.
    const header = screen.getByLabelText(/selected market/i);
    expect(within(header).getByText(market.question)).toBeInTheDocument();
  });
});
