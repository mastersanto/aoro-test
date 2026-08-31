# Tasks 001 — Polymarket Betting Widget with AI Assist

**Status:** Approved 2026-08-31 — complete at 24 of 24. Phase 6 (T21–T28) removed 2026-08-31 with US-2's withdrawal; see below.
**Plan:** ./plan.md (approved 2026-08-31, amended 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first. Load the `polymarket-api` skill before any task touching Polymarket.

**Article VII (test-first) applies.** Binding work is split into a **RED** task (write the failing test that states the requirement) and a **GREEN** task (implement until it passes). Tasks marked **(exempt)** name an Article VII exempt category — scaffolding, styling and layout, dependency configuration, deployment, or an exploratory spike. Tasks marked **(not binding)** fall outside the article entirely: documentation is neither business logic nor a safety invariant, so it needs no exemption. A RED task's Verify line requires the test to fail *for the right reason* (a real assertion, not an import or syntax error).

Sequencing follows spec.md's Context note: search (US-1) → demo bets (US-3) → AI assist (US-4) → geo (US-5). *(The sequence originally ended with real bets (US-2), deliberately last so the unverified pUSD approval flow was retired before any real-money UI existed. That ordering turned out to be the right call for the opposite reason to the one intended: US-2 was withdrawn, and because it had been sequenced last, nothing shipped depended on it.)*

## Phase 1 — Scaffold and test harness

- [x] T1. **(exempt — scaffolding)** Scaffold Next.js (App Router) + TypeScript + Tailwind at the repo root; pin exact versions; preserve the existing `.gitignore`, `README.md`, `CLAUDE.md`, and `.env.example`.
      Verify: `npm run dev` serves localhost:3000; `npm run build` and `npm run lint` exit 0.
- [x] T2. **(not binding — documentation)** *(executed after T3 — it documents the test commands T3 creates)* Replace the "Commands" section of CLAUDE.md with the real dev/build/lint/test commands, including how to run a single test.
      Verify: every command listed runs successfully from a clean checkout.
- [x] T3. **(exempt — dependency configuration)** Add Vitest plus a DOM environment (jsdom) and `@testing-library/react` — the render-dependent RED tasks (T11, T13, T17, T19, T26) assert on rendered components and cannot run without them — with one smoke test and one trivial component render; wire `npm test` and single-test invocation.
      Verify: `npm test` passes including the component render; running one test by name passes.

## Phase 2 — Market discovery (US-1)

- [x] T4. **RED** — failing tests for Gamma normalization: `outcomes`, `outcomePrices`, and `clobTokenIds` arrive as JSON-encoded strings and must become real arrays; keyset cursor handling; malformed payload rejected.
      Verify: `npm test` fails on those assertions (not on imports), against a recorded Gamma fixture.
- [x] T5. **GREEN** — implement `lib/polymarket/gamma.ts` (keyset endpoints only; no offset endpoints) until T4 passes.
      Verify: `npm test` passes; a live call returns open markets ordered by 24h volume.
- [x] T6. **RED** — failing tests for `/api/markets` behavior: cache hit within the TTL, graceful degradation on 429, search and tag params passed through.
      Verify: `npm test` fails on those assertions.
- [x] T7. **GREEN** — implement `GET /api/markets` until T6 passes.
      Verify: `npm test` passes; `curl localhost:3000/api/markets` returns normalized open markets; `?q=` narrows them.
- [x] T8. **(exempt — styling and layout)** Market list: title, outcomes with prices, volume, end date; search box and category filter; refresh without full page reload. Filter/search state that becomes non-trivial gets its own RED task instead.
      Verify: in the browser, search narrows the list and prices refresh without a reload, with no wallet or sign-in (US-1).

## Phase 3 — Prices, bet panel, demo mode (US-3)

- [x] T9. **RED** — failing tests for the CLOB read-only price module and payout math (best ask → estimated payout, rounding, zero and edge amounts).
      Verify: `npm test` fails on those assertions against a recorded fixture.
- [x] T10. **GREEN** — implement `lib/polymarket/clob.ts` (`/price`, `/midpoint`, `/book`) and the payout helper until T9 passes. *(As built: plain fetch, not `@polymarket/client` — plan Amendment 4. The SDK enters at T27 for order signing.)*
      Verify: `npm test` passes; a live call returns a best ask for a known token id.
- [x] T11. **RED** — failing tests for the confirmation invariant (Art. II): the confirmation exposes market, outcome, amount, price, and estimated payout, and no submit path — demo or real — bypasses it.
      Verify: `npm test` fails on those assertions, including the bypass check.
- [x] T12. **GREEN** — implement the bet panel and confirmation modal until T11 passes.
      Verify: `npm test` passes; the modal renders all five fields.
- [x] T13. **RED** — failing tests for the demo-mode state machine: simulated balance starts at $1,000, debits on fill, resets per session, fills at the live best ask, and demo state is always flagged.
      Verify: `npm test` fails on those assertions.
- [x] T14. **GREEN** — implement demo mode until T13 passes, with unmistakable DEMO labeling on every bet-like control and result.
      Verify: `npm test` passes; in the browser a demo bet debits the balance, shows a position, needs no wallet, and every relevant control reads DEMO.

## Phase 4 — AI assistance (US-4)

- [x] T15. **RED** — failing tests for the grounding invariant (Art. II): every suggestion id returned by the assist route exists in the candidate set supplied to the model, and a model response naming an unknown id is rejected rather than surfaced.
      Verify: `npm test` fails on those assertions, including the unknown-id case.
- [x] T16. **GREEN** — implement `POST /api/assist` (server-side Claude call, structured output constrained to supplied ids) until T15 passes. *(As built: one-shot `messages.parse()`, not streaming — plan Amendment 5.)*
      Verify: `npm test` passes; `grep -r ANTHROPIC_API_KEY .next/static` finds nothing (Art. IV).
- [x] T17. **RED** — failing tests for the assist UI invariants: selecting a suggestion only pre-fills the Phase 3 bet form and reaches no submission path (Art. II); the "not financial advice" disclaimer renders whenever suggestions render (Art. V).
      Verify: `npm test` fails on those assertions.
- [x] T18. **GREEN** — implement the assist UI (prompt box, suggestions with reasoning and live price, disclaimer, pre-fill wiring) until T17 passes; styling itself is exempt.
      Verify: `npm test` passes; in the browser a query streams suggestions with prices and a visible disclaimer, and selecting one places no order.

## Phase 5 — Geo compliance (US-5)

- [x] T19. **RED** — failing tests for geo gating (Art. V): a restricted region disables real-bet controls with an explanation while browse, AI, and demo stay available; Gamma's per-market `restricted` flag is honored; an unrestricted region leaves betting enabled.
      Verify: `npm test` fails on those assertions.
- [x] T20. **GREEN** — implement `GET /api/geo` and UI gating until T19 passes. *(As built: the server-side region check gates the control via `lib/betting-availability.ts`. Polymarket's own `polymarket.com/api/geoblock` call is a pre-trade check with no trade to precede yet, so it moved to T27 — see plan Amendment 6.)*
      Verify: `npm test` passes; with a simulated restricted region the browser disables real betting with an explanation and US-1/US-3/US-4 still work.

## ~~Phase 6 — Real betting (US-2)~~ — **REMOVED 2026-08-31**

US-2 was withdrawn by the project owner; see `spec.md`'s Scope change. T21–T28 are
removed rather than left permanently unchecked, so `/sdd-status` stops reporting a
next action that will never be taken.

They were: T21, the pUSD allowance/approval spike (blocking); T22/T23, credential
safety and wallet connect; T24/T25, the allowance state machine; T26/T27, order
construction and placement; T28, failure handling.

**Why they could not simply be finished.** T21 cannot be completed read-only — the
docs do not name the approval target, and determining it needs a funded wallet on
Polygon in a non-restricted region. The US, where this is built and deployed, is
close-only on Polymarket's main exchange. The blocker was jurisdictional.

**What was salvaged rather than lost.** The contract addresses T21 did confirm
on-chain, and pUSD's 6-decimal precision, stay recorded in
`.claude/skills/polymarket-api/SKILL.md` — they were verified read-only and remain
true whoever picks this up. The still-UNVERIFIED approval target is marked as such
there, which is the honest state to leave it in.

## Phase 7 — Ship

- [x] T29. **(exempt — deployment)** Deploy to Vercel with `ANTHROPIC_API_KEY` set in project env; confirm preview and production builds.
      Verify: the deployed URL serves the widget; browse, AI assist, and demo mode work in production; the key is absent from the client bundle.
- [x] T30. **(not binding — documentation)** Update README (what it does, how to run locally, demo-mode note, live URL, and the Netlify fallback the plan commits to) and confirm spec/plan still describe the system as built.
      Verify: a clean clone can follow the README to a running dev server; `bash scripts/sdd-lint.sh` passes.

## Phase 8 — follow-up (discovered after Phase 7)

- [x] T31. **(exempt — retroactive coverage of shipped behavior; Art. VII binds new logic, not backfill)** Add component tests for the market list and card: content contract including both volume fields, loading/empty/stale/error states, debounced search, category filter toggle, the stale-response race guard, and selection. Found while drafting feature 002, whose redesign restructures exactly this surface — without these, the "001 tests are the regression gate" claim was false here.
      Verify: `npm test` passes; each of three deliberate mutations (removing the race guard, dropping the total-volume field, leaking upstream detail into an error message) turns exactly one test red.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31, including the reading that documentation tasks fall outside Article VII's binding scope
