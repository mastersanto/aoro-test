/**
 * Constitution Article II, in executable form.
 * "Every bet requires an explicit user confirmation step that shows market,
 *  outcome, amount, price, and estimated payout" — and no path may skip it.
 */
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BetPanel } from "@/components/BetPanel";
import type { BetDraft } from "@/lib/bet";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const market = normalizeMarket(fixture.markets[0]);
const outcome = market.outcomes[0]; // price 0.09

type PlaceFn = (draft: BetDraft) => void;
let onPlace: ReturnType<typeof vi.fn<PlaceFn>>;

beforeEach(() => {
  onPlace = vi.fn<PlaceFn>();
});

afterEach(() => {
  vi.clearAllMocks();
});

function setup(mode: "real" | "demo" = "real") {
  return render(
    <BetPanel market={market} mode={mode} onPlace={onPlace} balanceUsd={1000} />,
  );
}

function fillDraft(amount = "10") {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(outcome.label, "i") }));
  fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: amount } });
}

function openConfirmation() {
  fillDraft();
  fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
  return screen.getByRole("dialog");
}

describe("Article II — the confirmation step", () => {
  it("shows all five mandated fields before anything can be placed", () => {
    setup();
    const dialog = within(openConfirmation());
    expect(dialog.getByText(market.question)).toBeInTheDocument();
    expect(dialog.getByTestId("confirm-outcome")).toHaveTextContent(outcome.label);
    expect(dialog.getByTestId("confirm-amount")).toHaveTextContent("$10");
    expect(dialog.getByTestId("confirm-price")).toHaveTextContent("9%");
    expect(dialog.getByTestId("confirm-payout")).toHaveTextContent("$111.11");
  });

  it("does not place the bet when the confirmation merely opens", () => {
    setup();
    openConfirmation();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("places the bet only through the confirmation's own action", () => {
    setup();
    const dialog = within(openConfirmation());
    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));
    expect(onPlace).toHaveBeenCalledTimes(1);
    expect(onPlace).toHaveBeenCalledWith(
      expect.objectContaining({
        amountUsd: 10,
        outcome: expect.objectContaining({ label: outcome.label }),
      }),
    );
  });

  it("places nothing when the confirmation is cancelled", () => {
    setup();
    const dialog = within(openConfirmation());
    fireEvent.click(dialog.getByRole("button", { name: /cancel/i }));
    expect(onPlace).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("BYPASS CHECK: no control outside the confirmation can place a bet", () => {
    setup();
    fillDraft();
    for (const el of screen.getAllByRole("button")) {
      fireEvent.click(el);
      fireEvent.submit(el);
    }
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("BYPASS CHECK: submitting the form directly does not place a bet", () => {
    const { container } = setup();
    fillDraft();
    const form = container.querySelector("form");
    if (form) fireEvent.submit(form);
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("BYPASS CHECK: pressing Enter in the amount field does not place a bet", () => {
    setup();
    fillDraft();
    fireEvent.keyDown(screen.getByLabelText(/amount/i), { key: "Enter", code: "Enter" });
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("demo bets pass through the identical confirmation", () => {
    setup("demo");
    const dialog = within(openConfirmation());
    expect(dialog.getByTestId("confirm-amount")).toBeInTheDocument();
    expect(dialog.getByTestId("confirm-price")).toBeInTheDocument();
    expect(dialog.getByTestId("confirm-payout")).toBeInTheDocument();
    expect(onPlace).not.toHaveBeenCalled();

    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));
    expect(onPlace).toHaveBeenCalledTimes(1);
  });

  it("cannot open a confirmation for a stake of zero or less", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: new RegExp(outcome.label, "i") }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("cannot open a confirmation before an outcome is chosen", () => {
    setup();
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("cannot place a real bet when betting is disabled for the region (Art. V)", () => {
    render(
      <BetPanel
        market={market}
        mode="real"
        onPlace={onPlace}
        bettingDisabled
        disabledReason="Betting is not available in your region."
      />,
    );
    expect(screen.getByText(/not available in your region/i)).toBeInTheDocument();

    // Since 005 / DR-1 a bet entry that cannot be acted on renders no controls at
    // all, so there is nothing left to press. Assert that directly AND still
    // sweep whatever buttons exist — the sweep is what makes this a bypass check
    // rather than a description.
    expect(screen.queryByRole("group", { name: /choose an outcome/i })).toBeNull();
    expect(screen.queryByLabelText(/amount/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /review bet/i })).toBeNull();

    for (const el of screen.queryAllByRole("button")) fireEvent.click(el);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onPlace).not.toHaveBeenCalled();
  });
});

describe("hazards found in the final audit", () => {
  it("refuses to review an outcome with no usable price instead of crashing", () => {
    const zeroPriced = {
      ...market,
      outcomes: [{ label: "Broken", price: 0, tokenId: "z1" }],
    };
    render(<BetPanel market={zeroPriced} mode="real" onPlace={onPlace} />);
    fireEvent.click(screen.getByRole("button", { name: /Broken/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText(/no usable price/i)).toBeInTheDocument();
    expect(onPlace).not.toHaveBeenCalled();
  });

  it("will not place a draft that was opened before betting became disabled", () => {
    const { rerender } = render(
      <BetPanel market={market} mode="real" onPlace={onPlace} balanceUsd={1000} />,
    );
    const dialog = within(openConfirmation());

    // The region decision arrives late and disables betting while the modal is open.
    rerender(
      <BetPanel
        market={market}
        mode="real"
        onPlace={onPlace}
        balanceUsd={1000}
        bettingDisabled
        disabledReason="Betting is not available in your region."
      />,
    );
    fireEvent.click(dialog.getByRole("button", { name: /place bet/i }));
    expect(onPlace).not.toHaveBeenCalled();
  });
});
