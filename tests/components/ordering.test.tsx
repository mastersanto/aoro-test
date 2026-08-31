/**
 * AR-7 ordering (feature 003 T15) — in the BEHAVIOUR suite, as spec.md
 * requires: at 390px there is no inline panel to move, so this is a state
 * machine over mounting, not styling.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
let geo: { country: string | null; bettingAllowed: boolean; reason?: string } = {
  country: "BR",
  bettingAllowed: true,
};
let served = market;

beforeEach(() => {
  geo = { country: "BR", bettingAllowed: true };
  served = market;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/market/")) return { ok: true, status: 200, json: async () => ({ market: served }) };
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => geo };
      if (u.includes("/api/markets")) return { ok: true, status: 200, json: async () => ({ markets: [served], nextCursor: null, stale: false }) };
      if (u.includes("/api/recommend")) return { ok: true, status: 200, json: async () => ({ withheld: true, reason: "No view." }) };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

/** Document order of the rail's landmark sections. */
function railOrder(): string[] {
  const labels = ["Place a demo bet", "Place a bet", "Outcome recommendation", "AI assistance"];
  return Array.from(document.querySelectorAll<HTMLElement>("aside, section"))
    .map((el) => el.getAttribute("aria-label") ?? el.querySelector("h2")?.textContent ?? "")
    .filter((t) => labels.some((l) => t.includes(l)));
}

async function selectMarket() {
  const heading = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(heading.closest('[role="button"]')!);
}

describe("the bet entry leads when it is actionable", () => {
  it("puts the bet entry above the assistance once a market is chosen in demo mode", async () => {
    render(<Widget />);
    await selectMarket();
    await waitFor(() => expect(railOrder().length).toBeGreaterThan(1));

    const order = railOrder();
    const bet = order.findIndex((t) => /Place a( demo)? bet/.test(t));
    const rec = order.findIndex((t) => t.includes("Outcome recommendation"));
    expect(bet).toBeGreaterThanOrEqual(0);
    expect(bet).toBeLessThan(rec);
  });
});

describe("the assistant leads whenever the bet entry cannot be acted on", () => {
  it("with no market selected", async () => {
    render(<Widget />);
    await screen.findByRole("heading", { name: /Tirante/i });
    const order = railOrder();
    expect(order.findIndex((t) => t.includes("AI assistance"))).toBeLessThan(
      order.findIndex((t) => /Place a( demo)? bet/.test(t)) === -1 ? Infinity : order.findIndex((t) => /Place a( demo)? bet/.test(t)),
    );
  });

  it("for a restricted region", async () => {
    geo = { country: "US", bettingAllowed: false, reason: "close-only here" };
    render(<Widget />);
    await selectMarket();
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await waitFor(() => expect(screen.getByText(/reason is shown above/i)).toBeInTheDocument());

    const order = railOrder();
    expect(order.findIndex((t) => t.includes("Outcome recommendation"))).toBeLessThan(
      order.findIndex((t) => /Place a bet/.test(t)),
    );
  });

  it("for a market the exchange marks restricted", async () => {
    render(<Widget />);
    await selectMarket();
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await waitFor(() => expect(screen.getByText(/market is restricted/i)).toBeInTheDocument());

    const order = railOrder();
    expect(order.findIndex((t) => t.includes("Outcome recommendation"))).toBeLessThan(
      order.findIndex((t) => /Place a bet/.test(t)),
    );
  });

  it("for the unbuilt wallet — the reason that applies to every permitted region today", async () => {
    served = { ...market, restricted: false };
    render(<Widget />);
    await selectMarket();
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await waitFor(() => expect(screen.getByText(/not enabled in this build/i)).toBeInTheDocument());

    const order = railOrder();
    expect(order.findIndex((t) => t.includes("Outcome recommendation"))).toBeLessThan(
      order.findIndex((t) => /Place a bet/.test(t)),
    );
  });
});
