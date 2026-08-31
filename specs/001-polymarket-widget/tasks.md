# Tasks 001 — Polymarket Betting Widget with AI Assist

**Status:** Approved 2026-08-31 (revised for constitution Article VII, then re-approved)
**Plan:** ./plan.md (approved 2026-08-31, amended 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first. Load the `polymarket-api` skill before any task touching Polymarket.

**Article VII (test-first) applies.** Binding work is split into a **RED** task (write the failing test that states the requirement) and a **GREEN** task (implement until it passes). Tasks marked **(exempt)** name an Article VII exempt category — scaffolding, styling and layout, dependency configuration, deployment, or an exploratory spike. Tasks marked **(not binding)** fall outside the article entirely: documentation is neither business logic nor a safety invariant, so it needs no exemption. A RED task's Verify line requires the test to fail *for the right reason* (a real assertion, not an import or syntax error).

Sequencing follows spec.md's Context note: search (US-1) → demo bets (US-3) → AI assist (US-4) → geo (US-5) → real bets (US-2). Demo betting precedes AI assist because the assist UI pre-fills the bet form that demo betting builds. Value ships from Phase 2 onward, and the unverified pUSD approval flow (T21) is retired before any real-money UI exists.

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
- [x] T10. **GREEN** — implement `lib/polymarket/clob.ts` (wrapping a pinned `@polymarket/client`; `/price`, `/midpoint`, `/book`) and the payout helper until T9 passes.
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
- [ ] T16. **GREEN** — implement `POST /api/assist` (server-side Claude call, streaming, structured output constrained to supplied ids) until T15 passes.
      Verify: `npm test` passes; `grep -r ANTHROPIC_API_KEY .next/static` finds nothing (Art. IV).
- [ ] T17. **RED** — failing tests for the assist UI invariants: selecting a suggestion only pre-fills the Phase 3 bet form and reaches no submission path (Art. II); the "not financial advice" disclaimer renders whenever suggestions render (Art. V).
      Verify: `npm test` fails on those assertions.
- [ ] T18. **GREEN** — implement the assist UI (prompt box, streamed suggestions with reasoning and live price, disclaimer, pre-fill wiring) until T17 passes; styling itself is exempt.
      Verify: `npm test` passes; in the browser a query streams suggestions with prices and a visible disclaimer, and selecting one places no order.

## Phase 5 — Geo compliance (US-5)

- [ ] T19. **RED** — failing tests for geo gating (Art. V): a restricted region disables real-bet controls with an explanation while browse, AI, and demo stay available; Gamma's per-market `restricted` flag is honored; an unrestricted region leaves betting enabled.
      Verify: `npm test` fails on those assertions.
- [ ] T20. **GREEN** — implement `GET /api/geo` plus the client-side pre-trade `polymarket.com/api/geoblock` check and UI gating until T19 passes.
      Verify: `npm test` passes; with a simulated restricted region the browser disables real betting with an explanation and US-1/US-3/US-4 still work.

## Phase 6 — Real betting (US-2)

- [ ] T21. **(exempt — exploratory spike; plan Risk 1)** Validate the pUSD allowance/approval flow and one minimal real order end-to-end from a non-restricted region; replace the UNVERIFIED note in `.claude/skills/polymarket-api/SKILL.md` with the confirmed flow (approval target contract, decimals, order params) and update plan.md if it differs. Spike code is throwaway — it must not be promoted into a shipped path without passing through T11/T12.
      Verify: one real order fills on-chain; the skill file states the confirmed approval targets and steps. **Blocks T22–T29.**
- [ ] T22. **RED** — failing tests for credential safety (Art. III/IV): derived L2 credentials and signatures never appear in a server-bound request payload or server log; and for the failure taxonomy → user-message mapping (insufficient balance, insufficient allowance, rejected signature, geo rejection, network error).
      Verify: `npm test` fails on those assertions.
- [ ] T23. **GREEN** — implement wallet connect (wagmi + viem, Polygon) and CLOB auth: L1 EIP-712 signature → derived L2 credentials (signatureType EOA=0), client-side only, until the T22 credential tests pass.
      Verify: `npm test` credential tests pass; connecting a test wallet derives credentials in the browser with nothing sensitive in server logs.
- [ ] T24. **RED** — failing tests for the pUSD allowance state machine (plan amendment 2): insufficient allowance is detected before submitting, an approve step is offered and retried after success, a sufficient allowance skips approval, and a rejected approval leaves funds untouched.
      Verify: `npm test` fails on those assertions.
- [ ] T25. **GREEN** — implement the allowance check and approve step until T24 passes, using the target confirmed by T21.
      Verify: `npm test` passes; a first-time funded wallet can approve and proceed without leaving the widget.
- [ ] T26. **RED** — failing tests for order construction: amount and outcome map to correct FOK/FAK buy parameters (size, price, tick rounding, min size), and a fill response maps to the rendered position.
      Verify: `npm test` fails on those assertions against a recorded CLOB fixture.
- [ ] T27. **GREEN** — implement real order placement until T26 passes: the constructed order is signed by the user's wallet and submitted from the client only after the T12 confirmation.
      Verify: `npm test` passes; a small real bet from a non-restricted region fills and the resulting position renders. Extend the T11 confirmation-bypass and T19 geo-gating suites to cover this real submit path.
- [ ] T28. **GREEN** — implement failure handling until the T22 mapping tests pass: each failure surfaces its plain-language message with funds untouched and no partial state.
      Verify: `npm test` passes; each failure is exercised or simulated in the browser and shows its message.

## Phase 7 — Ship

- [ ] T29. **(exempt — deployment)** Deploy to Vercel with `ANTHROPIC_API_KEY` set in project env; confirm preview and production builds.
      Verify: the deployed URL serves the widget; browse, AI assist, and demo mode work in production; the key is absent from the client bundle.
- [ ] T30. **(not binding — documentation)** Update README (what it does, how to run locally, demo-mode note, live URL, and the Netlify fallback the plan commits to) and confirm spec/plan still describe the system as built.
      Verify: a clean clone can follow the README to a running dev server; `bash scripts/sdd-lint.sh` passes.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31, including the reading that documentation tasks fall outside Article VII's binding scope
