/**
 * Article II end to end: an AI suggestion reaches the bet form and stops there.
 * Uses the real Widget, AssistPanel and BetPanel — only the network is mocked.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const suggestion = { market, outcome: market.outcomes[0], reasoning: "Priced at 9%." };

function mockNetwork() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const u = String(url);
      if (u.includes("/api/assist")) {
        return { ok: true, status: 200, json: async () => ({ suggestions: [suggestion] }) };
      }
      if (u.includes("/api/markets")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ markets: [market], nextCursor: null, stale: false }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("AI suggestion → bet form (Art. II)", () => {
  it("pre-fills the form and places nothing", async () => {
    mockNetwork();
    render(<Widget />);

    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "tennis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByTestId("suggestion-0")).toBeInTheDocument());

    // The disclaimer is on screen with the suggestions (Art. V).
    expect(screen.getByText(/not financial advice/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /use this/i }));

    // The outcome is now selected in the bet panel (scoped: the market card is
    // also a button whose accessible name contains the same text).
    await waitFor(() => {
      const outcomes = within(screen.getByRole("group", { name: /choose an outcome/i }));
      expect(
        outcomes.getByRole("button", { name: new RegExp(`${market.outcomes[0].label}.*9%`, "i") }),
      ).toHaveAttribute("aria-pressed", "true");
    });

    // ...and nothing has been confirmed or placed.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByText(/DEMO bet placed/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/demo positions/i)).not.toBeInTheDocument();
    expect(screen.getByText(/DEMO · practice \$1000\.00/i)).toBeInTheDocument();
  });

  it("still requires the full confirmation after using a suggestion", async () => {
    mockNetwork();
    render(<Widget />);

    fireEvent.change(screen.getByLabelText(/what are you interested in/i), {
      target: { value: "tennis" },
    });
    fireEvent.click(screen.getByRole("button", { name: /get suggestions/i }));
    await waitFor(() => expect(screen.getByTestId("suggestion-0")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /use this/i }));

    fireEvent.change(await screen.findByLabelText(/amount/i), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByTestId("confirm-amount")).toHaveTextContent("$50.00");
    expect(dialog.getByTestId("confirm-price")).toHaveTextContent("9%");
    expect(screen.getByText(/DEMO · practice \$1000\.00/i)).toBeInTheDocument();

    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));
    await waitFor(() => expect(screen.getByText(/DEMO bet placed/i)).toBeInTheDocument());
    expect(screen.getByText(/DEMO · practice \$950\.00/i)).toBeInTheDocument();
  });
});
