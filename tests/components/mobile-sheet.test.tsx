/**
 * Narrow-width bet entry (005 / DR-2) — replacing feature 002's VR-4 bottom sheet.
 *
 * The sheet existed to bring the bet entry to a phone reader without scrolling.
 * DR-2 achieves that by putting the rail first in document order instead, so no
 * overlay is needed. These are VR-4's guarantees restated against the new
 * structure rather than dropped: one bet entry, reachable first, and the
 * confirmation still the only modal.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
      if (u.includes("/api/market/")) return ok({ market });
      if (u.includes("/api/geo")) return ok({ country: "BR", bettingAllowed: true });
      if (u.includes("/api/quotes")) return ok({ quotes: {} });
      if (u.includes("/api/markets")) return ok({ markets: [market], nextCursor: null, stale: false });
      if (u.includes("/api/recommend")) return ok({ withheld: true, reason: "No view." });
      return ok({ price: "0.09" });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  setViewport(1024);
});

async function selectMarket() {
  const heading = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(heading.closest('[role="button"]')!);
}

describe("narrow width mounts no overlay", () => {
  it("presents nothing over the page when a market is chosen", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    await screen.findByLabelText(/selected market/i);

    // The sheet is gone; nothing covers the page it came from.
    expect(screen.queryByTestId("bet-sheet")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("puts the bet entry before the list it was chosen from", async () => {
    // What the sheet was for: reaching the bet without hunting for it. Now it
    // falls out of document order instead of an overlay.
    setViewport(390);
    render(<Widget />);
    await selectMarket();

    const bet = await screen.findByLabelText(/place a demo bet/i);
    const list = screen.getByLabelText("Markets");
    expect(bet.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("mounts exactly one bet entry — not a second path to a bet (Art. II)", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    await screen.findByLabelText(/selected market/i);

    expect(screen.getAllByLabelText(/place a demo bet/i)).toHaveLength(1);
    expect(screen.getAllByRole("group", { name: /choose an outcome/i })).toHaveLength(1);
  });
});

describe("the confirmation is unchanged by the sheet's removal", () => {
  it("still routes a narrow-width bet through the one confirmation", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();

    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = within(await screen.findByRole("dialog", { name: /confirm your bet/i }));
    expect(dialog.getByTestId("confirm-payout")).toHaveTextContent("$222.22");
    // 003 AR-4, in its amended form: exactly one confirmation, counted by the
    // payout field that Article II requires every confirmation to display.
    expect(screen.getAllByTestId("confirm-payout")).toHaveLength(1);
  });

  it("cancelling places nothing and leaves the rail intact", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();

    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
    await screen.findByRole("dialog", { name: /confirm your bet/i });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText(/practice balance/i)).toHaveTextContent("$1000.00");
    expect(screen.getByLabelText(/selected market/i)).toBeInTheDocument();
  });
});

describe("desktop keeps the same single entry", () => {
  it("mounts one bet entry and no overlay at desktop width", async () => {
    setViewport(1280);
    render(<Widget />);
    await selectMarket();
    await screen.findByLabelText(/selected market/i);

    expect(screen.queryByTestId("bet-sheet")).toBeNull();
    expect(screen.getAllByRole("group", { name: /choose an outcome/i })).toHaveLength(1);
  });
});
