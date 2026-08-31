/**
 * Keyboard operation of the two bet surfaces (004 / UX-3).
 *
 * The Article II assertion here is narrow and specific: whatever dismissal we
 * add must CANCEL. A dismissal gesture wired to confirm would invert the
 * confirmation the constitution requires. It is a constraint on the new
 * handler, not a defect being repaired — Cancel was always one Tab away.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfirmBetDialog } from "@/components/ConfirmBetDialog";
import { Widget } from "@/components/Widget";
import { normalizeMarket } from "@/lib/polymarket/gamma";
import fixture from "../fixtures/gamma-keyset.json";

const [marketA] = fixture.markets.map(normalizeMarket);

const draft = {
  market: marketA,
  outcome: marketA.outcomes[0],
  amountUsd: 20,
};

function stubNetwork() {
  vi.stubGlobal("fetch", async (url: string) => {
    const u = String(url);
    if (u.includes("/api/geo")) {
      return { ok: true, status: 200, json: async () => ({ country: "MX", bettingAllowed: true, reason: "" }) };
    }
    if (u.includes("/api/market/")) {
      return { ok: true, status: 200, json: async () => ({ market: marketA }) };
    }
    if (u.includes("/api/quotes")) {
      return { ok: true, status: 200, json: async () => ({ quotes: {} }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ markets: [marketA], nextCursor: null, stale: false }),
    };
  });
}

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  window.dispatchEvent(new Event("resize"));
}

beforeEach(() => stubNetwork());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  setViewport(1024);
});

describe("the confirmation, by keyboard (Art. II)", () => {
  it("BYPASS CHECK: Escape cancels and places nothing — real mode", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmBetDialog draft={draft} mode="real" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("BYPASS CHECK: Escape cancels and places nothing — demo mode", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(
      <ConfirmBetDialog draft={draft} mode="demo" onConfirm={onConfirm} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("BYPASS CHECK: Escape places nothing even when the bet is otherwise placeable", () => {
    // No blocked state, no moved price — the one case where "Place bet" is live.
    const onConfirm = vi.fn();
    render(
      <ConfirmBetDialog
        draft={draft}
        mode="demo"
        livePrice={draft.outcome.price}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.keyDown(document, { key: "Enter" });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("moves focus into itself when it opens", () => {
    render(<ConfirmBetDialog draft={draft} mode="demo" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(true);
  });

  it("keeps Tab inside itself", () => {
    render(<ConfirmBetDialog draft={draft} mode="demo" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    const dialog = screen.getByRole("dialog");
    const buttons = within(dialog).getAllByRole("button");

    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(dialog.contains(document.activeElement)).toBe(true);
  });
});

describe("the bet sheet announces itself (UX-3)", () => {
  it("carries a dialog role and an accessible name at mobile width", async () => {
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);

    const sheet = await screen.findByTestId("bet-sheet");
    expect(sheet).toHaveAttribute("role", "dialog");
    expect(sheet).toHaveAccessibleName(/place a bet/i);
  });

  it("is not announced as modal while the confirmation above it is", async () => {
    // Two nested aria-modal surfaces would misdescribe the page: the thing on
    // top is the modal.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    const sheet = await screen.findByTestId("bet-sheet");

    expect(sheet).not.toHaveAttribute("aria-modal", "true");
  });

  it("closes on Escape", async () => {
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    await screen.findByTestId("bet-sheet");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => expect(screen.queryByTestId("bet-sheet")).toBeNull());
  });
});

describe("003 AR-4 still holds — at most one confirmation (amended form)", () => {
  it("shows exactly one confirmation at mobile width, inside the sheet", async () => {
    // AR-4 was enforced by counting elements with a dialog role. The sheet now
    // legitimately has one too, so the count moved to the confirmation itself —
    // the thing AR-4 is about — rather than being loosened.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    const sheet = within(await screen.findByTestId("bet-sheet"));

    fireEvent.click(sheet.getByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(sheet.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(sheet.getByRole("button", { name: /review bet/i }));

    expect(screen.getAllByRole("dialog", { name: /confirm your bet/i })).toHaveLength(1);
  });

  it("Escape over the confirmation closes it and leaves the sheet open", async () => {
    // The nesting case the dialog stack exists for: one Escape, one dismissal.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    const sheet = within(await screen.findByTestId("bet-sheet"));

    fireEvent.click(sheet.getByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(sheet.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(sheet.getByRole("button", { name: /review bet/i }));
    await screen.findByRole("dialog", { name: /confirm your bet/i });

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /confirm your bet/i })).toBeNull(),
    );
    expect(screen.getByTestId("bet-sheet")).toBeInTheDocument();
  });
});

describe("the sheet must not trap the compliance surface (Art. V, audit round 2)", () => {
  it("leaves the mode toggle and geo explanation keyboard-reachable", async () => {
    // The sheet is open for as long as a market is selected — it is a panel,
    // not a modal. Trapping Tab inside it would make the Demo toggle
    // unreachable by keyboard, and the Demo toggle is the one thing 001 US-5
    // promises a user in a restricted region.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    const sheet = await screen.findByTestId("bet-sheet");

    const demoToggle = screen.getByRole("button", { name: /^Demo$/i });
    expect(sheet.contains(demoToggle)).toBe(false);

    demoToggle.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    // Focus was not yanked back into the sheet.
    expect(sheet.contains(document.activeElement)).toBe(false);
  });

  it("still traps Tab inside the confirmation, which IS modal", async () => {
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    const sheet = within(await screen.findByTestId("bet-sheet"));

    fireEvent.click(sheet.getByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(sheet.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(sheet.getByRole("button", { name: /review bet/i }));

    const dialog = await screen.findByRole("dialog", { name: /confirm your bet/i });
    const buttons = within(dialog).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(dialog.contains(document.activeElement)).toBe(true);
  });
})
