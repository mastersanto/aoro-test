# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Polymarket Widget — a web widget that lets a user browse Polymarket prediction markets, get AI assistance choosing a market and outcome, and place a bet. Target deployment: Vercel (primary; the planned stack is Next.js, which Vercel hosts natively — Netlify is the fallback).

## Current state: SDD harness only — no application code exists

This repository practices Spec-Driven Development (SDD). All work flows through specs before implementation. **Do not scaffold or write application code until the active feature's `spec.md`, `plan.md`, and `tasks.md` are complete and approved by the user.**

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
```

Run a single test:

```bash
npx vitest run -t "renders a component into a DOM"   # by test name (substring match)
npx vitest run tests/render.test.tsx                 # by file
```

Tests live in `tests/`. Vitest runs in jsdom with `@testing-library/react` (config: `vitest.config.mts`, matchers: `vitest.setup.ts`) — constitution Article VII binds component-level invariants, so the suite must be able to render.

Dependencies are pinned to exact versions; `next.config.ts` pins `turbopack.root` because a lockfile above the repo otherwise makes the workspace root ambiguous.

This is Next.js 16 — its App Router conventions differ from older releases. Read the bundled docs in `node_modules/next/dist/docs/01-app/` before writing routes or components.

## Architecture context (pre-decided; confirm details in plan.md)

- **Polymarket has two API surfaces.** The Gamma API (`https://gamma-api.polymarket.com`) is read-only market discovery — public, no auth. The CLOB API places orders and requires cryptographic signing with the user's wallet (Polygon network, USDC collateral). Consequence: market browsing and AI assistance can ship without any wallet integration; bet placement cannot. Sequence work accordingly.
- **AI assistance runs server-side only** — an API route calling the Claude API (Messages API, latest Claude model). `ANTHROPIC_API_KEY` and any other secrets never reach the client bundle. See `.env.example`.
- **Bets are signed client-side by the user's wallet.** The server should never hold user funds or private keys. If plan.md ever needs a server-held credential, that is a constitution-level decision requiring user approval.
- **Real money is involved.** The constitution mandates: AI suggests but never executes; an explicit confirmation step before any transaction; geo-restriction handling and "not financial advice" disclaimers are spec-level requirements, not polish.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
