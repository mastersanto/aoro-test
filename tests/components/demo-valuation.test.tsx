/**
 * The demo positions panel, valued (004 / UX-4).
 *
 * Two things are load-bearing here beyond the arithmetic: every figure stays
 * unmistakably practice money (Art. V, 002 VR-3), and the SPENDABLE balance
 * does not move. A paper gain that became stakeable would silently redefine
 * 001 US-3.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DemoPositions } from "@/components/DemoPositions";
import { Widget } from "@/components/Widget";
import { valuePositions, type Quote } from "@/lib/demo-valuation";
import type { DemoPosition } from "@/lib/demo";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const [marketA] = fixture.markets.map(normalizeMarket);
const NOW = 1_700_000_000_000;

const position = (over: Partial<DemoPosition> = {}): DemoPosition => ({
  id: "p1",
  marketId: "m1",
  question: "Will it rain?",
  outcomeLabel: "Yes",
  tokenId: "t-yes",
  shares: 100,
  costUsd: 40,
  priceAtFill: 0.4,
  fillSource: "book",
  ...over,
});

const quote = (over: Partial<Quote> = {}): Quote => ({
  closed: false,
  at: NOW,
  prices: { "t-yes": 0.5 },
  ...over,
});

function renderPanel(positions: DemoPosition[], quotes: Record<string, Quote>) {
  const valued = valuePositions(positions, quotes, NOW);
  return render(<DemoPositions rows={valued.rows} totals={valued.totals} />);
}

describe("each position shows cost, value and the difference", () => {
  it("shows what it cost and what it is worth now", () => {
    renderPanel([position()], { m1: quote() });
    const row = within(screen.getByTestId("position-p1"));
    expect(row.getByTestId("position-cost")).toHaveTextContent("$40.00");
    expect(row.getByTestId("position-value")).toHaveTextContent("$50.00");
  });

  it("shows the difference", () => {
    renderPanel([position()], { m1: quote() });
    expect(within(screen.getByTestId("position-p1")).getByTestId("position-pnl"))
      .toHaveTextContent(/\+\$10\.00/);
  });

  it("shows a loss as a loss", () => {
    renderPanel([position()], { m1: quote({ prices: { "t-yes": 0.1 } }) });
    expect(within(screen.getByTestId("position-p1")).getByTestId("position-pnl"))
      .toHaveTextContent(/-\$30\.00/);
  });

  it("reads as unresolved, not as a loss, when the market names no winner", () => {
    renderPanel([position()], { m1: quote({ closed: true, prices: { "t-yes": 0, "t-no": 0 } }) });
    const row = within(screen.getByTestId("position-p1"));
    expect(row.getByTestId("position-value")).toHaveTextContent(/unresolved/i);
    expect(row.queryByText(/-\$40\.00/)).toBeNull();
  });

  it("says a position could not be valued rather than showing a zero", () => {
    renderPanel([position()], {});
    expect(within(screen.getByTestId("position-p1")).getByTestId("position-value"))
      .toHaveTextContent(/not valued/i);
  });

  it("reads as won when the market settled that way", () => {
    renderPanel([position()], {
      m1: quote({ closed: true, prices: { "t-yes": 0.9999, "t-no": 0 } }),
    });
    expect(within(screen.getByTestId("position-p1")).getByTestId("position-value"))
      .toHaveTextContent(/won/i);
  });
});

describe("totals", () => {
  it("shows cost, value and difference across positions", () => {
    renderPanel([position(), position({ id: "p2" })], { m1: quote() });
    const totals = within(screen.getByTestId("position-totals"));
    expect(totals.getByTestId("totals-value")).toHaveTextContent("$100.00");
    expect(totals.getByTestId("totals-pnl")).toHaveTextContent(/\+\$20\.00/);
  });

  it("states how many positions it could not value", () => {
    renderPanel([position(), position({ id: "p2", marketId: "gone" })], { m1: quote() });
    expect(screen.getByTestId("position-totals")).toHaveTextContent(/1 position/i);
  });

  it("says nothing could be valued rather than showing zero", () => {
    renderPanel([position()], {});
    expect(screen.getByTestId("position-totals")).toHaveTextContent(/not valued/i);
  });
});

describe("Article V — it never reads as real money", () => {
  it("labels the section and every value as DEMO", () => {
    renderPanel([position()], { m1: quote() });
    expect(screen.getByRole("region", { name: /demo positions/i })).toBeInTheDocument();

    const row = within(screen.getByTestId("position-p1"));
    expect(row.getByTestId("position-value")).toHaveTextContent(/DEMO/);
    expect(within(screen.getByTestId("position-totals")).getByText(/DEMO/)).toBeInTheDocument();
  });

  it("labels a gain as practice money too", () => {
    // A rising number is exactly where "is this real?" gets asked.
    renderPanel([position()], { m1: quote({ prices: { "t-yes": 0.9 } }) });
    expect(screen.getByTestId("position-totals")).toHaveTextContent(/DEMO/);
  });
});

function stubNetwork(price: number) {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("/api/geo")) return ok({ country: "MX", bettingAllowed: true, reason: "" });
    if (u.includes("/api/market/")) return ok({ market: marketA });
    if (u.includes("/api/quotes")) {
      return ok({
        quotes: {
          [marketA.id]: {
            closed: false,
            at: Date.now(),
            prices: { [marketA.outcomes[0].tokenId]: price },
          },
        },
      });
    }
    if (u.includes("clob.polymarket.com")) return ok({ price: "0.09" });
    return ok({ markets: [marketA], nextCursor: null, stale: false });
  });
}

async function placeDemoBet() {
  const row = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(row.closest('[role="button"]')!);
  fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
  fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "50" } });
  fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
  const dialog = within(await screen.findByRole("dialog", { name: /confirm your bet/i }));
  fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));
}

describe("001 US-3 is unchanged: valuation never moves the spendable balance", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("debits the stake and nothing else, however the position is valued", async () => {
    // The position more than doubles in value; the balance must not follow it.
    stubNetwork(0.9);
    render(<Widget />);
    await placeDemoBet();

    await waitFor(() => expect(screen.getByText(/DEMO · practice/i)).toHaveTextContent("$950.00"));

    await waitFor(() =>
      expect(screen.getByTestId("position-totals")).toHaveTextContent(/\+\$/),
    );
    // Still 950: a paper gain is displayed, never staked.
    expect(screen.getByText(/DEMO · practice/i)).toHaveTextContent("$950.00");
  });
});
