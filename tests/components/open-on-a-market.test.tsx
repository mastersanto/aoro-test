/**
 * Opening on a market (007 / OM-1).
 *
 * The line this feature walks: selecting a market for the user is a convenience;
 * selecting an OUTCOME for them is not. Article II reserves which side to back
 * and how much to stake, so those stay untouched and every assertion about them
 * is here rather than argued in prose.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const markets = fixture.markets.map(normalizeMarket);
const [first, second] = markets;

let geo: unknown = { country: "BR", bettingAllowed: true };
let served = markets;
let scrolled = 0;
let recommendCalls = 0;

beforeEach(() => {
  geo = { country: "BR", bettingAllowed: true };
  served = markets;
  scrolled = 0;
  recommendCalls = 0;
  // jsdom has no layout; count calls so "does not scroll" is observable.
  Element.prototype.scrollIntoView = function () {
    scrolled += 1;
  } as unknown as typeof Element.prototype.scrollIntoView;

  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    const u = String(url);
    const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
    if (u.includes("/api/geo")) return ok(geo);
    if (u.includes("/api/market/")) return ok({ market: served[0] ?? null });
    if (u.includes("/api/quotes")) return ok({ quotes: {} });
    if (u.includes("/api/recommend")) {
      recommendCalls += 1;
      return ok({ withheld: true, reason: "No view." });
    }
    if (u.includes("/api/markets")) return ok({ markets: served, nextCursor: null, stale: false });
    return ok({ price: "0.09" });
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("OM-1 — a market is ready on arrival", () => {
  it("selects the first market so the bet form is usable with no further click", async () => {
    render(<Widget />);

    const header = await screen.findByLabelText(/selected market/i);
    expect(within(header).getByText(first.question)).toBeInTheDocument();

    expect(await screen.findByRole("group", { name: /choose an outcome/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /review bet/i })).toBeInTheDocument();
  });

  it("keeps the empty state when there is nothing to select", async () => {
    served = [];
    render(<Widget />);

    await waitFor(() => expect(screen.getByText(/no open markets match/i)).toBeInTheDocument());
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
  });
});

describe("OM-1 / Article II — a default market is not a default bet", () => {
  it("chooses no outcome", async () => {
    render(<Widget />);
    const group = within(await screen.findByRole("group", { name: /choose an outcome/i }));

    for (const b of group.getAllByRole("button")) {
      expect(b).toHaveAttribute("aria-pressed", "false");
    }
  });

  it("fills no amount", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });
    expect((screen.getByLabelText(/amount/i) as HTMLInputElement).value).toBe("");
  });

  it("BYPASS CHECK: opens no confirmation and places nothing on load", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByTestId("confirm-payout")).toBeNull();
    // Review is unreachable until the user supplies both missing decisions.
    expect(screen.getByRole("button", { name: /review bet/i })).toBeDisabled();
  });

  it("requests no recommendation — the assistant stays user-initiated (003 AR-1)", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });
    await waitFor(() => expect(screen.getByLabelText(/selected market/i)).toBeInTheDocument());

    expect(recommendCalls).toBe(0);
  });

  it("does not scroll the page under someone who has not touched it", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });
    expect(scrolled).toBe(0);
  });

  it("still scrolls when the user picks a market themselves (005 DR-2)", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });
    expect(scrolled).toBe(0);

    const row = await screen.findByRole("heading", { name: new RegExp(second.question.slice(0, 18), "i") });
    fireEvent.click(row.closest('[role="button"]')!);

    await waitFor(() => expect(scrolled).toBeGreaterThan(0));
  });
});

describe("OM-1 — it happens once", () => {
  it("leaves the selection cleared when the user clears it", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });

    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));

    await waitFor(() =>
      expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull(),
    );
    // and stays cleared while the list keeps refreshing.
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
  });

  it("does not re-select when the search changes", async () => {
    render(<Widget />);
    await screen.findByRole("group", { name: /choose an outcome/i });
    fireEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    await waitFor(() => expect(screen.queryByLabelText(/amount/i)).toBeNull());

    fireEvent.change(screen.getByLabelText(/search markets/i), { target: { value: "fed" } });

    await new Promise((r) => setTimeout(r, 400));
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
  });
});

describe("OM-1 / Article V — a default selection changes no refusal", () => {
  it("renders no bet controls in a restricted region", async () => {
    geo = { country: "US", bettingAllowed: false, reason: "close-only here" };
    render(<Widget />);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));

    await screen.findByLabelText(/selected market/i);
    await waitFor(() => expect(screen.getByText(/close-only here/i)).toBeInTheDocument());

    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
    expect(screen.queryByLabelText(/amount/i)).toBeNull();
  });

  it("renders no bet controls when the default market is itself restricted", async () => {
    served = [{ ...first, restricted: true }, second];
    geo = { country: "BR", bettingAllowed: true };
    render(<Widget />);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));

    await screen.findByLabelText(/selected market/i);
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull(),
    );
  });
});

describe("OM-1 — opening on a market never takes something away", () => {
  it("does not wipe suggestions the user already asked for", async () => {
    // The finder is usable before the market list has loaded, so its response can
    // arrive first. The automatic selection routes through selectMarket, which
    // clears advice about other markets — correct for a user's own change, and
    // destructive here.
    let releaseMarkets!: () => void;
    const gate = new Promise<void>((r) => {
      releaseMarkets = r;
    });

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      const u = String(url);
      const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
      if (u.includes("/api/geo")) return ok({ country: "BR", bettingAllowed: true });
      if (u.includes("/api/market/")) return ok({ market: first });
      if (u.includes("/api/quotes")) return ok({ quotes: {} });
      if (u.includes("/api/assist")) {
        return ok({
          suggestions: [
            { market: second, outcome: second.outcomes[0], reasoning: "Odds imply this." },
          ],
        });
      }
      if (u.includes("/api/markets")) {
        await gate; // markets land AFTER the suggestions
        return ok({ markets, nextCursor: null, stale: false });
      }
      return ok({ price: "0.09" });
    }));

    render(<Widget />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "tennis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await screen.findByTestId("suggestion-0");

    releaseMarkets();

    await waitFor(() => expect(screen.getByRole("heading", { name: /Tirante/i })).toBeInTheDocument());
    // The suggestions the user asked for are still there.
    expect(screen.getByTestId("suggestion-0")).toBeInTheDocument();
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });
});
