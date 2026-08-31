# Tasks 002 — Widget Visual Redesign

**Status:** Approved 2026-08-31
**Plan:** ./plan.md (approved 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first.

**Article VII (test-first) applies.** Binding work is split into a **RED** task (write the failing check that states the requirement) and a **GREEN** task (implement until it passes). Tasks marked **(exempt)** name an Article VII exempt category. A RED task's Verify line requires the check to fail *for the right reason* — a real assertion, not a missing import or a browser that never started.

**Two suites, two roles.** `npm test` (jsdom, 135 tests today) is the *behavior* gate and must stay green **unmodified** throughout — a test that has to change signals a behavior change, which is out of scope. `npm run test:visual` (Playwright) is the *appearance* gate this feature builds; jsdom cannot judge visibility, size or contrast.

Sequencing: the verification harness comes first, because every later task is judged by it and a harness written after the fact tends to be written to pass. The riskiest surface (VR-2's confirmation) is done before the cosmetic ones, and the queryable-contract change (T7) is isolated into its own task so a broken row contract cannot hide inside a restyle.

## Phase 1 — The gate that judges everything else

- [x] T1. **(exempt — dependency configuration)** Add `@playwright/test` and `@axe-core/playwright` pinned exact; add `npm run test:visual` running against a production build; add a CI job installing chromium. Confirm the cached browser is used rather than downloading one.
      Verify: `npm run test:visual` starts a browser and reports 0 tests; `npm test` still 135/135; `npm run build` and `npm run lint` exit 0.
- [ ] T2. **RED** — write the VR-2/VR-3 visibility checks against the **current** UI: the five confirmation fields visible with a real bounding box and inside the viewport at 1280 and 390; the disclaimer visible with a suggestion; DEMO visible on control, result, balance, confirmation, position; the geo explanation visible beside the disabled control.
      Verify: the suite runs and **fails only where today's UI genuinely fails** (expected: 390px, which has no mobile layout yet). Any check that passes at 1280 today must be shown to fail when the guarantee is deliberately broken — hide one confirmation field and watch exactly that check go red.
- [ ] T3. **RED** — write the VR-4 (44px at 390) and VR-5 (axe `color-contrast`) checks against the current UI, plus the demo-colour-exclusivity check.
      Verify: each check fails against a deliberate break (shrink one control below 44px; set a body text colour to the failing `#6B7484`; paint a non-demo element with the demo token) and only that check.

## Phase 2 — Tokens and type

- [ ] T4. **(exempt — dependency configuration)** Replace the two webfonts via `next/font/google` with fallback stacks; keep them self-hosted.
      Verify: `npm run build` exits 0; no request to a Google domain in the built output; `npm test` unchanged at 135/135.
- [ ] T5. **(exempt — colour, type, spacing, radii as aesthetics)** Define the token set in a Tailwind `@theme` block, using the **plan's verified palette** — `#79828F` for dim, not the mockup's failing `#6B7484`.
      Verify: `npm run test:visual` contrast checks pass on every surface already styled; tokens resolve in both utility classes and raw CSS.

## Phase 3 — The confirmation (VR-2, highest stakes)

- [ ] T6. **GREEN** — restyle the confirmation and bet panel to the token set until T2's confirmation checks pass at both viewports, keeping all five fields simultaneously visible and the market question wrapped rather than clipped.
      Verify: `npm run test:visual` confirmation checks green at 1280 and 390; `npm test` still 135/135 **unmodified**; the Art. II bypass tests untouched.

## Phase 4 — The market list (VR-1)

- [ ] T7. **RED** — decide and pin the row's queryable contract *before* restructuring. Write the assertions the new row must satisfy: a market is selectable by an accessible role, its question is reachable as a heading-equivalent, and both volume fields plus the end date are present.
      Verify: the new assertions fail against a scratch row that omits them; the six existing assertions in `geo-degrade`/`demo-flow` and the `market-list` suite are all identified and listed in the task's commit message.
- [ ] T8. **RED** — failing tests for the outcome bar's geometry: segment widths are proportional to price, they sum to the full width, a single-outcome and a many-outcome market both render sanely, and a zero or missing price does not produce a NaN width.
      Verify: `npm test` fails on those assertions against a stub module.
- [ ] T9. **GREEN** — implement `lib/outcome-bar.ts` until T8 passes.
      Verify: `npm test` passes; the bar's widths for the fixture market match the displayed percentages.
- [ ] T10. **GREEN** — restructure the list into dense rows with the bar, satisfying T7. If the heading/`role="button"` contract changes, replace each affected assertion with an equivalent in **this** task, never delete one.
      Verify: `npm test` 135/135 with any changed assertion replaced one-for-one and named in the commit; `npm run test:visual` list checks green; no horizontal scroll at 390.

## Phase 5 — Assist, positions, shell (VR-3)

- [ ] T11. **GREEN** — restyle the assist panel, demo positions, geo notice, money-mode toggle, DEMO balance banner and bet-result notice to the token set until T2's remaining checks and T3's exclusivity check pass.
      Verify: `npm run test:visual` fully green at 1280; `npm test` still 135/135 unmodified.

## Phase 6 — Mobile (VR-4)

- [ ] T12. **RED** — failing tests for the mobile bet-sheet state machine: it opens on selecting a market at narrow widths, dismisses without placing anything, does not mount at desktop width, and renders the same `BetPanel` so `onPlace` keeps its single call site.
      Verify: `npm test` fails on those assertions, including one asserting no second confirmation component exists.
- [ ] T13. **GREEN** — implement the sheet until T12 passes and T2/T3's 390px checks are green.
      Verify: `npm test` passes; `npm run test:visual` green at 390 including 44px targets; the Art. II bypass tests still pass untouched.

## Phase 7 — Close out

- [ ] T14. **(not binding — documentation)** Write `manual-checks.md` listing every guarantee neither suite can judge, with steps. If the list is empty, say so explicitly rather than omitting the file.
      Verify: each listed check is performed once and its result recorded.
- [ ] T15. **(not binding — documentation)** Update README and CLAUDE.md for the new command and the two-suite split; confirm spec and plan still describe the system as built.
      Verify: a clean clone runs `npm test` and `npm run test:visual` from the README alone; `bash scripts/sdd-lint.sh` passes.
- [ ] T16. **(exempt — deployment)** Deploy and confirm the redesign in production at both viewports.
      Verify: the deployed URL serves the new UI; `/api/markets`, `/api/geo` and `/api/assist` still answer as before.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
