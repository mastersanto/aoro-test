# Tasks 002 — Widget Visual Redesign

**Status:** Approved 2026-08-31 (revised after the constitution audit, then re-approved)
**Plan:** ./plan.md (approved 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first.

**Article VII (test-first) applies.** Binding work is split into a **RED** task (write the failing check that states the requirement) and a **GREEN** task (implement until it passes). Tasks marked **(exempt)** name an Article VII exempt category. A RED task's Verify line requires the check to fail *for the right reason* — a real assertion, not a missing import or a browser that never started.

**Two suites, two roles, both protected.**
- `npm test` (jsdom) is the *behavior* gate. It must stay green with **no test deleted, skipped or weakened**. Its count only grows; a task that needs an existing assertion changed may replace it one-for-one with an equivalent, in that same task, named in the commit message.
- `npm run test:visual` (Playwright) is the *appearance* gate this feature builds. **The same protection applies to it.** A GREEN task may not relax, delete or re-scope a check written by the RED task that gates it — if a selector must change because the markup changed, it is replaced with an equivalent assertion of the same guarantee, in that task, named in the commit.
- `npm run verify` runs both. That is the project's normal verification command (VR-6), and both are required CI checks.

**Every visibility check means the same thing** (VR-2/VR-3, and the trap T1 documented): the element is `toBeVisible()`, **and** has a bounding box larger than a token size — `toBeVisible()` returns true for a 1×1 clipped `sr-only` element — **and** its box lies inside the viewport rect without scrolling, **at both 1280 and 390** unless a criterion names one. "Visible" never means "present in the DOM".

Sequencing: the gate comes first, because a gate written after the work it judges tends to be written to pass. The riskiest surface (VR-2) precedes the cosmetic ones, and the row's queryable contract (T7) is isolated so a broken contract cannot hide inside a restyle.

## Phase 1 — The gate that judges everything else

- [x] T1. **(exempt — dependency configuration)** Add `@playwright/test` and `@axe-core/playwright` pinned exact; two viewport projects (1280, 390) against a production build; a CI job installing chromium; `npm run test:visual`. Ship harness self-tests proving the browser measures a real bounding box, applies the cascade, and that `toBeVisible()` alone passes on a clipped `sr-only` element.
      Verify: the three self-tests pass in both projects; `npm test` green and exit 0; lint and build 0. *(Done: also fixed vitest collecting the Playwright specs, which made `npm test` exit 1 while printing "135 passed".)*
- [x] T2. **RED** — the VR-2/VR-3 visibility checks, against the current UI, every one using the full definition above at **both** viewports: the five confirmation fields; the market question **rendered in full, not clipped or ellipsised** (assert the element's `scrollWidth` does not exceed its `clientWidth`, since `truncate` leaves the full text in the DOM and every text assertion still passes); the disclaimer together with a suggestion; DEMO on control, result, balance, confirmation and position; the geo explanation beside the disabled control. Stub `/api/assist` and `/api/geo` with Playwright routing so the suite needs no API key and no live model call.
      Verify: each check is proven able to fail by a deliberate break — hide a field, add `truncate` to the question, push the disclaimer below the fold at 390, remove a DEMO label — and **only** the corresponding check goes red.
- [x] T3. **RED** — the VR-4/VR-5/VR-3 measurement checks against the current UI: every interactive element ≥44px tall at 390; **no horizontal scrolling at 390** (`document.scrollingElement.scrollWidth <= clientWidth`); axe `color-contrast` clean on each surface; the demo colour appears in no non-demo element's computed style; and **outcome identity is not colour-alone** — each outcome's visible text carries its label, in full (not abbreviated) in the bet panel and confirmation.
      Verify: each check fails against its own deliberate break (shrink a control; widen a row past 390; set body text to the failing `#6B7484`; paint a non-demo element with the demo token; replace an outcome label with `Y`) and only that check.

## Phase 2 — Tokens and type

- [x] T4. **(exempt — dependency configuration)** Replace the two webfonts via `next/font/google`, self-hosted, each with a fallback stack.
      Verify: build 0; no Google domain in the built output; `npm test` green; **and** a visual check that blocks the font files and asserts the layout still holds — no horizontal scroll, no control below 44px — so VR-5's fallback criterion is exercised rather than asserted.
- [x] T5. **(exempt — spacing, radii and colour *choices*; the meaning-carrying values are gated by T2/T3)** Define the token set in a Tailwind `@theme` block using the plan's verified palette.
      Verify: a unit test asserts each token's value and that no token equals the rejected `#6B7484`, computing the contrast of every text-on-surface pair against its background and requiring ≥4.5 (≥3 for large) — so the palette is checked by arithmetic, not by "already-styled surfaces", of which there are none at this point.

## Phase 3 — The confirmation (VR-2, highest stakes)

- [x] T6. **GREEN** — restyle the confirmation and bet panel to the tokens until T2's confirmation, question-not-clipped and outcome-label checks pass at both viewports.
      Verify: those checks green; `npm test` green with nothing deleted or skipped; the Art. II bypass tests untouched.

## Phase 4 — The market list (VR-1)

- [x] T7. **RED** — pin the row's queryable contract *and* its state surfaces before restructuring: a market is selectable by an accessible role; its question is reachable as a heading-equivalent; both volume fields and the end date are present; **the selected row is distinguishable by more than colour** (an accessible state, asserted); and the loading, empty, error and stale rows are each *visible* by the full definition in the new layout.
      Verify: the assertions fail against a scratch row omitting each; the six existing assertions in `geo-degrade`/`demo-flow` plus the `market-list` suite are enumerated in the commit message.
- [x] T8. **RED** — failing tests for the outcome bar's geometry: widths proportional to price, summing to the full width; single-outcome and many-outcome markets render sanely; a zero or missing price yields no NaN width.
      Verify: `npm test` fails on those assertions against a stub module.
- [x] T9. **GREEN** — implement `lib/outcome-bar.ts` until T8 passes.
      Verify: `npm test` green; the bar's widths for the fixture market match the displayed percentages.
- [x] T10. **GREEN** — restructure the list into dense rows with the bar, satisfying T7. If the heading/`role="button"` contract changes, replace each affected assertion with an equivalent in **this** task, never delete one.
      Verify: `npm test` green with no test deleted or skipped and every replacement named in the commit; T7's and T3's list-related checks green; no horizontal scroll at 390.

## Phase 5 — Assist, positions, shell (VR-3)

- [x] T11. **GREEN** — restyle the assist panel, demo positions, geo notice, money-mode toggle, DEMO balance banner and bet-result notice to the tokens until T2's and T3's remaining checks pass.
      Verify: the visual suite green at **both** viewports; `npm test` green with nothing deleted or skipped.

## Phase 6 — Mobile (VR-4)

- [x] T12. **RED** — failing tests for the mobile bet-sheet state machine: opens on selecting a market at narrow widths; dismisses without placing anything; does not mount at desktop width; renders the same `BetPanel` so `onPlace` keeps its single call site; no second confirmation component exists. Plus a visual check that **bet entry is reachable without scrolling past the whole market list** at 390.
      Verify: `npm test` fails on those assertions, and the reachability check fails against a layout that buries the panel below the list.
- [ ] T13. **GREEN** — implement the sheet until T12 passes and every 390px check from T2/T3 is green.
      Verify: `npm test` green; visual suite green at 390 including 44px and no horizontal scroll; the Art. II bypass tests untouched.

## Phase 7 — Close out

- [ ] T14. **(not binding — documentation)** Write `manual-checks.md` listing every guarantee neither suite can judge, with steps — including "no painted device chrome" (VR-4), which no automated check covers. If the list is empty, say so explicitly rather than omitting the file.
      Verify: each listed check is performed once and its result recorded.
- [ ] T15. **(not binding — documentation)** Add `npm run verify` (both suites), make both CI jobs required, and update README and CLAUDE.md for the two-suite split; confirm spec and plan still describe the system as built.
      Verify: a clean clone runs `npm run verify` from the README alone and both suites execute; `bash scripts/sdd-lint.sh` passes.
- [ ] T16. **(exempt — deployment)** Deploy and confirm the redesign in production at both viewports.
      Verify: the deployed URL serves the new UI; `/api/markets`, `/api/geo` and `/api/assist` still answer as before.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
