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
- Unresolved questions in a spec are marked `[NEEDS CLARIFICATION: ...]`. Resolve them with the user before writing the plan; never silently pick an answer.
- Spec, plan, and tasks each need explicit user approval before moving to the next step.
- If implementation reveals the plan was wrong, update plan.md (and spec.md if scope changed) in the same change — the specs must always describe the system as built.

## Commands

None yet — the stack is not scaffolded. When the first feature's `plan.md` is approved and the project is scaffolded, replace this section with the real dev/build/lint/test commands (including how to run a single test) in the same change.

## Architecture context (pre-decided; confirm details in plan.md)

- **Polymarket has two API surfaces.** The Gamma API (`https://gamma-api.polymarket.com`) is read-only market discovery — public, no auth. The CLOB API places orders and requires cryptographic signing with the user's wallet (Polygon network, USDC collateral). Consequence: market browsing and AI assistance can ship without any wallet integration; bet placement cannot. Sequence work accordingly.
- **AI assistance runs server-side only** — an API route calling the Claude API (Messages API, latest Claude model). `ANTHROPIC_API_KEY` and any other secrets never reach the client bundle. See `.env.example`.
- **Bets are signed client-side by the user's wallet.** The server should never hold user funds or private keys. If plan.md ever needs a server-held credential, that is a constitution-level decision requiring user approval.
- **Real money is involved.** The constitution mandates: AI suggests but never executes; an explicit confirmation step before any transaction; geo-restriction handling and "not financial advice" disclaimers are spec-level requirements, not polish.
