# Polymarket Widget

A web widget for browsing Polymarket prediction markets, getting AI assistance choosing a market and outcome, and placing a bet — with the user's own wallet, after explicit confirmation.

**Status:** feature 001 under implementation. Spec, plan, and task list are approved; the Next.js scaffold and test harness are in place (Phase 1 of 7). Progress lives in `specs/001-polymarket-widget/tasks.md`.

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

Open the repo in Claude Code and run `/sdd-status` — it reports every feature's gate state and names the single next action.

## Deployment target

Vercel (primary — native host for the planned Next.js stack; preview deploys per PR). Netlify remains a compatible fallback. Final call is made in `plan.md`.
