# Tasks 005 — Decision Rail

**Status:** Complete 2026-08-31 — 11/11.

**Mutation results (T11):** a non-actionable bet entry keeping its controls reddens
7; restoring AR-7's conditional ordering reddens 2; unmounting the confirmation when
the market closes reddens 1.

The fourth — restating the question inside the recommendation — came back **green**,
and the mutation had genuinely applied. The DR-3 test was matching the question as an
exact text node, so a restatement wrapped in other words ("About: <question>") went
straight past it; the earlier check that "proved" the test worked had used a mutation
that happened to put the question in its own element. The assertion now counts
occurrences in the rail's text, and the mutation reddens it.
**Plan:** ./plan.md

Rules as in `001`. **(exempt)** names an Article VII exempt category; a **RED** task
must fail on a real assertion, not an import error.

## Phase 1 — The fixed order and the AR-7 replacement

- [x] T1. **RED** — failing tests that `BetPanel` renders **no outcome control, no
      amount field and no review control** when the bet cannot be acted on, for every
      reason the app recognises (no market, market closed, region blocked, market
      restricted, real-money mode in a demo-only build) — and that it still states the
      reason. Replaces `003 AR-7`'s ordering assertions in the same file.
      Verify: `npm test` fails on those assertions.
- [x] T2. **GREEN** — implement the branch in `BetPanel` until T1 passes.
      Verify: `npm test` passes; the `001` T11 bypass suite is unmodified and green.
- [x] T3. **RED** — failing tests that the rail's document order is
      market → bet → advisor → positions and **does not change** across the states
      AR-7 used to reorder for; and that the market question appears exactly once.
      Verify: `npm test` fails on those assertions.
- [x] T4. **GREEN** — add `SelectedMarketCard`, remove `BetPanel`'s repetition of the
      question, and fix the rail order in `Widget` until T3 passes.
      Verify: `npm test` passes.

## Phase 2 — Layout, the finder, and the sheet

- [x] T5. **RED** — failing tests that no overlay is mounted at 390px, that the bet
      entry precedes the advisor and the list in document order at both widths, and
      that the confirmation is still the only modal with its bypass guarantees.
      Replaces `002 VR-4`'s sheet assertions in the same file.
      Verify: `npm test` fails on those assertions.
- [x] T6. **GREEN** — put the rail first in a `[22rem, 1fr]` grid, delete `BetSheet`
      and `sheetOpen`, and scroll the rail into view on selection, until T5 passes.
      Verify: `npm test` passes.
- [x] T7. **RED** — failing tests that the finder renders in the list column and that
      the "not financial advice" disclaimer is still present with the suggestions it
      qualifies **at the new position** (Art. V).
      Verify: `npm test` fails on those assertions.
- [x] T8. **GREEN** — move `AssistPanel` into the list column until T7 passes.
      Verify: `npm test` passes.

## Phase 3 — Gates

- [x] T9. **(exempt — styling and layout)** Appearance checks for the new layout at
      both viewports: the rail's four sections genuinely visible in order, the
      disclaimer co-visible with suggestions at the finder's new home, the geo
      explanation still visible beside the mode toggle, 44px targets and AA contrast
      unchanged. Update `openConfirmation` in `tests/visual/support.ts` if the path to
      the confirmation changed.
      Verify: `npm run test:visual` passes at both viewports.
- [x] T10. **(not binding — documentation)** Record the `003 AR-7` and `002 VR-4`
      amendments in those specs; update `README.md` and `CLAUDE.md`.
      Verify: `npm run verify` green; `bash scripts/sdd-lint.sh` passes.
- [x] T11. **(not binding — verification)** Three mutations, each reddening exactly the
      expected test: restore AR-7's conditional ordering; give a non-actionable bet
      entry its controls back; re-introduce the question inside `BetPanel`.
      Verify: each reddens the expected test; reverting returns the suite to green.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
