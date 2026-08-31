/**
 * US-5 / Article V: a restricted region loses real betting and nothing else.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const suggestion = { market, outcome: market.outcomes[0], reasoning: "Priced at 9%." };

function mockNetwork(geo: { country: string | null; bettingAllowed: boolean; reason?: string }) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("/api/geo")) return { ok: true, status: 200, json: async () => geo };
      if (u.includes("/api/assist"))
        return { ok: true, status: 200, json: async () => ({ suggestions: [suggestion] }) };
      if (u.includes("/api/markets"))
        return {
          ok: true,
          status: 200,
          json: async () => ({ markets: [market], nextCursor: null, stale: false }),
        };
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
}

const RESTRICTED = {
  country: "US",
  bettingAllowed: false,
  reason: "New bets are not available in your region — Polymarket's main exchange is close-only here.",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("restricted region", () => {
  it("explains that real betting is unavailable, naming the region", async () => {
    mockNetwork(RESTRICTED);
    render(<Widget />);
    await waitFor(() =>
      expect(screen.getByText(/real betting unavailable in US/i)).toBeInTheDocument(),
    );
  });

  it("keeps browsing available", async () => {
    mockNetwork(RESTRICTED);
    render(<Widget />);
    expect(await screen.findByRole("heading", { name: /Tirante/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/search markets/i)).toBeInTheDocument();
  });

  it("keeps AI assistance available, with its disclaimer", async () => {
    mockNetwork(RESTRICTED);
    render(<Widget />);
    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "tennis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByTestId("suggestion-0")).toBeInTheDocument());
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();
  });

  it("keeps demo betting fully working — it moves no money", async () => {
    mockNetwork(RESTRICTED);
    render(<Widget />);
    fireEvent.click((await screen.findByRole("heading", { name: /Tirante/i })).closest('[role="button"]')!);

    const outcomes = within(screen.getByRole("group", { name: /choose an outcome/i }));
    fireEvent.click(outcomes.getByRole("button", { name: /Tirante/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: /place bet/i }));
    await waitFor(() => expect(screen.getByText(/DEMO bet placed/i)).toBeInTheDocument());
    expect(screen.getByText(/practice balance \$980\.00/i)).toBeInTheDocument();
  });

  it("offers no path to a real bet: the real panel is disabled and states why", async () => {
    mockNetwork(RESTRICTED);
    render(<Widget />);
    await waitFor(() => expect(screen.getByText(/real betting unavailable/i)).toBeInTheDocument());

    fireEvent.click((await screen.findByRole("heading", { name: /Tirante/i })).closest('[role="button"]')!);
    fireEvent.click(screen.getByRole("button", { name: /real money/i }));

    expect(await screen.findByText(/close-only here/i)).toBeInTheDocument();
    for (const el of screen.getAllByRole("button")) fireEvent.click(el);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/bet placed/i)).not.toBeInTheDocument();
  });

  it("leaves real betting enabled in an unrestricted region", async () => {
    mockNetwork({ country: "BR", bettingAllowed: true });
    render(<Widget />);
    await waitFor(() =>
      expect(screen.queryByText(/real betting unavailable/i)).not.toBeInTheDocument(),
    );
  });
});
