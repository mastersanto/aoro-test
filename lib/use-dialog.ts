"use client";

/**
 * Keyboard behaviour for a dialog surface (004 / UX-3).
 *
 * Owns four things a dialog needs and neither of ours had: focus moves in on
 * open, Tab is contained, Escape dismisses, and focus returns to whatever
 * opened it.
 *
 * The stack is the part that is not obvious. At mobile width the confirmation
 * renders INSIDE the bet sheet (`Widget.tsx` → `BetPanel.tsx`), so two dialogs
 * are open at once. Without a stack they would both trap focus and both answer
 * one Escape, closing the confirmation and the sheet behind it in a single
 * keypress. Registering on open and de-registering on close makes "topmost
 * wins" a property of the hook rather than something each caller arranges.
 */
import { useEffect, useRef, useState } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** Open dialogs, oldest first. Only the last entry handles keys. */
const stack: symbol[] = [];

function focusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => {
    // A control inside a NESTED dialog belongs to that dialog, not this one.
    // Deliberately not "closest dialog === container": that would silently stop
    // working for a caller whose box is not itself role="dialog".
    const nearest = el.closest('[role="dialog"]');
    return nearest === null || nearest === container || !container.contains(nearest);
  });
}

export function useDialog({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  // Read the handler through a ref so a changing identity cannot re-run the
  // subscription effect and, with it, re-order the stack. Synced in its own
  // effect rather than during render (react-hooks: no refs during render).
  const dismiss = useRef(onDismiss);
  useEffect(() => {
    dismiss.current = onDismiss;
  });

  // Lazy state, not a ref: stable for the component's life and readable during
  // render without touching `.current`.
  const [me] = useState(() => Symbol("dialog"));

  useEffect(() => {
    if (!open) return;

    stack.push(me);

    const opener = document.activeElement as HTMLElement | null;
    const container = ref.current;
    if (container) {
      const [first] = focusable(container);
      // Fall back to the box itself so focus is never left behind the dialog.
      (first ?? container).focus?.();
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the topmost dialog responds. One Escape closes one thing.
      if (stack[stack.length - 1] !== me) return;

      if (e.key === "Escape") {
        e.preventDefault();
        // Article II: dismissal cancels. It must never reach a placement path.
        dismiss.current();
        return;
      }

      if (e.key !== "Tab" || !ref.current) return;

      const items = focusable(ref.current);
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || !ref.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !ref.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      const at = stack.lastIndexOf(me);
      if (at !== -1) stack.splice(at, 1);
      // Returning focus is what makes the keyboard path a loop rather than a
      // dead end: dismiss the dialog and you are back where you pressed.
      opener?.focus?.();
    };
  }, [open, me]);

  return ref;
}
