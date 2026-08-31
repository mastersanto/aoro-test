/**
 * Article V, asserted with 004's new states present (004 / T21).
 *
 * Not a RED/GREEN pair: these are pre-existing invariants, and an assertion that
 * a shipped invariant still holds cannot be red first. What makes them worth
 * writing is that 004 introduced states none of them had been checked against —
 * an open trapping dialog, a retry, a valued position panel — and one of those
 * states did break Article V during implementation.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const [marketA] = fixture.markets.map(normalizeMarket);

function stub(geo: unknown) {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("/api/geo")) return ok(geo);
    if (u.includes("/api/market/")) return ok({ market: marketA });
    if (u.includes("/api/quotes")) return ok({ quotes: {} });
    if (u.includes("clob.polymarket.com")) return ok({ price: "0.09" });
    return ok({ markets: [marketA], nextCursor: null, stale: false });
  });
}

const RESTRICTED = {
  country: "US",
  bettingAllowed: false,
  reason: "Polymarket's main exchange is close-only in the US.",
};

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

async function selectMarket() {
  const row = await screen.findByRole("heading", { name: /Tirante/i });
  fireEvent.click(row.closest('[role="button"]')!);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  setViewport(1024);
});

describe("the compliance surface stays keyboard-reachable (Art. V)", () => {
  it("keeps the mode toggle reachable at narrow width with a market selected", async () => {
    // Reachability, not position. Previously at risk because the bet sheet
    // trapped focus; the sheet is gone (005 / DR-2) and this stays asserted,
    // because it is the guarantee that broke once already.
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    await selectMarket();
    await screen.findByTestId("selected-market");

    const demo = screen.getByRole("button", { name: /^Demo$/i });
    demo.focus();
    expect(document.activeElement).toBe(demo);

    fireEvent.keyDown(document, { key: "Tab" });
    // Nothing traps focus: no dialog is mounted to trap it.
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the geo explanation visible with a market selected", async () => {
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    await selectMarket();
    await screen.findByTestId("selected-market");

    const explanation = await screen.findByText(/close-only in the US/i);
    expect(explanation).toBeVisible();
  });

  it("still refuses real betting in a restricted region", async () => {
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await selectMarket();
    await screen.findByTestId("selected-market");

    await waitFor(() => expect(screen.getByText(/close-only in the US/i)).toBeInTheDocument());

    // 005 / DR-1: the refusal is now the ABSENCE of an entry, not a disabled
    // control — there is no outcome group, no amount field and no review button
    // to reach, at any width.
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
    expect(screen.queryByLabelText(/amount/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /review bet/i })).toBeNull();
    expect(screen.queryByRole("dialog", { name: /confirm your bet/i })).toBeNull();
  });

  it("still refuses real betting while a confirmation is open in demo mode", async () => {
    stub(RESTRICTED);
    render(<Widget />);
    await selectMarket();
    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = within(await screen.findByRole("dialog", { name: /confirm your bet/i }));
    // The confirmation says DEMO; switching to real money is still refused behind it.
    expect(dialog.getByText(/DEMO/)).toBeInTheDocument();
    expect(screen.getByText(/close-only in the US/i)).toBeInTheDocument();
  });
});

describe("the disclaimer survives 004's new states (Art. V)", () => {
  it("renders with the suggestions after a retry succeeds", async () => {
    // Asserted on a SUCCEEDED retry: the panel clears its suggestions on error,
    // so co-visibility during an error state asserts nothing at all.
    const suggestion = {
      market: marketA,
      outcome: marketA.outcomes[0],
      reasoning: "Odds imply 9%.",
    };
    const spy = vi.fn();
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: "down" }) });
    spy.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ suggestions: [suggestion] }),
    });
    vi.stubGlobal("fetch", spy);

    const { AssistPanel } = await import("@/components/AssistPanel");
    render(<AssistPanel onUseSuggestion={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "tennis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await screen.findByRole("alert");

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    const card = await screen.findByTestId("suggestion-0");
    const disclaimer = screen.getByText(/not financial advice/i);
    expect(card).toBeInTheDocument();
    expect(disclaimer).toBeInTheDocument();
  });
});

describe("the valued position panel never reads as real money (Art. V)", () => {
  beforeEach(() => setViewport(1280));

  it("labels a demo position and its total as practice money", async () => {
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
              prices: { [marketA.outcomes[0].tokenId]: 0.5 },
            },
          },
        });
      }
      if (u.includes("clob.polymarket.com")) return ok({ price: "0.09" });
      return ok({ markets: [marketA], nextCursor: null, stale: false });
    });

    render(<Widget />);
    await selectMarket();
    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
    const dialog = within(await screen.findByRole("dialog", { name: /confirm your bet/i }));
    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));

    const panel = await screen.findByRole("region", { name: /demo positions/i });
    await waitFor(() => expect(within(panel).getByTestId("position-totals")).toHaveTextContent(/DEMO/));
    // A rising number is exactly where "is this real?" gets asked.
    expect(within(panel).getByText(/not a balance you can bet with/i)).toBeInTheDocument();
  });
});
