# Plan 005 — Decision Rail

**Status:** Approved 2026-08-31
**Spec:** ./spec.md

## Approach

A rearrangement, not a rewrite. Every component keeps its behaviour; what changes is
where it is mounted and what it is allowed to render. `Widget.tsx` owns the layout, so
that is where most of this lands.

## Architecture

### The rail (DR-1, DR-2, DR-3)

`Widget.tsx`'s grid becomes `[22rem, minmax(0,1fr)]` at `lg`, rail first in document
order. Below `lg` it is one column, rail first — so the phone ordering falls out of
document order rather than needing a second presentation.

The rail renders, always and only, in this order:

1. `SelectedMarketCard` (new) — question, outcome split, resolution date, and a
   control to clear. This is the **single** statement of the market.
2. `BetPanel` — with its own repetition of the question removed (DR-3).
3. `RecommendPanel` — borderless, on a quieter surface, labelled optional.
4. `DemoPositions`.

There is no conditional reordering. `betEntryActionable` no longer chooses a position;
it chooses what `BetPanel` renders, which is the AR-7 replacement.

### The AR-7 replacement (DR-1)

`BetPanel` gains one branch: when the bet cannot be acted on it renders the reason and
nothing else — no outcome group, no amount input, no review control. AR-7's intent held
that a dead panel must not sit above working help; expressing it as *absence of
controls* is stronger than *position*, because it holds at every width and cannot be
defeated by a reader scrolling.

### The finder moves (DR-4)

`AssistPanel` moves into the market-list column, above the list, as a compact strip
that expands on use. Its props and internals are untouched, so `001 US-4`'s grounding
guarantees and the disclaimer's co-visibility come with it — but the co-visibility is
re-asserted at the new position, because "visible together" is a claim about layout and
layout is what changed.

### The sheet goes (DR-2)

`BetSheet.tsx` and `useIsNarrow` are deleted along with `sheetOpen`. `selectMarket`
scrolls the rail into view instead. `tests/components/mobile-sheet.test.tsx` is replaced
by assertions that no overlay is mounted at 390px and that the confirmation is still the
only modal.

`lib/use-dialog.ts` keeps its stack. It has one consumer now; the stack is correct for
one and removing it would mean rebuilding it when a second arrives.

## Constitution check

- **Article II** — the single `onPlace` call site inside `confirm()` is untouched, and
  the bypass suite runs unmodified. The AR-7 replacement *reduces* the reachable
  surface: a non-actionable panel now has no controls at all.
- **Article III** — nothing near a wallet.
- **Article IV** — no new route, no new secret.
- **Article V** — the geo explanation keeps its position beside the mode toggle, and
  the disclaimer's co-visibility is re-asserted at the finder's new home rather than
  assumed to survive the move.
- **Article VI** — three gates unchanged; the appearance gate gets the new layout at
  both widths.
- **Article VII** — RED/GREEN for each binding item in the spec. Column position is
  exempt as styling; what is *mounted* is not.

## Risks

1. **Deleting the sheet removes a tested surface.** Mitigated by replacing its
   assertions rather than dropping them: no overlay, one modal, bet reachable first.
2. **The empty rail.** D2 accepts a stable frame over a full one. If it reads badly in
   the browser that is a styling fix, not a structural one.
3. **`ordering.test.tsx` is replaced wholesale.** It tests a rule this feature repeals.
   The replacement asserts the new rule in the same file, so the count does not quietly
   drop.

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
