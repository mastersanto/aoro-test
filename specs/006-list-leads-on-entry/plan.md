# Plan 006 — The list leads on entry

**Status:** Approved 2026-08-31
**Spec:** ./spec.md

## Approach

A vertical-space budget, spent where it buys the most and costs the least meaning.
The target on a phone: the first row must start at or above 462px, so that two
191px rows fit inside 844px. That is 171px to find; nothing below is a redesign.

| Change | Saves (390px) | What it costs |
|---|---|---|
| Geo explanation stated once, briefly | ~100px | Prose only — region, refusal and demo alternative all stay |
| Category filter scrolls in one row | ~52px | Nothing; all filters stay reachable by swipe |
| Page subtitle hidden below `lg` | ~32px | Orientation copy that the h1 and the list already convey |

Desktop already clears the bar; the same changes make it roomier without a separate
treatment.

## Architecture

- **Geo explanation** (`Widget.tsx`): the server's reason is written for a wide
  surface. The widget renders a short form — region, that real betting is off, and
  that demo works — and keeps the server's full sentence as the `title`, so nothing
  is lost for anyone who wants it. It stays in its `003 AR-5` position.
- **Category filter** (`MarketList.tsx`): `flex-wrap` becomes a single row with
  `overflow-x-auto` and momentum scrolling. Focus order is unchanged, so keyboard
  reachability (`004 UX-3`) is unaffected.
- **Page subtitle** (`app/page.tsx` or layout): `hidden lg:block`.

## Constitution check

- **Article II** — untouched; nothing here goes near a bet path.
- **Article V** — this is the article at risk, because the space is being taken from
  a compliance surface. The geo explanation is shortened, not removed: it still names
  the region, still refuses real betting, still points at demo, and stays where
  `003 AR-5` put it. Asserted in both suites rather than assumed.
- **Article VI** — the guarantee is a browser measurement, so it lands in the
  appearance suite. It must be able to fail: a check that a row merely intersects the
  fold would pass on today's build, which is the defect.
- **Article VII** — RED/GREEN on the two-row guarantee and on the Article V surfaces
  that pay for it.

## Risks

1. **A scrolling filter row can hide categories** with no affordance. Mitigated by
   leaving the row's overflow visible at its edge and keeping every control in the
   tab order; the appearance suite already sweeps every visible control for size.
2. **The two-row number is fixture-bound.** The stub serves two markets, so the check
   asserts exactly what is available. Noted so it is not mistaken for a general bound.

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
