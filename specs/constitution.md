# Constitution — Polymarket Widget

Fixed principles for this project. Every spec, plan, and task must comply. Amendments require explicit user approval and are recorded in the log at the bottom.

## Article I — Spec before code

No application code is written without an approved `spec.md`, `plan.md`, and `tasks.md` for the feature it belongs to. Specs describe WHAT and WHY; plans describe HOW; tasks describe the ordered steps. When reality diverges from the docs, the docs are updated in the same change.

## Article II — AI suggests, humans decide

The AI assistant recommends markets and outcomes with reasoning and current odds. It never places, signs, cancels, or modifies a bet on its own, and no code path may chain an AI output directly into a transaction. Every bet requires an explicit user confirmation step that shows market, outcome, amount, price, and estimated payout.

## Article III — Custody stays with the user

Bets are signed client-side by the user's own wallet. The server never holds user funds, private keys, or the ability to move either. Any deviation is an amendment to this constitution, not a plan-level decision.

## Article IV — Secrets stay server-side

API keys (AI provider or otherwise) live only in server-side environment variables and are used only in server routes. Nothing secret ships in the client bundle. `.env.example` documents every required variable.

## Article V — Compliance is a requirement, not polish

Real-money prediction markets are geo-restricted and regulated. Every spec that touches betting must state how geo-restrictions are handled and where the "AI assistance is not financial advice" disclaimer appears. These are acceptance criteria, not TODOs.

## Article VI — Small, verifiable steps

Every item in a `tasks.md` states how to verify it (a command to run, a behavior to observe). Prefer the smallest dependency set and the simplest architecture that satisfies the spec; new dependencies are justified in plan.md.

## Article VII — Test-first where it binds

Business logic and every safety invariant this constitution asserts are written test-first: a failing test that states the requirement, then the code that satisfies it. This binds, at minimum:

- the Article II guarantees — no code path chains AI output into a transaction, and every bet passes a confirmation showing market, outcome, amount, price, and estimated payout;
- the Article V guarantees — restricted regions cannot place real bets, and required disclaimers render;
- pure logic — data normalization, price and payout math, state transitions, and error mapping.

Exempt: project scaffolding, styling and layout, dependency configuration, documentation, deployment, and exploratory spikes against an external API whose behavior is the thing being discovered. These are verified by their Article VI Verify line alone, and a task that claims exemption says so explicitly.

---

## Amendment log

- 2026-08-30 — Initial constitution adopted.
- 2026-08-31 — Article VII (test-first where it binds) adopted at the user's direction, before implementation began.
