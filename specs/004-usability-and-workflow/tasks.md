# Tasks 004 — Usability and Workflow

**Status:** Approved 2026-08-31
**Plan:** ./plan.md (approved 2026-08-31)

Rules as in `001`: ordered, small, each with a `Verify:` line. **(exempt)** names an
Article VII exempt category; a **RED** task must fail on a real assertion, not an
import error.

Ordering: the pure modules first (they are the binding logic and need no UI), then
the components that render them, then the appearance gate. Each user story lands
whole before the next begins, so the work is releasable at every step.

## Phase 1 — Pagination and sorting (UX-1, UX-2)

- [ ] T1. **RED** — failing tests for `lib/market-page.ts`: `appendPage` drops a
      market already present and preserves first-seen order; `mergeRefresh`
      updates a loaded market's price in place and keeps markets the refresh did
      not mention (plan constraint 2).
      Verify: `npm test` fails on those assertions.
- [ ] T2. **GREEN** — implement `lib/market-page.ts` until T1 passes.
      Verify: `npm test` passes.
- [ ] T3. **RED** — failing tests for `lib/market-sort.ts` and the sort parameter:
      every option maps to an `order`/`ascending` pair; an unknown sort id falls
      back to the default rather than reaching the upstream query; `fetchMarkets`
      sends the chosen order; `/api/markets` keys its cache on sort, so two sorts
      do not serve each other's page.
      Verify: `npm test` fails on those assertions.
- [ ] T4. **GREEN** — implement `lib/market-sort.ts`, extend `fetchMarkets` with
      `order`/`ascending`, and pass `sort` through `/api/markets` until T3 passes.
      Verify: `npm test` passes; `curl 'localhost:3000/api/markets?sort=ending-soon'`
      returns markets ordered by end date.
- [ ] T5. **RED** — failing component tests for the list: "Load more" appends a
      second page without dropping the first; it is absent when `nextCursor` is
      null; a second click while loading fires one request; changing search,
      category or sort clears the accumulated list and sends no stale cursor; a
      failed "Load more" keeps the loaded rows and shows a message.
      Verify: `npm test` fails on those assertions.
- [ ] T6. **GREEN** — implement pagination and the sort control in `MarketList`
      until T5 passes, including the search case: no "Load more", and sorting
      unavailable with a stated reason (plan constraint 1).
      Verify: `npm test` passes; in the browser, loading more appends rows, the
      scroll position holds, and changing sort reorders from the server.

## Phase 2 — Keyboard and focus (UX-3)

- [ ] T7. **RED** — failing tests for `lib/use-dialog.ts`: Escape calls the
      dismiss handler; focus moves into the container on open; Tab from the last
      focusable wraps to the first and Shift+Tab from the first wraps to the last;
      focus returns to the opener on close.
      Verify: `npm test` fails on those assertions.
- [ ] T8. **GREEN** — implement `lib/use-dialog.ts` until T7 passes.
      Verify: `npm test` passes.
- [ ] T9. **RED** — failing tests that the confirmation and the bet sheet use it,
      **and that Escape cancels rather than places** — extending the `001` T11
      bypass suite rather than editing it: Escape on the confirmation calls
      `onPlace` zero times, in demo and real mode alike (Art. II). The bet sheet
      exposes a dialog role and an accessible name.
      Verify: `npm test` fails on those assertions.
- [ ] T10. **GREEN** — apply the hook to `ConfirmBetDialog` and `BetSheet` until
      T9 passes.
      Verify: `npm test` passes, including every pre-existing `001` T11 test
      unmodified; in the browser both surfaces open, trap Tab, close on Escape,
      and return focus.

## Phase 3 — Demo position value (UX-4)

- [ ] T11. **RED** — failing tests for `lib/demo-valuation.ts` covering every row
      of the plan's table, and the totals. Explicitly: **a closed market quoting
      `["0","0"]` is `unresolved`, carries no value, and is excluded from the
      totals — never reported as a loss** (verified Gamma behaviour, spec Context);
      a missing quote is `unknown`, not zero; a closed market where the held
      outcome is ≥ 0.99 is `won`.
      Verify: `npm test` fails on those assertions.
- [ ] T12. **GREEN** — implement `lib/demo-valuation.ts` until T11 passes.
      Verify: `npm test` passes.
- [ ] T13. **RED** — failing tests for `GET /api/quotes`: several ids in one call;
      a 404 market is absent from the map rather than an error; the id count is
      capped; a cache hit inside the TTL; an upstream failure degrades without
      throwing.
      Verify: `npm test` fails on those assertions.
- [ ] T14. **GREEN** — implement `app/api/quotes/route.ts` until T13 passes.
      Verify: `npm test` passes; `curl 'localhost:3000/api/quotes?ids=<two ids>'`
      returns both.
- [ ] T15. **RED** — failing tests for `DemoPositions`: each position shows cost,
      current value and the difference; the totals row; an unresolved position
      reads as unresolved and is named in the excluded count; DEMO labelling is
      present on the values and the total (Art. V, `002` VR-3).
      Verify: `npm test` fails on those assertions.
- [ ] T16. **GREEN** — implement the valuation display and wire quoting into
      `Widget` on the existing 30-second cadence until T15 passes.
      Verify: `npm test` passes; in the browser a demo position's value tracks the
      live price and every figure reads DEMO.

## Phase 4 — Error recovery (UX-5)

- [ ] T17. **RED** — failing tests for retry: the assist panel's error offers a
      retry that re-sends the same prompt and does not clear the textarea; the
      recommendation panel's error offers one that re-requests; the market list's
      error offers one and states that it also retries by itself; a retry cannot
      double-fire while one is in flight.
      Verify: `npm test` fails on those assertions.
- [ ] T18. **GREEN** — implement the retry affordances until T17 passes.
      Verify: `npm test` passes; in the browser, with the network stopped, each
      failure offers a retry that works once the network returns.

## Phase 5 — Gates

- [ ] T19. **(exempt — styling and layout)** Appearance checks for everything new:
      the sort control, "Load more", the retry buttons and the position values —
      genuinely visible, 44px targets, AA contrast including the DEMO tint, not
      clipped, at both viewports. Add the `/api/quotes` route to `stubApi`, which
      otherwise lets the visual suite reach the live exchange (the failure `003`
      already caused once).
      Verify: `npm run test:visual` passes at both viewports.
- [ ] T20. **(not binding — documentation)** Update `README.md` and the `001`
      spec where `004` changes what it describes; confirm the three specs still
      describe the system as built.
      Verify: `npm run verify` green; `bash scripts/sdd-lint.sh` passes.
- [ ] T21. **(not binding — verification)** Prove the new tests can fail: three
      deliberate mutations, each turning exactly one test red — remove the
      `appendPage` de-duplication; map Escape to confirm instead of cancel; treat
      an unresolved closed market as a loss.
      Verify: each mutation reddens exactly the expected test, and reverting
      returns the suite to green.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
