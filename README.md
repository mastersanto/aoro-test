# Polymarket Widget

A web widget for browsing Polymarket prediction markets, getting AI assistance choosing a market and outcome, and placing a bet — with the user's own wallet, after explicit confirmation.

**Live:** https://aoro-test-ten.vercel.app

**Status:** feature 001 under implementation — 22 of 30 tasks done, 121 unit tests + 6 live tests passing.

## What works today

- **Browse and search live markets** — real Polymarket data, prices as implied odds, category filters, refreshing without a page reload.
- **AI-assisted suggestions** — describe what interests you and get up to three real open markets with reasoning grounded in their current odds. The model returns only ids; every question, label and price shown is read back from our own market data, so it cannot invent a market or a price.
- **Demo betting** — a $1,000 practice balance, filled at the live order-book price, labelled DEMO at every step. No wallet, no real money.
- **Geo compliance** — restricted regions keep browsing, AI and demo, and lose only real betting, with an explanation.

**Real-money betting is not enabled yet.** It is blocked at task T21, a spike that must place one small real order to confirm Polymarket's pUSD approval flow — the one API detail their docs do not specify. That needs a funded wallet on Polygon in a non-restricted region; the US is close-only on Polymarket's main exchange, so the deployment above reports real betting as unavailable.

## Run it locally

```bash
npm install
cp .env.example .env.local     # add ANTHROPIC_API_KEY for the AI panel
npm run dev                    # http://localhost:3000
```

Market browsing and demo betting work with no key at all; only the AI panel needs one. Use a **workspace-scoped** Claude API key — an identity-linked key additionally requires `ANTHROPIC_WORKSPACE_ID` (see `.env.example`).

```bash
npm run verify     # lint + build + both test suites
npm test           # behavior: unit and component tests, no network
npm run test:visual # appearance: real browser — visibility, 44px targets, contrast
npm run test:live  # exercises the real Polymarket and Claude APIs (costs a model call)
```

The appearance suite exists because jsdom performs no layout: it cannot tell that
a required field is off-screen, a control is too small to tap, or text fails
contrast. It runs a real browser against a production build.

Progress lives in `specs/001-polymarket-widget/tasks.md`.

## How this repo works

Everything flows spec → plan → tasks → code, per feature:

| Path | Purpose |
|---|---|
| `specs/constitution.md` | Fixed project principles (AI never places bets, user keeps custody, secrets server-side, compliance is a requirement) |
| `specs/NNN-feature-name/` | One directory per feature, created by `/spec`: `spec.md`, `plan.md`, `tasks.md` |
| `specs/templates/` | Templates for new feature specs, plans, and task lists |
| `.claude/commands/` | Claude Code slash commands driving the workflow: `/spec`, `/plan-feature`, `/tasks`, `/implement`, plus `/sdd-status` for gate progress |
| `.claude/agents/` | `constitution-check` — read-only reviewer agent run before every approval gate |
| `.claude/settings.json` + `.claude/hooks/` | PreToolUse gate: writes to application code are blocked until a task list is approved |
| `.github/workflows/` + `scripts/` | CI lint (`sdd-lint.sh`) validating SDD structure on every push/PR |
| `CLAUDE.md` | Operating guide for Claude Code in this repo |

## Process walkthrough (for reviewers)

To see the entire SDD process, read in this order:

1. **[`specs/constitution.md`](specs/constitution.md)** — the fixed principles every spec, plan, and task must satisfy. Written first, amended only with explicit approval.
2. **[`specs/templates/`](specs/templates/)** — the shape of each stage: `spec.md` captures WHAT/WHY with unresolved decisions explicitly marked `[NEEDS CLARIFICATION]` instead of silently assumed; `plan.md` captures HOW with every decision traced to the spec or constitution; `tasks.md` is an ordered checklist where every item states its verification.
3. **`specs/NNN-feature-name/`** — one directory per feature, filled stage by stage. Each stage is gated on approval of the previous one: no plan before the spec's questions are answered, no code before an approved task list.
4. **[`.claude/commands/`](.claude/commands/)** — the slash commands that automate the workflow (`/spec`, `/plan-feature`, `/tasks`, `/implement`; `/sdd-status` reports gate progress). The gates are enforced, not trusted: a PreToolUse hook ([`.claude/hooks/sdd-gate.sh`](.claude/hooks/sdd-gate.sh)) mechanically blocks application-code writes until a task list is approved, a [`constitution-check`](.claude/agents/constitution-check.md) agent audits every artifact before its approval gate, and CI runs [`scripts/sdd-lint.sh`](scripts/sdd-lint.sh) to validate the spec structure on every push.
5. **[`CLAUDE.md`](CLAUDE.md)** — the operating guide the AI agent follows in this repo, including pre-decided architecture constraints.

The commit history mirrors the same progression: harness → spec approval → plan → tasks → implementation, so the process is auditable in the log as well as the files.

## Next step

Open the repo in Claude Code and run `/sdd-status` — it reports every feature's gate state and names the single next action. Today that is **T21**, the pUSD spike described above.

## Deployment

Deployed on Vercel at the URL above; `ANTHROPIC_API_KEY` is set as a project environment variable and never reaches the browser. Netlify remains a compatible fallback (`plan.md`).
