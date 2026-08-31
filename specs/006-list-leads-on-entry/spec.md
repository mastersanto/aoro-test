# Spec 006 — The list leads on entry

**Status:** Approved 2026-08-31
**Owner:** jorgeivansandoval@gmail.com

## Why

Reported by the project owner: *"when user enter in the app, he'd like to see at
least first market to bet."*

Measured on the shipped build, with nothing selected:

| Viewport | Chrome above the first market | Market rows fully visible |
|---|---|---|
| 1280×800 | 409px | 2 (every row the stub serves) |
| 390×844 | 633px | **1**, its bottom 20px from the fold |

So on a phone you arrive at a betting widget and see one market, flush against the
bottom edge, with nothing to indicate a list continues. `005`'s appearance check
passed this because it asked only whether the first row *fits* — a row sitting on
the fold satisfies that and still reads as "the page ends here".

The chrome is not one thing. On a phone it is: the page header (72px), the mode
toggle (50px), the DEMO chip and geo explanation (~160px), the AI finder (110px),
search and sort (56px), and the category filter wrapped onto two lines (96px).

## What (user story)

### LE-1 *(core)* — Arriving shows a list, not a row
As someone opening the widget, I can see that there are markets to browse before I
scroll.

**Acceptance criteria**
- With nothing selected, **at least two market rows are fully visible** without
  scrolling, at 1280×800 and at 390×844. Two, not one: one row on the fold does not
  read as a list.
- This is measured in a real browser, because it is a claim about layout and jsdom
  performs no layout.
- Nothing required by an earlier feature is removed to achieve it. Specifically:
  - the geo explanation stays present, states the region, and stays beside the mode
    toggle (`001 US-5`, `003 AR-5`, Art. V) — it may be shortened, not hidden;
  - every category filter stays reachable (`001 US-1`);
  - the DEMO labelling stays exactly as it is (`002 VR-3`, Art. V);
  - the finder stays above the list (`005 DR-4`).
- The rail's fixed order is unchanged (`005 DR-1`).

## What binds under Article VII

Exempt as styling: type sizes, spacing, and whether a control row scrolls or wraps.

Binding, written test-first:
- **The two-row guarantee** (LE-1) — asserted in the appearance suite at both
  viewports, and able to fail: it must not be satisfiable by a row that merely
  overlaps the fold.
- **The Article V surfaces that pay for it** — the geo explanation still names the
  region and is still visible; category filters all still reachable.

## Out of scope

- Any change to the rail's contents or order, the confirmation, or the AI surfaces.
- Reducing what the geo explanation *means*. Shortening prose is in scope; dropping
  the region, the refusal, or the demo alternative is not.

## Context (reference facts, measured 2026-08-31)

- The geo explanation renders the server's full reason, which is two sentences, and
  occupies roughly 160px at 390px width.
- The category filter wraps onto two rows at 390px (96px) and one at 1280px (44px).
- A market row is ~191px at 390px and ~79px at 1280px.
- The stub used by the appearance suite serves two markets, so "two rows" is the most
  that can be asserted there without changing the fixture.

## Decision record

- **D1 — Two rows, not one.** One row satisfies "visible" and fails the intent. Two
  is the smallest number that shows the thing is a list.
- **D2 — Shorten the geo prose rather than move or hide it.** It is an Article V
  acceptance criterion and `003 AR-5` fixes its position. Its length is not part of
  either requirement; its meaning is.
- **D3 — The category filter scrolls rather than wraps at narrow width.** Wrapping
  costs a whole row of vertical space and gets worse as categories are added.

## Open questions

None.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
