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
  it("keeps the mode toggle reachable while the bet sheet is open", async () => {
    // Reachability, not position. The first version of this task asserted the
    // explanation "keeps its position beside the mode toggle", which was true
    // while a focus trap made both unreachable for the whole session.
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    await selectMarket();
    const sheet = await screen.findByTestId("bet-sheet");

    const demo = screen.getByRole("button", { name: /^Demo$/i });
    demo.focus();
    expect(document.activeElement).toBe(demo);

    fireEvent.keyDown(document, { key: "Tab" });
    expect(sheet.contains(document.activeElement)).toBe(false);
  });

  it("keeps the geo explanation outside the sheet and readable", async () => {
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    await selectMarket();
    const sheet = await screen.findByTestId("bet-sheet");

    const explanation = await screen.findByText(/close-only in the US/i);
    expect(sheet.contains(explanation)).toBe(false);
    expect(explanation).toBeVisible();
  });

  it("still refuses real betting in a restricted region, with the sheet open", async () => {
    setViewport(390);
    stub(RESTRICTED);
    render(<Widget />);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));
    await selectMarket();
    await screen.findByTestId("bet-sheet");

    await waitFor(() => expect(screen.getByText(/close-only in the US/i)).toBeInTheDocument());

    // The route to a real bet is closed by a DISABLED control, which is how
    // 001 US-5 expresses the refusal — and why UX-3 exempts disabled controls
    // from its keyboard-reachability criterion rather than making them focusable.
    const review = screen.queryByRole("button", { name: /review bet/i });
    if (review) expect(review).toBeDisabled();
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
