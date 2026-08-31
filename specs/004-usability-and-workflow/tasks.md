# Tasks 004 — Usability and Workflow

**Status:** Approved 2026-08-31 (revised after constitution audit, same day)
**Plan:** ./plan.md (approved 2026-08-31, revised 2026-08-31)

Rules as in `001`: ordered, small, each with a `Verify:` line. **(exempt)** names an
Article VII exempt category; a **RED** task must fail on a real assertion, not an
import error.

Ordering: pure modules first (binding logic, no UI), then the components, then the
gates. Each story lands whole before the next begins.

## Phase 1 — Pagination and sorting (UX-1, UX-2)

- [x] T1. **RED** — failing tests for `lib/market-page.ts`: `appendPage` drops a
      market already present and preserves first-seen order; `mergeRefresh`
      updates a loaded market in place and keeps markets the refresh did not
      mention (plan constraint 2).
      Verify: `npm test` fails on those assertions.
- [x] T2. **GREEN** — implement `lib/market-page.ts` until T1 passes.
      Verify: `npm test` passes.
- [x] T3. **RED** — failing tests for `lib/market-sort.ts` and the sort parameter:
      every option maps to an `order`/`ascending` pair; an unknown sort id falls
      back to the default rather than reaching the upstream query; `fetchMarkets`
      sends the chosen order; `/api/markets` keys its cache on sort.
      Verify: `npm test` fails on those assertions.
- [x] T4. **GREEN** — implement `lib/market-sort.ts`, extend `fetchMarkets`, and
      pass `sort` through `/api/markets` until T3 passes.
      Verify: `npm test` passes.
- [x] T5. **RED** — failing tests for paginated search: `searchMarkets` requests a
      page and reports whether more exist, and `/api/markets?q=` returns a
      `nextCursor` that carries the page number rather than the hardcoded `null`
      it returns today. Both paginate; only the route knows which is which.
      Verify: `npm test` fails on those assertions.
- [x] T6. **GREEN** — implement search pagination until T5 passes.
      Verify: `npm test` passes; `curl 'localhost:3000/api/markets?q=trump'`
      returns a non-null `nextCursor`, and following it returns different markets.
- [x] T7. **RED** — failing component tests for the list: "Load more" appends
      without dropping what is shown, while browsing **and** while searching; it
      is absent when nothing more exists; a second press in flight fires one
      request; changing search, category or sort clears the list and sends no
      stale cursor; the 30-second refresh does not truncate later pages; a failed
      load keeps the rows and explains.
      Verify: `npm test` fails on those assertions.
- [x] T8. **GREEN** — implement pagination and the sort control in `MarketList`
      until T7 passes, including sorting unavailable during search with a stated
      reason (plan constraint 1).
      Verify: `npm test` passes; in the browser, loading more appends rows and
      changing sort reorders from the server.

## Phase 2 — Keyboard and focus (UX-3)

- [x] T8b. **(discovered at T6 — belongs to Phase 1; listed here because it was
      found after Phase 1 was checked off, and moving it would rewrite history)** `searchMarkets` changed
      shape from `Market[]` to `{markets, hasMore}`. `app/api/assist/route.ts:93`
      consumed it as an array, so AI suggestions would have silently lost every
      searched candidate — and the assist tests mock `searchMarkets`, so they
      stayed green. Fixed, with a test that fails against the array assumption.
      This is the second exception to D1's "existing tests pass unmodified": four
      call sites were updated for the new shape. **Done.**
      Verify: reverting the route fix reddens 8 assist tests.
- [x] T9. **RED** — failing tests for `lib/use-dialog.ts`: Escape dismisses; focus
      moves in on open; Tab and Shift+Tab wrap within; focus returns to the opener
      on close; **and with two open, only the topmost handles Escape and traps
      focus** — the nesting that exists at mobile width (plan constraint 6).
      Verify: `npm test` fails on those assertions.
- [x] T10. **GREEN** — implement `lib/use-dialog.ts`, including the open-dialog
      stack, until T9 passes.
      Verify: `npm test` passes.
- [x] T11. **RED** — failing tests that both surfaces use it: Escape on the
      confirmation calls `onPlace` **zero** times in demo and real mode (Art. II,
      extending the `001` T11 bypass suite rather than editing it); the sheet
      exposes a dialog role and an accessible name; the sheet is not `aria-modal`
      while the confirmation above it is; **exactly one confirmation is present at
      mobile width** — the replacement for `003 AR-4`'s dialog count.
      Verify: `npm test` fails on those assertions.
- [x] T12. **GREEN** — apply the hook to `ConfirmBetDialog` and `BetSheet`; replace
      the `mobile-sheet.test.tsx:111` dialog count with the confirmation count in
      the same change, and record the amendment in `003`'s spec.
      Verify: `npm test` passes, including every other pre-existing `001`/`003`
      test unmodified; in the browser both surfaces trap Tab, close on Escape and
      return focus, and Escape over the confirmation places nothing.

## Phase 3 — Demo position value (UX-4)

- [x] T13. **RED** — failing tests for `lib/demo-valuation.ts` covering **every row
      of the plan's table** and the totals. Explicitly: a closed market quoting
      `["0","0"]` is `unresolved`, carries no value and is excluded from the totals
      — **never a loss**; a missing quote, a stale quote and a price outside 0–1
      are each `unvalued`, not zero; a closed market whose held outcome is ≥ 0.99
      is `won`; the totals state how many positions were excluded.
      Verify: `npm test` fails on those assertions.
- [x] T14. **GREEN** — implement `lib/demo-valuation.ts` until T13 passes.
      Verify: `npm test` passes.
- [x] T15. **RED** — failing tests for `GET /api/quotes`: several positions in one
      call; the price comes from the order book, not the market list (plan
      constraint 5); a 404 market is absent from the map rather than an error; one
      failed quote does not fail the response; the count is capped; a cache hit
      inside the TTL.
      Verify: `npm test` fails on those assertions.
- [x] T16. **GREEN** — implement `app/api/quotes/route.ts` until T15 passes.
      Verify: `npm test` passes; `curl` with two tokens returns both prices.
- [x] T17. **RED** — failing tests for `DemoPositions`: cost, current value and the
      difference per position; the totals with the excluded count; an unresolved
      position reads as unresolved; **the spendable balance is unchanged by
      valuation** (`001 US-3`, plan D4); DEMO labelling on every value, difference
      and total (Art. V, `002` VR-3).
      Verify: `npm test` fails on those assertions.
- [x] T18. **GREEN** — implement the valuation display and wire quoting into
      `Widget` on the existing 30-second cadence until T17 passes.
      Verify: `npm test` passes; in the browser a position's value tracks the book
      price, every figure reads DEMO, and the practice balance does not move.

## Phase 4 — Error recovery (UX-5)

- [x] T19. **RED** — failing tests: after a failure the assist and recommendation
      actions relabel as a retry and re-send the same request with the typed input
      intact; a retry in flight is disabled and labelled in progress; the market
      list offers a retry and states that it also retries by itself; **a failed
      bet placement offers no retry** and **the geo refusal offers no retry**
      (Art. II and Art. V, plan UX-5).
      Verify: `npm test` fails on those assertions.
- [x] T20. **GREEN** — implement the retry affordances until T19 passes.
      Verify: `npm test` passes; in the browser, with the network stopped, each
      recoverable failure offers a retry that works once it returns.

## Phase 5 — Article V regression and gates

- [ ] T21. **(regression assertions — not a RED/GREEN pair, and relabelled as such
      after audit: these are pre-existing invariants, and an assertion that a
      shipped invariant still holds cannot be red first)** The Article V surfaces
      004 crosses, asserted with 004's new states present: the geo explanation and
      the mode toggle stay **keyboard-reachable** while the sheet is open — not
      merely still positioned there, which is what the first version of this task
      said and which would not have caught the focus trap that shipped; real
      betting stays refused in a restricted region throughout; the disclaimer
      stays co-visible with suggestions after a retry **that succeeded** — an
      error state clears the suggestions, so asserting co-visibility during one
      asserts nothing.
      Verify: `npm test` passes; each assertion is mutation-checked in T24.
- [ ] T22. **(exempt — styling and layout)** Appearance checks for everything new:
      the sort control, "Load more", the retry labels and the position values —
      genuinely visible, 44px targets, AA contrast including the DEMO tint, not
      clipped, at both viewports; the focus ring visible on the new controls.
      **`stubApi` must be changed first, or the check is vacuous:** it fulfils
      `/api/markets` with `nextCursor: null`, so "Load more" never renders and a
      test asserting it looks right would pass without it existing. It also needs
      `/api/quotes`, which it does not route at all — the same omission `003`
      caused, which let the visual suite reach the live exchange.
      Verify: `npm run test:visual` passes at both viewports, and the "Load more"
      check fails when the control is removed.
- [ ] T23. **(not binding — documentation)** Record in
      `specs/002-widget-visual-redesign/manual-checks.md` the criteria neither
      suite can judge — that scroll position holds across "Load more" and that the
      focus order reads sensibly. Update `README.md` and confirm `001`/`003`
      describe the system as built.
      Verify: `npm run verify` green; `bash scripts/sdd-lint.sh` passes.
- [ ] T24. **(not binding — verification)** Prove the new tests can fail: six
      deliberate mutations, each reddening exactly the expected test — remove the
      `appendPage` de-duplication; map Escape to confirm instead of cancel; treat
      an unresolved closed market as a loss; let the refresh overwrite an advanced
      cursor; restore the focus trap on the bet sheet; price a closed market from
      the order book. The last three are the defects that shipped and were caught
      by audit rather than by tests, so each needs a test that would have caught it.
      Verify: each mutation reddens exactly the expected test; reverting returns
      the suite to green.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
