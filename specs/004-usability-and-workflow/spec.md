# Spec 004 — Usability and Workflow

**Status:** Approved 2026-08-31
**Owner:** jorgeivansandoval@gmail.com

Story IDs are prefixed **UX-**. Other features are referenced as `001 US-1`, `002 VR-2`, `003 AR-1`.

## Why

The widget works, and in five specific places it works badly. Each of these was found by reading the shipped code rather than imagined:

- The market list shows 24 markets and stops. `/api/markets` returns a `nextCursor`; nothing uses it, so most of the exchange is unreachable.
- The list is always ordered by 24-hour volume. Someone looking for a market closing today cannot find one.
- No component handles `Escape`, and the bet sheet has no dialog role, no focus management and no focus trap. A keyboard user can open the confirmation and be unable to leave it.
- The AI panel says "please try again" and offers nothing to press. Recovery means retyping the prompt.
- Demo positions never change value. The practice balance only ever goes down, which teaches the opposite of what betting is.

This feature fixes those five in place. It is not a redesign — `002`'s visual system and `003`'s recommendation flow stay exactly as they are.

## What (user stories)

Tag semantics: *(core)* stories block release; *(bonus)* do not.

### UX-1 *(core)* — Reach more than the first page
As someone browsing, I can go beyond the first 24 markets.

**Acceptance criteria**
- More markets can be loaded without losing the ones already on screen or the current scroll position.
- The control says whether more exist, is absent when they do not, and cannot be pressed twice into a double load.
- A market never appears twice, even if the exchange returns it on two pages.
- Changing the search, category or sort starts a fresh page — a cursor from a previous query is never reused.
- A failure to load more leaves what is already shown intact and says what happened.

### UX-2 *(core)* — Order the list by what I care about
As someone browsing, I can order markets by activity or by how soon they end.

**Acceptance criteria**
- At minimum: 24-hour volume (the current default), soonest to end, and total volume.
- The active ordering is visible without opening a menu.
- Ordering composes with search and category rather than resetting them.
- Ordering is a query the server performs — not a re-sort of the 24 markets already loaded, which would silently sort a subset and look correct.

### UX-3 *(core)* — Operable by keyboard
As someone using a keyboard, I can complete and cancel a bet without a mouse.

**Acceptance criteria**
- `Escape` closes the confirmation and the mobile bet sheet, cancelling rather than confirming.
- When either opens, focus moves into it; while open, Tab stays within it; when it closes, focus returns to the control that opened it.
- The bet sheet is announced as a dialog, as the confirmation already is.
- Every control reachable by mouse is reachable by keyboard, in a visible focus order.
- **This is an Article II concern, not a courtesy.** A confirmation whose Cancel a keyboard user cannot reach is not the explicit choice the constitution requires.

### UX-4 *(core)* — Demo positions are worth something
As someone practising, I can see what my positions are worth now, so the practice balance reflects gains as well as losses.

**Acceptance criteria**
- Each position shows its current value at the live price of the outcome held, alongside what it cost.
- The panel shows the total: cost, current value, and the difference.
- Values update as prices refresh, on the same cadence as the rest of the app.
- When a market has closed and the data identifies a winner, the position is shown as settled — won or lost.
- **When a market has closed but the data does not identify a winner, the position is shown as unresolved and is never reported as a loss.** Closed markets are inconsistent here (see Context), and treating "no information" as "you lost" would be a fabrication.
- Every value keeps its DEMO labelling (`001 US-3`, `002 VR-3`). Nothing here may read as real money.

### UX-5 *(core)* — Recover without retyping
As someone who hit an error, I can retry the thing that failed.

**Acceptance criteria**
- Every failure a user can see offers a retry that repeats the failed request with the same input.
- Retrying does not clear what the user typed.
- A retry in progress is distinguishable from an idle failure, and cannot be triggered twice at once.
- Where something already retries on its own, that is stated rather than leaving the user to guess.

## Out of scope

- Anything requiring a wallet: `001`'s Phase 6 stays blocked at T21 and is untouched here.
- A new visual direction — `002`'s system is the system.
- Changing `003`'s recommendation behaviour.
- A market detail view, or any change to the browse → select → bet journey's shape.
- Persisting demo positions across reloads: `001 US-3` makes the practice balance per-session, and that stays.

## What binds under Article VII

Exempt as styling: the appearance of the new controls.

Binding, written test-first:
- **The pagination state machine** (UX-1): cursor handling, in-flight guarding, de-duplication, and cursor invalidation when the query changes. A cursor reused across a changed query returns the wrong page and looks plausible.
- **Ordering as a query** (UX-2): that the order reaches the server and is not applied client-side to a partial list.
- **Focus and dismissal** (UX-3): Escape cancels rather than confirms; focus enters, is contained, and returns. Cancelling must not place anything — the existing bypass tests continue to hold.
- **Position valuation** (UX-4): value from shares and live price, the totals, the settled case, and the indeterminate case that must never read as a loss.
- **Retry** (UX-5): that a retry repeats the same request, preserves input, and cannot double-fire.

## Context (reference facts for planning)

- `/api/markets` already returns `nextCursor` from Gamma's keyset pagination; the client discards it. The server route needs no new capability for UX-1.
- Gamma accepts `order` with `ascending` for at least `volume24hr`, `endDate`, `liquidity` and `volume` (verified 2026-08-31). `startDate` returned unusable values and is not offered.
- **Closed markets do not consistently identify a winner.** Verified 2026-08-31: some report `outcomePrices` of `["0.000001…", "0.999999…"]`, from which the winning outcome is clear; others report `["0", "0"]`, from which nothing is. Any settlement rule must handle the second case as unresolved. A rule that reads `0` as "lost" would report every such position as a loss.
- Demo state is per-session by `001 US-3`, so most positions will be valued at live prices rather than settled. Settlement is the limiting case, not the common one.
- The confirmation already carries `role="dialog"` and `aria-modal`; the bet sheet carries neither. Neither traps focus and no component handles `Escape` (verified in the shipped code).
- `003 AR-1` already refreshes the selected market on a 30-second cadence. UX-4's values should ride that rather than adding a second clock.

## Decision record

- **D1 — Fix in place, not a rework.** Chosen by the project owner over reconsidering the browse → select → bet journey. Every `001`, `002` and `003` guarantee keeps its current meaning, and both existing suites must pass unmodified.
- **D2 — All five gaps in one feature.** They are small and independent; splitting them would cost more in process than the work itself.
- **D3 — Demo valuation is mark-to-market, with settlement as its limiting case.** One rule covers both: a position is worth shares × the current price, and a resolved market's price is the settlement. This is why the indeterminate `["0","0"]` case needs stating explicitly — the single rule would otherwise quietly value those at zero.

## Open questions

None — scope was settled with the project owner before drafting, and the API facts it depends on were verified rather than assumed.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
