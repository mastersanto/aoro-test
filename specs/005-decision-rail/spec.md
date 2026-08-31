# Spec 005 — Decision Rail

**Status:** Approved 2026-08-31
**Owner:** jorgeivansandoval@gmail.com

Story IDs are prefixed **DR-**. Design source: `design/widget-flow/` (canvas published
2026-08-31), whose "Recommended — Decision rail" artboard the project owner chose.

## Why

The project owner's report was "looks confusing so far", with three specific questions:
should betting be on the left, should it come first on mobile, and should the
recommendation follow it. Reading the shipped layout against those questions found
three causes, all in the right-hand rail:

- **The bet panel has no fixed position.** `003 AR-7` renders it above the assistant
  when a bet is actionable and below it when not. Same component, two positions,
  chosen by state — so the rail has no order anyone can learn.
- **Two AI panels are styled identically.** The finder (`001 US-4`) and the market
  advisor (`003`) are the same card, the same size, adjacent. Their headings differ,
  but nothing ranks one above the other, so the reader must parse copy to work out
  why there are two.
- **The finder sits after the bet.** A tool for *choosing a market* renders below the
  form for betting on one already chosen — visible only once it is least useful.

Underneath all three: the rail is four cards and a loose button of equal weight, the
market question is restated inside two of them, and nothing says where you are.

## What (user stories)

### DR-1 *(core)* — One order, always
As someone using the widget, the parts of it stay where I left them.

**Acceptance criteria**
- The rail's sections render in **one fixed order**: the selected market, the bet
  entry, the advisor, then demo positions. No application state reorders them.
- **This repeals `003 AR-7`'s ordering rule** (see Amendments). AR-7's *intent* —
  never present a bet entry the user cannot act on as though it were the main event —
  is preserved and strengthened: a bet entry that cannot be acted on exposes **no
  outcome control, no amount field and no review control**, only the reason. It is
  not demoted; it stops being an entry.
- The rail is present at a stable width whether or not a market is selected, so
  selecting one never reflows the page around the reader.

### DR-2 *(core)* — The bet is where the decision is
As someone who has chosen a market, the thing I came to do is in front of me.

**Acceptance criteria**
- At desktop width the rail is on the **left**, the market list on the right.
- At narrow width there is **one column**, and the bet entry is the first thing that
  can be acted on — above the advisor, above the list.
- **The bottom sheet is removed** (amends `002 VR-4`). Choosing a market from the list
  moves the page to the rail rather than presenting an overlay over it.
- Nothing about the confirmation changes: it remains the single modal, with Escape
  cancelling and its five fields intact (Art. II, `004 UX-3`).

### DR-3 *(core)* — The market is stated once
As someone with a market selected, I can see what I am betting on without it being
repeated at me.

**Acceptance criteria**
- The selected market appears **once**, as the rail's header — question, outcome
  split, and when it resolves — and is not restated inside the bet entry or the advisor.
- The header offers a way to change or clear the selection.
- With nothing selected the rail says so plainly and points at the list.

### DR-4 *(core)* — The two AI surfaces are told apart
As someone reading the widget, I can tell why there are two AI features.

**Acceptance criteria**
- The **finder** (`001 US-4`) moves to the market list column, where finding happens.
- The **advisor** (`003`) stays in the rail, below the bet, on a visibly quieter
  surface than the bet entry, and is marked as optional.
- Each keeps every guarantee it already has. In particular the "not financial advice"
  disclaimer keeps rendering with whatever it qualifies, at both widths (Art. V).

## What binds under Article VII

Exempt as styling: colour, type, spacing, and which side of a grid a column sits on.

Binding, written test-first:
- **The fixed order** (DR-1) — asserted as document order that does *not* vary across
  the states `003 AR-7` used to reorder for.
- **The replacement for AR-7** (DR-1) — a non-actionable bet entry exposes no outcome
  control, no amount field and no review control, in every reason the app recognises.
- **Single statement of the market** (DR-3) — the question appears once.
- **Sheet removal** (DR-2) — no overlay is mounted at narrow width, and the
  confirmation is still the single modal with its bypass guarantees intact.
- **Article V across the move** (DR-4) — the disclaimer's co-visibility survives the
  finder's relocation, and the geo explanation stays reachable.

## Amendments to earlier features

- **`003 AR-7` — ordering rule repealed, intent re-expressed.** Its mechanism was
  document order; its replacement is state. Recorded in `003`'s spec.
- **`002 VR-4` — the mobile bet sheet is removed.** Its purpose was to bring the bet
  entry to a phone reader without scrolling; DR-2 achieves that by putting the bet
  first instead of overlaying it. Recorded in `002`'s spec.
- **`004 UX-3`'s dialog stack keeps one consumer.** Built for the sheet-plus-
  confirmation nesting that no longer occurs. It stays: it is correct for the single
  case, and removing a working guard because its second caller went away is how the
  guard is missing when a second caller returns.

## Out of scope

- Any change to the confirmation, the content screen, pagination, sorting, valuation
  or error recovery. `004` shipped those and they are untouched.
- Real-money betting: withdrawn in `001`'s scope change.
- A new visual direction. `002`'s tokens, type and density are unchanged — this
  rearranges what exists.

## Context (reference facts)

- The chosen artboard is `design/widget-flow/Main.dc.html` (desktop) and
  `MainMobile.dc.html` (narrow).
- `003 AR-7` is enforced by `tests/components/ordering.test.tsx`, which asserts
  relative document order and must therefore be replaced rather than kept.
- `002 VR-4` is enforced by `tests/components/mobile-sheet.test.tsx`.
- A separate finding from the design pass, **not addressed here**: the shipped
  `--color-line-strong` composites to 1.50:1 on the panel, below WCAG 1.4.11's 3:1
  for a control's visual boundary. The appearance gate misses it because axe's
  `color-contrast` rule checks text only. Recorded for its own change.

## Decision record

- **D1 — Rail left, list right, at desktop.** The project owner asked; and once a
  market is chosen the rail is the task while the list becomes navigation.
- **D2 — The rail is always mounted, with a real empty state.** The alternative —
  showing it only after selection — reflows the whole page on the first click, and a
  stable frame is worth more than a slightly empty one.
- **D3 — Bet above advisor, not below.** The bet is the task; the advisor is help you
  may consult. Putting help first implies it is a step you owe.
- **D4 — The sheet goes rather than being kept alongside.** Two presentations of one
  bet entry is the problem this feature exists to remove.

## Open questions

None — the direction was chosen from drawn alternatives, each with its tradeoff stated.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
