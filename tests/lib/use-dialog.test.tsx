/**
 * Dialog keyboard behaviour (004 / UX-3).
 *
 * The stack matters: at mobile width the confirmation renders INSIDE the bet
 * sheet, so both are open at once. Two independent traps would fight over focus
 * and one Escape would close both.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { useDialog } from "@/lib/use-dialog";

function Dialog({
  open,
  onDismiss,
  label,
}: {
  open: boolean;
  onDismiss: () => void;
  label: string;
}) {
  const ref = useDialog({ open, onDismiss });
  if (!open) return null;
  return (
    <div ref={ref} role="dialog" aria-label={label}>
      <button type="button">{label} first</button>
      <button type="button">{label} last</button>
    </div>
  );
}

function Harness({ onDismiss }: { onDismiss?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      <Dialog
        open={open}
        label="Only"
        onDismiss={() => {
          onDismiss?.();
          setOpen(false);
        }}
      />
    </>
  );
}

describe("useDialog", () => {
  it("moves focus into the dialog when it opens", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Only first" }));
  });

  it("dismisses on Escape", () => {
    const onDismiss = vi.fn();
    render(<Harness onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the control that opened it", () => {
    render(<Harness />);
    const opener = screen.getByRole("button", { name: "Open" });
    opener.focus();
    fireEvent.click(opener);
    fireEvent.keyDown(document, { key: "Escape" });

    expect(document.activeElement).toBe(opener);
  });

  it("wraps Tab from the last focusable back to the first", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    const last = screen.getByRole("button", { name: "Only last" });
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Only first" }));
  });

  it("wraps Shift+Tab from the first focusable back to the last", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    screen.getByRole("button", { name: "Only first" }).focus();
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Only last" }));
  });

  it("does nothing while closed", () => {
    const onDismiss = vi.fn();
    render(<Dialog open={false} label="Closed" onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});

function Nested({
  outerDismiss,
  innerDismiss,
  innerOpen,
}: {
  outerDismiss: () => void;
  innerDismiss: () => void;
  innerOpen: boolean;
}) {
  const outer = useDialog({ open: true, onDismiss: outerDismiss });
  const inner = useDialog({ open: innerOpen, onDismiss: innerDismiss });
  return (
    <div ref={outer} role="dialog" aria-label="Sheet">
      <button type="button">Sheet first</button>
      <button type="button">Sheet last</button>
      {innerOpen && (
        <div ref={inner} role="dialog" aria-label="Confirm">
          <button type="button">Confirm first</button>
          <button type="button">Confirm last</button>
        </div>
      )}
    </div>
  );
}

describe("useDialog — only the topmost dialog is active (plan constraint 6)", () => {
  it("gives Escape to the inner dialog only", () => {
    const outerDismiss = vi.fn();
    const innerDismiss = vi.fn();
    render(<Nested outerDismiss={outerDismiss} innerDismiss={innerDismiss} innerOpen />);

    fireEvent.keyDown(document, { key: "Escape" });

    // One Escape must not close the confirmation AND the sheet behind it.
    expect(innerDismiss).toHaveBeenCalledTimes(1);
    expect(outerDismiss).not.toHaveBeenCalled();
  });

  it("traps Tab inside the inner dialog, not the outer one", () => {
    render(<Nested outerDismiss={vi.fn()} innerDismiss={vi.fn()} innerOpen />);

    screen.getByRole("button", { name: "Confirm last" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Confirm first" }));
  });

  it("hands control back to the outer dialog when the inner one closes", () => {
    const outerDismiss = vi.fn();
    const { rerender } = render(
      <Nested outerDismiss={outerDismiss} innerDismiss={vi.fn()} innerOpen />,
    );
    rerender(<Nested outerDismiss={outerDismiss} innerDismiss={vi.fn()} innerOpen={false} />);

    fireEvent.keyDown(document, { key: "Escape" });

    expect(outerDismiss).toHaveBeenCalledTimes(1);
  });

  it("traps Tab in the outer dialog when it is alone", () => {
    render(<Nested outerDismiss={vi.fn()} innerDismiss={vi.fn()} innerOpen={false} />);

    screen.getByRole("button", { name: "Sheet last" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Sheet first" }));
  });
});
