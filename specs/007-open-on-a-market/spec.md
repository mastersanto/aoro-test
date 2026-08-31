# Spec 007 — Open on a market

**Status:** Approved 2026-08-31
**Owner:** jorgeivansandoval@gmail.com

## Why

Reported by the project owner: *"when I load the app, I have no market to bet
immediately."*

Correct. `006` made the market **list** visible on arrival, which was a different
problem. Nothing is selected on load, so the rail opens on "No market chosen yet",
there is no bet form, and betting takes a click before it can begin. For a widget
whose whole purpose is placing a bet, the first screen offers no way to start one.

It also leaves `005`'s known tradeoff unpaid: the rail's empty state exists only
because nothing is selected, and it exists on every first load.

## What (user story)

### OM-1 *(core)* — A market is ready when I arrive
As someone opening the widget, I can begin placing a bet without first choosing a
market.

**Acceptance criteria**
- On first load, once markets are available, one is selected: the **first row of the
  list as ordered** — which is the most active market by 24-hour volume, the shipped
  default ordering.
- The rail therefore opens on a real market with a usable bet form, not an empty state.
- **No outcome is chosen and no amount is filled.** A default market is a starting
  point; which side to back and how much are the user's decisions and are left
  untouched (Art. II).
- **No confirmation is opened, and no bet is placed.** Selecting a market has never
  been an instruction to bet and does not become one.
- **No recommendation is requested.** `003 AR-1` makes the assistant user-initiated;
  a default selection must not fire it.
- The page does **not** scroll on the automatic selection. `005 DR-2` scrolls the rail
  into view when the user picks a market, because that is a response to their action.
  Doing it unprompted on load moves the page under someone who has not touched it.
- It happens **once**. Clearing the selection leaves it cleared, and searching,
  filtering or re-ordering does not re-select.
- If no market is available — an empty search, an outage — the rail keeps `005`'s
  empty state rather than inventing a selection.

## What binds under Article VII

Exempt as styling: nothing here is styling.

Binding, written test-first:
- The selection happens, and the bet form is usable without any further click.
- **Article II: the outcome and amount are untouched, no confirmation opens, and
  `onPlace` is not called.**
- No recommendation request is issued.
- It is once-only: clearing stays cleared; search, filter and sort do not re-trigger it.
- No scroll on the automatic selection.
- The empty state survives when there is nothing to select.

## Out of scope

- Changing which market leads the list — that is the sort control's job (`004 UX-2`).
- Any change to the rail's order (`005 DR-1`) or to the two-row entry guarantee
  (`006 LE-1`), both of which must still hold with a market selected.
- Persisting the selection across reloads: `001` keeps no user state.

## Context (reference facts)

- The default ordering is 24-hour volume descending (`004 UX-2`), so "the first row"
  is the most active market.
- `Widget.selectMarket` is the single point where selection changes (`003 AR-1`); it
  clears advice and, since `005`, scrolls the rail into view.
- The rail's empty state is `SelectedMarketCard`'s no-market branch, which `006`
  hides below `lg`.

## Decision record

- **D1 — The first row, not a curated pick.** It is already the most active market,
  it matches what the user sees at the top of the list, and it needs no new concept.
- **D2 — Market only, never an outcome.** Choosing a side is the substance of a bet.
  A default market saves a click; a default outcome would put words in the user's
  mouth on the one decision Article II reserves for them.
- **D3 — Once, not continuously.** A selection that reasserts itself would fight
  anyone who cleared it.

## Open questions

None.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
