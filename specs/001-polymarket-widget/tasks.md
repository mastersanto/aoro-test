# Tasks 001 — Polymarket Betting Widget with AI Assist

**Status:** Approved 2026-08-31
**Plan:** ./plan.md (approved 2026-08-31)

Rules: tasks are ordered, small, and each states its verification. Check off items as they land; if a task turns out wrong, fix plan.md first. Load the `polymarket-api` skill before any task touching Polymarket.

Sequencing rationale: browse (US-1) → AI assist (US-4) → demo betting (US-3) → real betting (US-2) ships user-visible value from Phase 2 onward and retires the riskiest unknown (pUSD approvals, T14) before any real-money UI is built. Geo (US-5) lands before real betting, since it gates it.

## Phase 1 — Scaffold

- [ ] T1. Scaffold Next.js (App Router) + TypeScript + Tailwind at the repo root; pin exact versions; keep the existing `.gitignore` entries.
      Verify: `npm run dev` serves the default page at localhost:3000; `npm run build` and `npm run lint` exit 0.
- [ ] T2. Replace the "Commands" section of CLAUDE.md with the real dev/build/lint/test commands (including how to run a single test), per the harness rule.
      Verify: every command listed in CLAUDE.md runs successfully from a clean checkout.
- [ ] T3. Add the test runner (Vitest + a single smoke test) and wire `npm test` / single-test invocation.
      Verify: `npm test` passes; running one test by name passes.

## Phase 2 — Market discovery (US-1)

- [ ] T4. `lib/polymarket/gamma.ts`: typed client for Gamma keyset endpoints (`/markets/keyset`, `/public-search`, `/tags`) — normalizes the JSON-encoded `outcomes`/`outcomePrices`/`clobTokenIds` string fields into real arrays; no offset endpoints.
      Verify: unit test parses a recorded Gamma fixture into the normalized shape; a live call returns open markets ordered by 24h volume.
- [ ] T5. `GET /api/markets` route: proxies T4 with ~30s cache and 429-tolerant degradation; supports search query and tag filter.
      Verify: `curl localhost:3000/api/markets` returns normalized open markets; a repeat call inside 30s is served from cache (log or timing); `?q=` narrows results.
- [ ] T6. Market list UI: title, outcomes with prices, volume, end date; keyword search box and category filter; refresh without full page reload.
      Verify: in the browser, searching narrows the list and prices refresh without a reload; no wallet or sign-in involved (US-1).

## Phase 3 — AI assistance (US-4)

- [ ] T7. `POST /api/assist`: fetch candidate markets server-side, call Claude (`claude-opus-5`, streaming) with structured output constrained to the supplied market/outcome ids; `ANTHROPIC_API_KEY` read server-side only.
      Verify: a request returns suggestions whose ids all exist in the supplied candidate set; `grep -r ANTHROPIC_API_KEY .next/static` finds nothing (Article IV).
- [ ] T8. Assist UI: prompt box, streamed suggestions showing reasoning and each suggested outcome's live price, with the "not financial advice" disclaimer rendered alongside (Article V).
      Verify: in the browser, a query streams suggestions with prices and a visible disclaimer.
- [ ] T9. Wire suggestion selection to pre-fill the bet form only — no automatic submission (Article II).
      Verify: selecting a suggestion populates market/outcome/amount fields and places no order; a test asserts no order-submission path is reachable from the assist response handler.

## Phase 4 — Bet flow and demo mode (US-3)

- [ ] T10. `lib/polymarket/clob.ts`: read-only price access (`/price`, `/midpoint`, `/book`) behind one module wrapping `@polymarket/client` (pinned exact version).
      Verify: unit test against a recorded fixture; a live call returns a best ask for a known token id.
- [ ] T11. Bet panel + confirmation modal showing market, outcome, amount, price, and estimated payout — the single confirmation path both demo and real bets go through (Article II).
      Verify: the modal renders all five fields; a test asserts no submit path bypasses it.
- [ ] T12. Demo mode: per-session simulated balance ($1,000, resets on reload), fills at the live best ask, unmistakable DEMO labeling on every bet-like control and result.
      Verify: in the browser, a demo bet debits the simulated balance, shows a position, requires no wallet, and every relevant control is labeled DEMO.

## Phase 5 — Geo compliance (US-5)

- [ ] T13. `GET /api/geo` (region → betting allowed/blocked) plus client-side pre-trade check against `polymarket.com/api/geoblock`; restricted regions disable real-bet controls with a plain-language explanation while browse, AI, and demo stay available. Respect Gamma's per-market `restricted` flag.
      Verify: with a simulated restricted region, real-bet controls are disabled with an explanation and US-1/US-3/US-4 still work; unrestricted region leaves them enabled.

## Phase 6 — Real betting (US-2)

- [ ] T14. **Spike (plan Risk 1):** validate the pUSD allowance/approval flow and one minimal real order end-to-end from a non-restricted region; record the verified flow in `.claude/skills/polymarket-api/SKILL.md` (replacing the UNVERIFIED note) and update plan.md if it differs.
      Verify: one real order fills on-chain; the skill file states the confirmed approval targets and steps. **Blocks T15–T17.**
- [ ] T15. Wallet connect (wagmi + viem, Polygon) and CLOB auth: L1 EIP-712 signature → derive L2 credentials (signatureType EOA=0), held client-side only.
      Verify: connecting a test wallet derives credentials in the browser; no credential or key appears in any server log or request payload (Article III).
- [ ] T16. Real order placement: market-style FOK/FAK buy signed by the user's wallet, submitted from the client after the T11 confirmation.
      Verify: a small real bet from a non-restricted region fills and the resulting position renders.
- [ ] T17. Failure handling: insufficient balance/allowance, rejected signature, geo rejection, and network errors each surface a plain-language message with funds untouched.
      Verify: each failure is exercised (or simulated) and shows its message; no partial state is left behind.

## Phase 7 — Ship

- [ ] T18. Deploy to Vercel with `ANTHROPIC_API_KEY` set in project env; confirm the preview and production builds.
      Verify: the deployed URL serves the widget; browse, AI assist, and demo mode work in production; the key is absent from the client bundle.
- [ ] T19. Update README (what it does, how to run it locally, demo-mode note, live URL) and confirm spec/plan still describe the system as built.
      Verify: a clean clone can follow the README to a running dev server; `bash scripts/sdd-lint.sh` passes.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
