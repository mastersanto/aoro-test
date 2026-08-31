# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Polymarket Widget — a web widget that lets a user browse Polymarket prediction markets, get AI assistance choosing a market and outcome, and place a bet. Target deployment: Vercel (primary; the planned stack is Next.js, which Vercel hosts natively — Netlify is the fallback).

## Current state: all seven features complete and deployed; the widget is demo-only

This repository practices Spec-Driven Development (SDD). All work flows through specs before implementation. **Do not write application code for a feature until its `spec.md`, `plan.md`, and `tasks.md` are complete and approved by the user** — the PreToolUse hook enforces this mechanically.

Every feature is through its gates and implemented. There is no in-flight task list; new work starts at `/spec`.

Shipped at https://aoro-test-ten.vercel.app — browse, search, paginate and sort markets (001 US-1, 004); demo betting with mark-to-market positions (001 US-3, 004); AI suggestions and a scoped outcome recommendation (001 US-4, 003); geo gating (001 US-5); the 002 visual system; the 005 decision rail; and 007's opening on a market. Real-money betting was **withdrawn**, not deferred — see below.

## Before you change something, read the paragraph for it

**The AI surfaces — `lib/ai/`, `app/api/recommend/`, `app/api/assist/`.** Feature 003 is the project's most constrained surface: the assistant argues one side of a bet, which Article II permits and whose persuasion risk the confirmation cannot contain. Read `specs/003-scoped-outcome-recommendation/spec.md` (AR-3 and its Known limits) and `defeat-corpus.md`, which records every sentence that has beaten a version of the content screen. The corpus only grows — a new defeat is added and tested, never argued away.

**The layout — `components/Widget.tsx` and the rail.** The rail has **one fixed order** (market → bet → advisor → positions) and nothing may reorder it: that is feature 005's whole point, and it repealed `003 AR-7` (reorder by actionability) and `002 VR-4` (the mobile bottom sheet) to get there. A bet entry that cannot be acted on is expressed by rendering **no controls**, not by moving. The widget also opens on a market (007) — the market only: any change near that path must leave the outcome and amount untouched, open no confirmation and request no recommendation.

**Vertical space above the market list is a budget, ~38px spare at 390px** (006). Two market rows must stay fully visible when nothing is selected; with a market selected the bet must be completable without scrolling. Both are asserted in the appearance suite. Note the grid children carry `min-w-0` deliberately — without it a child's intrinsic width scrolls the whole document sideways at 390px, which shipped unnoticed for a whole feature.

**Anything near betting availability — `lib/betting-availability.ts`, `lib/geo.ts`.** Real-money betting (001 US-2, Phase 6) was withdrawn on 2026-08-31 because the blocker was jurisdictional, not technical. The geo and per-market restriction checks were **kept anyway**: they are correct, tested, and Article V makes them acceptance criteria rather than wallet preconditions. Deleting working safety code to match a scope cut is how a codebase loses the reason it was careful. The constitution was not amended — Article II still binds every demo placement, and Article III is vacuous rather than violated.

**Anything that relies on a fact about Polymarket's APIs.** Verify it live first. Gamma sorts several numeric columns as *strings*; `closed=false` still returns markets that ended months ago; the CLOB order book does not survive resolution; `/public-search` returns pages whose markets are all closed. Every one of these looked fine in mocked tests and was wrong. `.claude/skills/polymarket-api/SKILL.md` records what has actually been checked, and when.

## How this project has actually failed

Three patterns, each of which shipped at least once here. They are worth more than any individual fact above.

1. **A test that asserts something *adjacent* to the requirement.** A refresh rewound the pagination cursor while 339 tests passed, because the RED task asserted the rows were kept and never asserted the cursor. A restatement of the market question slipped past a matcher that only matched an exact text node. Before trusting a green suite, check that each test names the thing it is for.
2. **A mock that preserves a contract production has stopped honouring.** `searchMarkets` changed shape and the assist route silently lost every searched candidate; every mocked test stayed green. The first Gamma fixture was fabricated and keyed the payload wrongly, so the whole app would have returned zero markets with a green suite.
3. **A mutation that does not actually apply.** An ineffective mutation and a real pass look identical from the summary line. Assert that the edit landed before believing the result — this has produced a false "proven" more than once.

## SDD workflow

Per feature, in order:

1. `specs/constitution.md` — fixed project principles. Read it before planning anything; never violate an article without explicit user sign-off recorded in that file.
2. `specs/NNN-feature-name/spec.md` — WHAT and WHY: user stories, acceptance criteria, out-of-scope. No technology choices here.
3. `specs/NNN-feature-name/plan.md` — HOW: stack, architecture, data flow, external APIs. Every decision must trace to a spec requirement or constitution article.
4. `specs/NNN-feature-name/tasks.md` — ordered checklist of small, independently verifiable tasks.
5. Implementation — one task at a time, checking off tasks.md as you go.

Slash commands in `.claude/commands/` drive this: `/spec`, `/plan-feature`, `/tasks`, `/implement`. `/sdd-status` reports every feature's gate state and the next action. New feature specs start from `specs/templates/`.

Rules:
- Gates are mechanical, not just procedural: a PreToolUse hook (`.claude/hooks/sdd-gate.sh`) blocks writes to application code until a `tasks.md` has its approval box checked; each command runs the `constitution-check` agent before its approval gate; `bash scripts/sdd-lint.sh` (also run in CI) validates spec structure and approval ordering.
- Article VII requires test-first for business logic and every Article II/V safety invariant: a RED task writes the failing test, a GREEN task makes it pass. Scaffolding, styling, deployment, and API spikes are exempt and say so.
- Unresolved questions in a spec are marked `[NEEDS CLARIFICATION: ...]`. Resolve them with the user before writing the plan; never silently pick an answer.
- Spec, plan, and tasks each need explicit user approval before moving to the next step.
- If implementation reveals the plan was wrong, update plan.md (and spec.md if scope changed) in the same change — the specs must always describe the system as built.

## Commands

```bash
npm run dev          # dev server at http://localhost:3000
npm run build        # production build
npm start            # serve the production build (run npm run build first)
npm run lint         # eslint
npm test             # run the full test suite once
npm run test:watch   # re-run tests on change
npm run test:live    # network tests against the real Polymarket APIs (excluded from npm test)
npm run test:visual  # appearance gate: visibility, 44px targets, WCAG contrast (Playwright)
npm run verify       # lint + build + both test suites — the full gate
```

Run a single test:

```bash
npx vitest run -t "renders a component into a DOM"   # by test name (substring match)
npx vitest run tests/render.test.tsx                 # by file
```

Tests live in `tests/`; network-dependent checks live in `tests/live/` and are excluded from the default run. The appearance suite can also be pointed at a deployment: `PROD_URL=https://aoro-test-ten.vercel.app npm run test:visual` runs all 70 checks against production, which is how 004's deploy was verified.

**Two gates, two roles.** `npm test` (jsdom) proves *behavior*; `npm run test:visual` (Playwright, real browser) proves *appearance* — visibility, size and contrast, none of which jsdom can judge, since it performs no layout. Neither suite may be weakened to make a change pass: an assertion that must change is replaced one-for-one with an equivalent, in the same change. Guarantees neither can judge are written down in `specs/002-widget-visual-redesign/manual-checks.md`. Vitest runs in jsdom with `@testing-library/react` (config: `vitest.config.mts`, matchers: `vitest.setup.ts`) — constitution Article VII binds component-level invariants, so the suite must be able to render.

Dependencies are pinned to exact versions; `next.config.ts` pins `turbopack.root` because a lockfile above the repo otherwise makes the workspace root ambiguous.

This is Next.js 16 — its App Router conventions differ from older releases. Read the bundled docs in `node_modules/next/dist/docs/01-app/` before writing routes or components.

## Architecture context (pre-decided; confirm details in plan.md)

- **Polymarket has two API surfaces.** The Gamma API (`https://gamma-api.polymarket.com`) is read-only market discovery — public, no auth. The CLOB API places orders and requires cryptographic signing with the user's wallet (Polygon network, pUSD collateral — Polymarket's USDC-backed token; see the polymarket-api skill). Consequence: market browsing and AI assistance can ship without any wallet integration; bet placement cannot. Sequence work accordingly.
- **AI assistance runs server-side only** — an API route calling the Claude API (Messages API, latest Claude model). `ANTHROPIC_API_KEY` and any other secrets never reach the client bundle. See `.env.example`.
- **Bets are signed client-side by the user's wallet.** The server should never hold user funds or private keys. If plan.md ever needs a server-held credential, that is a constitution-level decision requiring user approval.
- **Real money is involved.** The constitution mandates: AI suggests but never executes; an explicit confirmation step before any transaction; geo-restriction handling and "not financial advice" disclaimers are spec-level requirements, not polish.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
