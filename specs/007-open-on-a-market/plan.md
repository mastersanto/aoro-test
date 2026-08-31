# Plan 007 — Open on a market

**Status:** Approved 2026-08-31
**Spec:** ./spec.md

## Architecture

`MarketList` already owns the loaded rows; `Widget` owns the selection. The list
gains one optional callback, `onFirstMarket`, called with the first row of its first
successful load. `Widget` acts on it exactly once, guarded by a ref, and only while
nothing is selected.

The selection goes through a **separate path from `selectMarket`**, because
`selectMarket` scrolls the rail into view — correct as a response to a click, wrong
on load, where it would move the page under someone who has not touched it. The
automatic path sets the same state and clears the same advice, minus the scroll.

Rather than duplicate that logic, `selectMarket` takes an options argument
(`{ scroll }`), defaulting to true. One function, one place selection changes, which
is what `003 AR-1` requires.

## What is deliberately NOT done

- `preselected` stays `null`. Article II reserves the choice of side.
- `requestRecommendation` is not called.
- `BetPanel`'s `key` already includes the market id, so the form mounts empty.

## Constitution check

- **Article II** — the risk lives here, and it is the difference between selecting a
  market and starting a bet. The outcome and amount stay empty, no confirmation
  opens, `onPlace` is unreachable without the user's own clicks, and the `001` T11
  bypass suite runs unmodified. Asserted directly rather than argued.
- **Article V** — a market may be `restricted`, and geo may block real betting. Both
  already gate the bet entry through `lib/betting-availability.ts`; a default
  selection changes nothing about that, and the `005 DR-1` inert branch renders no
  controls when it applies. Asserted with a restricted region.
- **Article VII** — RED/GREEN on each binding item.

## Risks

1. **A default selection could read as a recommendation.** It is the top of the list
   by the ordering the user can see and change, and the header card names it plainly.
   Noted rather than mitigated in code.
2. **`006`'s two-row guarantee now runs with a populated rail**, which is taller than
   the empty state it replaces. That guarantee must be re-checked in the same change —
   it is the check most likely to break, and the margin is ~38px.

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
