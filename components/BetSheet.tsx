"use client";

import { useEffect, useState } from "react";
import { useDialog } from "@/lib/use-dialog";

/**
 * VR-4 — the phone presentation of the bet panel.
 *
 * Deliberately a wrapper, not a panel: it renders whatever it is given, which is
 * the one BetPanel. That is what keeps Art. II's single onPlace call site single.
 */
export function BetSheet({
  open,
  onDismiss,
  children,
}: {
  open: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  // Hook first: it must run on every render, open or not (004 / UX-3).
  //
  // No focus trap. This sheet stays open for as long as a market is selected —
  // it is a panel, not a modal — so containing Tab would put the mode toggle
  // and the geo explanation beyond keyboard reach for the whole session
  // (Art. V, 001 US-5). The confirmation that opens above it does trap, and
  // the dialog stack keeps the two from fighting.
  const ref = useDialog({ open, onDismiss, trap: false });

  if (!open) return null;

  return (
    <div
      ref={ref}
      data-testid="bet-sheet"
      role="dialog"
      aria-label="Place a bet"
      // Deliberately NOT aria-modal. The confirmation can open above this and
      // is itself modal; announcing two nested modals misdescribes the page.
      className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-line-strong bg-panel p-4 pb-6 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] lg:hidden"
    >
      <div className="mx-auto mb-3 flex items-center justify-between">
        <span className="h-1 w-9 rounded-full bg-white/20" aria-hidden />
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Close bet panel"
          className="-mr-1 flex h-11 w-11 items-center justify-center rounded-control text-muted hover:bg-white/5"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 6 L18 18 M18 6 L6 18" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

/** True while the viewport is narrower than the desktop breakpoint. */
export function useIsNarrow(breakpoint = 1024): boolean {
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    // matchMedia is absent in some test environments; fall back to the width so
    // the hook degrades to "desktop" rather than throwing.
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
        : null;
    const sync = () => setNarrow(mq ? mq.matches : window.innerWidth < breakpoint);
    sync();
    mq?.addEventListener?.("change", sync);
    window.addEventListener("resize", sync);
    return () => {
      mq?.removeEventListener?.("change", sync);
      window.removeEventListener("resize", sync);
    };
  }, [breakpoint]);

  return narrow;
}
