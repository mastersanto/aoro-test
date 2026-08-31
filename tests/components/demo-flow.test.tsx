/** Temporary end-to-end check of the demo flow through the real Widget. */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Widget } from "@/components/Widget";
import fixture from "@/tests/fixtures/gamma-keyset.json";

vi.stubGlobal("fetch", vi.fn(async (url: string) => {
  if (String(url).includes("/api/markets")) {
    return { ok: true, status: 200, json: async () => ({ markets: fixture.markets.map((m) => ({
      ...m,
      outcomes: JSON.parse(m.outcomes).map((label: string, i: number) => ({
        label, price: Number(JSON.parse(m.outcomePrices)[i]), tokenId: JSON.parse(m.clobTokenIds)[i],
      })),
      volume: Number(m.volume), volume24hr: Number(m.volume24hr), liquidity: Number(m.liquidity),
    })), nextCursor: null, stale: false }) };
  }
  return { ok: true, status: 200, json: async () => ({ price: "0.09" }) };
}));

describe("demo flow (end to end)", () => {
  it("places a demo bet, debits the balance and shows a DEMO position", async () => {
    render(<Widget />);
    expect(screen.getByText(/practice balance \$1000\.00/i)).toBeInTheDocument();

    const heading = await screen.findByRole("heading", { name: /Tirante/i }, { timeout: 3000 });
    fireEvent.click(heading.closest('[role="button"]')!);

    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "90" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText(/DEMO/i)).toBeInTheDocument();
    expect(dialog.getByTestId("confirm-payout")).toHaveTextContent("$1000.00");
    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));

    await waitFor(() => expect(screen.getByText(/DEMO bet placed/i)).toBeInTheDocument());
    expect(screen.getByText(/practice balance \$910\.00/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/demo positions/i)).toBeInTheDocument();
    expect(screen.getByText(/no real money involved/i)).toBeInTheDocument();
  });
});
