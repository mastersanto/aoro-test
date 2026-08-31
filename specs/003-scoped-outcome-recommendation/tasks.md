# Tasks 003 — Scoped Outcome Recommendation

**Status:** Complete 2026-08-31 — 20/20 tasks; deployed and verified in production
**Plan:** ./plan.md (approved 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first.

**Article VII (test-first) applies.** Binding work is a **RED** task (the failing check that states the requirement) then a **GREEN** task. **(exempt)** names an Article VII exempt category. A RED task must fail *for the right reason*, and a RED whose assertions already hold against shipped code is not a RED — it is a restatement, and the task says which clause is the new one.

**Three suites, all protected, and protection means the guarantee, not the count.**
`npm test` and `npm run test:visual` stay green with nothing deleted, skipped or weakened. An assertion that must change is replaced **with an equivalent assertion of the same guarantee**, in the same task, named in the commit — one-for-one preserves the count, not the protection. `manual-checks.md` records what neither suite can judge.

**No fixed test counts appear in a Verify line.** Earlier tasks in this list add tests to the same suites, so a count asserted later cannot be observed and rewards deleting what was just written. The check is instead: `git diff --name-only 62ee610..HEAD -- tests/` lists only files this feature adds — no pre-existing test file is modified.

**The defeat corpus** lives at `./defeat-corpus.md` and only grows. Passing it is necessary and not sufficient: a screen matching those strings alone would pass while remaining trivially defeatable, so each rule is also tested with **held-out sentences that appear nowhere in the corpus**.

Sequencing: the pure rules first, since they hold every binding decision and need no model call. Re-hydration next — the largest change to shipped behaviour, and everything after depends on prices being current. The route, then context, then the panel, whose Article II path gets a behaviour RED before any of it is built.

## Phase 1 — The rules, as pure functions

- [x] T1. **RED** — failing tests for the content screen (`lib/ai/content-screen.ts`) covering **every rule**, each with corpus sentences **and** held-out sentences written for this task and recorded nowhere else: no quantities (digits, percentages, currency, spelled-out); **no expression of likelihood, confidence or sufficiency of evidence, as word or construction**; **no claim the price is wrong, lagging or stale, in any wording**; no instruction to the user; no will/will-not claim; no stake reference; per-part length bounds. Also assert the accept case: two named compliant recommendations, fixed in this task, that the screen must pass — so a screen that refuses everything fails here rather than at implementation time.
      Verify: `npm test` fails on those assertions against a stub that accepts everything; each sentence is asserted individually so a failure names which got through; the held-out sentences are in the diff of *this* commit.
- [x] T2. **GREEN** — implement the screen until T1 passes. It returns a decision plus which rule fired, never a rewritten text.
      Verify: `npm test` passes; corpus and held-out sentences both rejected; both named compliant samples accepted.
- [x] T3. **RED** — failing tests for freshness (`lib/ai/recommendation.ts`): fresh within 2 points and 10 minutes; stale beyond 2 points either direction; expired past 10 minutes; closed when the market says so; the exact boundaries asserted; a missing or unusable current price never reads fresh.
      Verify: `npm test` fails on those assertions against a stub.
- [x] T4. **GREEN** — implement freshness until T3 passes.
      Verify: `npm test` passes; every state reachable in a test, none unreachable.

## Phase 2 — Current prices

- [x] T5. **RED** — failing tests for by-id re-hydration: the selected market refreshes on the list's cadence from its own endpoint; **absence from the list is never closure** (searching or filtering must not mark a market closed); closure only from the market's own flag; a failed refresh keeps the last good data rather than blanking the selection.
      Verify: `npm test` fails on those assertions. New clause, stated because no RED may hide behind shipped behaviour: re-hydration does not exist today, so these fail by absence — each must additionally be shown to fail against a *list-absence* implementation, which is the wrong design they exist to forbid.
- [x] T6. **GREEN** — implement `app/api/market/[id]` and re-hydration until T5 passes. **Amend feature 001's spec in this task**, not later: it describes a selected market that never refreshes, which stops being true here (Art. I, and plan.md's "amended in the same change").
      Verify: `npm test` passes; a live check in `tests/live/` returns the market with its `closed` flag; `npm run test:visual` green; `bash scripts/sdd-lint.sh` passes.
- [x] T7. **RED** — failing tests for re-hydration's hazards. **The new clause is the telling**: against shipped code a refreshed price already cannot reach an open dialog (the draft is frozen at review) and the remount key is the market id, which in-place refresh does not change — so those two are regression guards, and the assertions that must go red are that a moved price **is surfaced on the open confirmation and requires re-confirmation**, and that a market closing while a dialog is open **surfaces there** rather than unmounting it.
      Verify: `npm test` fails on the two new assertions; the two regression guards pass from the start and are labelled as such.
- [x] T8. **GREEN** — implement until T7 passes.
      Verify: `npm test` passes; the Article II bypass tests in `tests/components/bet-confirmation.test.tsx` are untouched; `git diff --name-only` shows no pre-existing test file modified.

## Phase 3 — The route

- [x] T9. **RED** — failing tests for `POST /api/recommend`: the market is re-fetched server-side, never trusted from the client; the favoured token must belong to it; the model's schema is **exactly the four named parts with no free-text and no numeric field**; `arguedAtPrice` is inserted by the route; **a response missing the counter-case is withheld** (AR-2), not shown one-sided; a screened-out candidate yields a withholding whose reason is app-authored and carries no fragment of the rejected text; regeneration at most once; never both or partial. Plus the **failure branch** (AR-1): market fetch failure, model error, unparseable response and missing key each map to a stated user-facing state, none leaking provider detail.
      Verify: `npm test` fails on those assertions with the model client mocked.
- [x] T10. **GREEN** — implement the route until T9 passes. Update `.env.example` in this task — its comment says the key serves only `/api/assist`, which this route falsifies.
      Verify: `npm test` passes; `npm run build` then `grep -r ANTHROPIC_API_KEY .next/static` finds nothing; a withheld response body contains no screened text.

## Phase 4 — Context and clearing

- [x] T11. **RED** — failing tests for the context rules: changing the selected market clears the previous recommendation; deselecting returns to discovery and clears it; the assistant's typed prompt survives while generated advice does not; **the bet amount never survives a market change**; a mode change clears the chosen outcome and typed amount; selecting a market clears discovery suggestions naming other markets; an in-flight response never renders against a market it was not asked about, or against no selection.
      Verify: `npm test` fails on those assertions, including one that resolves a stale request after the selection changed.
- [x] T12. **GREEN** — implement until T11 passes, touching `Widget.tsx`, `BetPanel.tsx` and `AssistPanel.tsx`.
      Verify: `npm test` passes; **the Article II bypass tests are untouched** — this task edits `BetPanel.tsx`, where those thirteen assertions bind; any replaced assertion is equivalent and named in the commit.

## Phase 5 — The panel

- [x] T13. **RED (behaviour)** — the Article II gate on the **new** AI→form path, which feature 001 has for discovery and this feature must not ship without: a recommendation never arms the bet form by appearing; acting on one is an explicit act that fills the outcome and **no amount**; the path reaches no `onPlace` without the existing confirmation; at most one mounted bet-entry surface and at most one confirmation. Plus: the recommendation **states which market it concerns**; it is available only when a market is selected; it is **attributed** as the assistant's reading of prices; it **remains available where real betting is disabled** (AR-5).
      Verify: `npm test` fails on those assertions.
- [x] T14. **RED (behaviour)** — the withdrawal *wiring*, distinct from T3's decision function: when freshness returns anything but `fresh`, the panel **removes the argument and shows the reason**. A component that computes `stale` and renders the argument anyway must fail here.
      Verify: `npm test` fails on those assertions.
- [x] T15. **RED (behaviour)** — the ordering and sheet state machine, in the behaviour suite as spec.md requires: the assistant leads for **each** of the four availability reasons; the sheet does not open over the assistant when the entry is not actionable; it closes if the entry stops being actionable while open; the matrix of selection × mode × region × market-restriction × wallet-readiness.
      Verify: `npm test` fails on those assertions.
- [x] T16. **RED (appearance)** — the counter-case co-visible with the case for at the same type size, never collapsed, truncated **or placed behind an interaction**; the disclaimer co-visible with a recommendation at both viewports; a withdrawal notice genuinely visible.
      Verify: `npm run test:visual` fails on each, and each is proven able to fail by a **named** break — collapse the counter-case behind a details element; shrink its type size; push the disclaimer below the fold at 390; suppress the withdrawal notice — with only the corresponding check going red.
- [x] T17. **GREEN** — implement `RecommendPanel` and the ordering until T13–T16 pass.
      Verify: both suites green; no pre-existing test file modified; the Article II bypass tests untouched.

## Phase 6 — Close out

- [x] T18. **(not binding — documentation)** Add AR-5's "suggests working around a regional restriction" to `manual-checks.md` with steps, since it has no mechanical enforcement, and record its result.
      Verify: the check is performed once and its result written down.
- [x] T19. **(not binding — documentation)** Update README and CLAUDE.md; confirm spec and plan describe the system as built.
      Verify: a clean clone runs `npm run verify` from the README alone; `bash scripts/sdd-lint.sh` passes.
- [x] T20. **(exempt — deployment)** Deploy; confirm the recommendation path in production at both viewports, including a withholding and a withdrawal.
      Verify: `PROD_URL=… npm run test:visual` green against the deployment.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
