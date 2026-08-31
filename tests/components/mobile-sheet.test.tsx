/**
 * VR-4 — the mobile bet sheet is a state machine, not styling (Art. VII).
 * Its single most important property is that it is a *presentation* of the one
 * BetPanel, so Art. II's single onPlace call site is not forked.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.matchMedia = ((query: string) => ({
    matches: /max-width:\s*(\d+)/.test(query)
      ? width <= Number(/max-width:\s*(\d+)/.exec(query)![1])
      : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => ({ country: "BR", bettingAllowed: true }) };
      if (u.includes("/api/markets"))
        return { ok: true, status: 200, json: async () => ({ markets: [market], nextCursor: null, stale: false }) };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
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

describe("mobile bet sheet", () => {
  it("does not mount at desktop width", async () => {
    setViewport(1280);
    render(<Widget />);
    await selectMarket();
    expect(screen.queryByRole("dialog", { name: /place a bet/i })).not.toBeInTheDocument();
    // The panel is present inline instead.
    expect(screen.getByRole("group", { name: /choose an outcome/i })).toBeInTheDocument();
  });

  it("opens when a market is chosen on a narrow screen", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    await waitFor(() =>
      expect(screen.getByTestId("bet-sheet")).toBeInTheDocument(),
    );
  });

  it("dismisses without placing anything", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    const sheet = within(await screen.findByTestId("bet-sheet"));
    fireEvent.click(sheet.getByRole("button", { name: /close|dismiss/i }));

    await waitFor(() => expect(screen.queryByTestId("bet-sheet")).not.toBeInTheDocument());
    expect(screen.queryByText(/DEMO bet placed/i)).not.toBeInTheDocument();
    expect(screen.getByText(/practice balance \$1000\.00/i)).toBeInTheDocument();
  });

  it("renders the one BetPanel — it is not a second bet-entry path (Art. II)", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    const sheet = within(await screen.findByTestId("bet-sheet"));

    // The same controls, from the same component.
    expect(sheet.getByRole("group", { name: /choose an outcome/i })).toBeInTheDocument();
    expect(sheet.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: /review bet/i })).toBeInTheDocument();
    // There is exactly one outcome group on the page: no duplicate panel.
    expect(screen.getAllByRole("group", { name: /choose an outcome/i })).toHaveLength(1);
  });

  it("still routes through the one confirmation, which the sheet does not replace", async () => {
    setViewport(390);
    render(<Widget />);
    await selectMarket();
    const sheet = within(await screen.findByTestId("bet-sheet"));

    fireEvent.click(sheet.getByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(sheet.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(sheet.getByRole("button", { name: /review bet/i }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByTestId("confirm-payout")).toHaveTextContent("$222.22");
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });
});
