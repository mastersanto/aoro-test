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

describe("the confirmation is the only modal (005 / DR-2)", () => {
  it("mounts no other dialog at narrow width", async () => {
    // The bet sheet was the second dialog. With it gone the stack in
    // lib/use-dialog.ts has one consumer — kept, because it is correct for one
    // and rebuilding it when a second arrives is how the guard goes missing.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    await screen.findByLabelText(/selected market/i);

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("leaves the mode toggle and geo explanation keyboard-reachable (Art. V)", async () => {
    // Previously at risk because the sheet trapped focus. Asserted still, since
    // this is the guarantee that broke once already.
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    await screen.findByLabelText(/selected market/i);

    const demoToggle = screen.getByRole("button", { name: /^Demo$/i });
    demoToggle.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).not.toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("traps Tab inside the confirmation, which IS modal", async () => {
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));

    const dialog = await screen.findByRole("dialog", { name: /confirm your bet/i });
    const buttons = within(dialog).getAllByRole("button");
    buttons[buttons.length - 1].focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("shows exactly one confirmation at narrow width", async () => {
    setViewport(390);
    render(<Widget />);

    const row = await screen.findByRole("heading", { name: /Tirante/i });
    fireEvent.click(row.closest('[role="button"]')!);
    fireEvent.click(await screen.findByRole("button", { name: /Tirante · 9%/i }));
    fireEvent.change(screen.getByLabelText(/amount/i), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /review bet/i }));
    await screen.findByRole("dialog", { name: /confirm your bet/i });

    expect(screen.getAllByTestId("confirm-payout")).toHaveLength(1);
  });
});
