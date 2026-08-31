/**
 * AR-1 re-hydration hazards (feature 003 T7).
 *
 * Two of these already hold against shipped code and are REGRESSION GUARDS,
 * labelled as such: the draft is frozen at review, and the remount key is the
 * market id which in-place refresh does not change. The two that must fail here
 * are the new requirements — that a moved price is TOLD to the user on the open
 * confirmation, and that a market closing surfaces there rather than unmounting.
 */
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const moved = {
  ...market,
  outcomes: market.outcomes.map((o, i) => (i === 0 ? { ...o, price: 0.31 } : o)),
};
const closed = { ...market, closed: true };

/** What /api/market/[id] returns next. Mutated per test to drive a refresh. */
let byId = market;

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  byId = market;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
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

async function openConfirmation() {
  render(<Widget />);
  const heading = await screen.findByRole("heading", { name: /Tirante/i }, { timeout: 3000 });
  fireEvent.click(heading.closest('[role="button"]')!);
  fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
  fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "90" } });
  fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
  return screen.getByRole("dialog");
}

/** Drive the by-id poll forward so the next refresh actually lands. */
async function refreshWith(next: typeof market) {
  byId = next;
  await act(async () => {
    await vi.advanceTimersByTimeAsync(31_000);
  });
}

describe("regression guards (these hold today and must keep holding)", () => {
  it("a refreshed price does not silently change the open confirmation", async () => {
    const dialog = within(await openConfirmation());
    expect(dialog.getByTestId("confirm-price")).toHaveTextContent("9%");

    await refreshWith(moved);
    // The draft is authoritative: the number the user is agreeing to cannot
    // change underneath them.
    expect(dialog.getByTestId("confirm-price")).toHaveTextContent("9%");
  });

  it("a refresh does not tear down an open confirmation", async () => {
    await openConfirmation();
    await refreshWith(moved);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});

describe("new requirements (these must fail before T8)", () => {
  it("tells the user when the price has moved, and requires re-confirmation", async () => {
    const dialog = within(await openConfirmation());
    await refreshWith(moved);

    // Not silently updated — surfaced.
    expect(dialog.getByText(/price has moved/i)).toBeInTheDocument();
    expect(dialog.getByText(/31%/)).toBeInTheDocument();
    // And the commit action is no longer immediately available.
    expect(dialog.getByRole("button", { name: /review again|re-?confirm/i })).toBeInTheDocument();
  });

  it("surfaces a market closing on the dialog rather than unmounting it", async () => {
    const dialog = within(await openConfirmation());
    await refreshWith(closed);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(dialog.getByText(/closed/i)).toBeInTheDocument();
    expect(dialog.queryByRole("button", { name: /^place bet$/i })).not.toBeInTheDocument();
  });
});
