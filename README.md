# Polymarket Widget

A web widget for browsing Polymarket prediction markets, getting AI assistance choosing a market and outcome, and placing a practice bet against live prices, after explicit confirmation.

**Live:** https://aoro-test-ten.vercel.app

**Status:** all six features complete. 421 behaviour tests + 78 appearance checks + live tests passing.

**Reviewing this?** Two entry points: [Demo walkthrough](#demo-walkthrough--try-the-live-app) for the product (about ten minutes, nothing to install), and [Process walkthrough](#process-walkthrough--read-the-sdd-trail) for how it was specified, gated and audited.

**This widget is demo-only.** Real-money betting (US-2) was withdrawn on 2026-08-31 — see [the scope change](specs/001-polymarket-widget/spec.md#scope-change--2026-08-31). Every other part is real: live Polymarket markets, live order-book fill prices, a real Claude model behind the assistance, and the same confirmation step a real bet would pass through. What does not happen is money moving.

## What works today

- **Browse and search live markets** — real Polymarket data, prices as implied odds, category filters, refreshing without a page reload. Paginated (browsing and search alike) and orderable by 24-hour volume, soonest to end, total volume or liquidity. Only orderings the exchange performs *correctly* are offered: Gamma sorts several numeric columns as strings, so those are excluded in favour of their numeric aliases.
- **AI-assisted suggestions** — describe what interests you and get up to three real open markets with reasoning grounded in their current odds. The model returns only ids; every question, label and price shown is read back from our own market data, so it cannot invent a market or a price.
- **A scoped recommendation** — with a market selected, the assistant argues for one outcome and, in the same breath, for what would defeat it. Its output is constrained in shape and screened server-side: no quantities, no claims about how likely anything is, no assertions that the price is wrong. An argument is withdrawn when the price it was made from moves more than two points, when the market closes, or after ten minutes — and it only ever fills the outcome, never the stake.
- **Demo betting** — a $1,000 practice balance, filled at the live order-book price, labelled DEMO at every step. No wallet, no real money. Positions are marked to market, so the practice account can rise as well as fall. A position whose price cannot be established reads as *not valued*, and a market that closed without the exchange publishing a winner reads as *unresolved* — never as a loss. The spendable balance stays cash: a paper gain is displayed, never staked.
- **Operable by keyboard** — Escape closes the confirmation and the bet sheet, focus moves in and returns, and the confirmation contains Tab. The bet sheet deliberately does not: it stays open for as long as a market is selected, so trapping it would put the mode toggle and the geo explanation out of reach.
- **Geo compliance** — restricted regions keep browsing, AI and demo, and lose only real betting, with an explanation.

**Real-money betting was withdrawn, not deferred.** It was blocked at T21, a spike that must place one small real order to confirm Polymarket's pUSD approval flow — the one API detail their docs do not specify. That needs a funded wallet on Polygon in a non-restricted region, and the US is close-only on Polymarket's main exchange, so the blocker was jurisdictional rather than technical. The region and per-market restriction checks were **kept** even though nothing real can be bet: they are correct, tested, and honest about where you are.

## Demo walkthrough — try the live app

**Live: https://aoro-test-ten.vercel.app** — no sign-in, no wallet, nothing to install.

Roughly ten minutes. Each step says what to do, and then what is worth *noticing* —
because most of the engineering here is in the cases that are easy to get wrong,
and those are invisible if you only click the happy path.

### 1. Browse, search, sort (US-1, 004 UX-1/UX-2)

Open the page. Twenty-four live Polymarket markets load, each with its outcomes as
implied odds, 24-hour and total volume, and a resolution date.

- **Scroll down and press "Load more markets".** The next page appends; nothing
  you were reading is replaced.
- **Change "Sort" to "Ending soonest".** Notice the dates are genuinely ascending
  and none of them are in the past. That is not free: Polymarket's `closed=false`
  filter still returns markets that ended months ago, still flagged open, so this
  needs a separate end-date floor.
- **Try "Total volume".** Also not free — the exchange sorts that column
  *lexicographically*, so the obvious implementation returns 99.99, then 999.84,
  then 9.99. It looks completely plausible in the response. There is a numeric
  alias, and that is what this uses.
- **Type "bitcoin" in the search box.** Notice the sort control disables itself and
  says why: the search endpoint ignores ordering entirely, so offering a sort there
  would silently sort a truncated subset and look correct.
- **Press "Load more markets" on that search.** It works, and it is doing more than
  it appears: that endpoint returns pages whose markets are frequently *all*
  resolved — for "bitcoin", pages 2 and 3 contain zero open markets — so the server
  reads on until it has something to show, bounded at five pages.

### 2. Ask the AI what to bet on (US-4)

In **"Not sure what to bet on?"**, type something like `something about the Fed` and
press **"Get suggestions"**. You get up to three real open markets with reasoning.

- **The disclaimer sits with the suggestions**, not in a footer — that co-visibility
  is asserted in a real browser, because jsdom cannot tell whether two things are on
  screen together.
- **The model only ever returns market ids.** Every question, label and price you
  see is read back from our own market data, so it cannot invent a market or a
  price. Ask for something absurd and you get an empty result rather than a
  hallucinated market.
- **Press "Use this".** It fills the bet form and stops. It opens no confirmation
  and places nothing — Article II of the project constitution says the assistant
  suggests and the human decides, and there is a test that clicks every button on
  the page to prove no other control can place a bet.

### 3. Pick a market and get the scoped recommendation (feature 003)

Click any market row. A bet panel and **"What would you favour here?"** appear.
Press it.

This is the most constrained surface in the project — an assistant arguing one side
of a bet. Notice:

- **The case for and what would defeat it are shown together**, both expanded.
  Neither is behind a click.
- **No numbers appear in the model's text.** No percentages, no "nine times out of
  ten", no dollar figures. Every figure on screen is rendered by the app from its
  own data.
- **No claim about how likely anything is.** This is the rule that kept breaking:
  `specs/003-scoped-outcome-recommendation/defeat-corpus.md` records seven real
  sentences that beat earlier versions of the screen, two of them found in
  production. The corpus only grows — a new defeat is added and tested, never
  argued away.
- **Leave it for ten minutes, or watch the price move two points.** The argument
  withdraws itself and says why. An argument made from a price it no longer matches
  is not an argument.
- **"Use this — fills the bet form"** fills the *outcome only*. It never fills a
  stake, and nothing in the recommendation suggests a size.

### 4. Place a demo bet (US-3)

Choose an outcome, enter an amount, press **"Review bet"**.

- **The confirmation shows five things** — market, outcome, amount, price, estimated
  payout — before anything happens. Every path, demo included, passes through it.
- **Press Escape.** It cancels and returns focus to "Review bet". It never confirms:
  a dismissal gesture wired to confirm would invert the whole point of the step.
- **Reopen it and leave it sitting** while prices refresh. If the price moves, the
  button changes from "Place bet" to "Review again" and tells you it moved. The
  number you agreed to never changes underneath you.
- **Press "Place bet".** The fill uses the live order-book price, not the listed
  price — and if the book is briefly unreachable the position says so, because a
  cost recorded from one source and valued against another shows a difference that
  is the two sources disagreeing rather than the market moving.

### 5. Watch the position (004 UX-4)

Your position appears under **DEMO positions** with its cost, what it is worth now,
and the difference. Leave the tab open; values follow live prices on a 30-second
cadence.

The interesting part is what it *refuses* to say:

- A position it cannot price reads **"not valued"**, never `$0.00`.
- A market that closed without the exchange publishing a winner reads
  **"unresolved"**, never as a loss. Many resolved Polymarket markets report both
  outcome prices as `"0"`, and the obvious rule — value it at its price — reports
  every one of those as a total loss the exchange never published.
- Positions it could not value are **counted next to the total, not folded into
  it**. A total that quietly drops rows is claiming the rest are worth nothing.
- **The spendable balance never moves except when you bet.** A paper gain is
  displayed, never staked.

### 6. The safety behaviour, on purpose

- **Switch to "Real money".** It is refused, with the reason. From the US the geo
  check reports the region and says so; the region and per-market restriction
  checks are still there and still run first, even though this widget is demo-only
  by design.
- **Turn off your network and press "Get suggestions".** The button relabels to
  **"Try again"** and your typed prompt survives. Turn the network back on and
  press it.
- **Do the whole flow with the keyboard.** Tab reaches every enabled control,
  Escape closes the confirmation, focus returns where it started. On a phone the
  bet sheet deliberately does *not* trap focus — it stays open as long as a market
  is selected, so trapping it would put the mode toggle out of reach.

### If you would rather read than click

- `specs/001-polymarket-widget/spec.md` — the scope change withdrawing real betting,
  and why the compliance checks were kept anyway.
- `specs/003-scoped-outcome-recommendation/defeat-corpus.md` — every sentence that
  has beaten the content screen.
- `specs/004-usability-and-workflow/spec.md` — two audits' worth of corrections,
  including three claims I made about the shipped code that turned out to be false,
  kept visible rather than edited away.
- `specs/002-widget-visual-redesign/manual-checks.md` — the guarantees no test suite
  here can judge, including two still marked *not yet performed*.

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

Progress lives in each feature's `tasks.md`.

## Where each feature stands

| Feature | State | Notes |
|---|---|---|
| **001** Polymarket widget | 24/24 ✅ | Browse, demo betting, AI suggestions and geo gating. **US-2 (real betting) withdrawn 2026-08-31** and Phase 6 removed; the blocker was jurisdictional, not technical. Because that phase had been sequenced last on purpose, nothing shipped depended on it. |
| **002** Visual redesign | 16/16 ✅ | Dark, data-first UI. Introduced the appearance gate, because jsdom performs no layout and cannot tell that a required field is off-screen. |
| **003** Scoped recommendation | 20/20 ✅ | The assistant argues one side of a selected market, with the counter-case beside it. Its output is shape-constrained and screened server-side; arguments are withdrawn when the price they were made from moves. |
| **006** List leads on entry | 5/5 ✅ | Arriving shows two market rows, not one on the fold. The check `005` shipped asked only whether the first row *fits*, which a row flush against the bottom edge satisfies. Space came from a scrolling category row, a desktop-only page subtitle and a shorter geo reason — and the work exposed a horizontal scroll at 390px that had been live since `005`. |
| **005** Decision rail | 11/11 ✅ | The bet panel gets one fixed home on the left, first on a phone; the market is stated once by a sticky header; the AI finder moves to the list, where finding happens. Repeals `003 AR-7`'s ordering rule and removes `002 VR-4`'s bottom sheet, replacing both sets of assertions rather than dropping them. |
| **004** Usability and workflow | 24/24 ✅ | Pagination, ordering, keyboard operation, position valuation and visible error recovery. Two constitution audits found nine defects between them, five of which had already shipped — including two sort orderings that returned lexicographically-sorted nonsense, and a refresh that rewound the pagination cursor so "Load more" went quietly dead. |

Verification: `npm run verify` runs lint, build, 421 behaviour tests and 78
appearance checks. `npm run test:live` exercises the real Polymarket and Claude
APIs. `specs/002-widget-visual-redesign/manual-checks.md` records the six checks
neither suite can judge — one of which, MC-6, found two real defects on the first
production run and stays permanently outstanding.

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

## Process walkthrough — read the SDD trail

The section above is the product. This one is how it was built. To see the entire
SDD process, read in this order:

1. **[`specs/constitution.md`](specs/constitution.md)** — the fixed principles every spec, plan, and task must satisfy. Written first, amended only with explicit approval.
2. **[`specs/templates/`](specs/templates/)** — the shape of each stage: `spec.md` captures WHAT/WHY with unresolved decisions explicitly marked `[NEEDS CLARIFICATION]` instead of silently assumed; `plan.md` captures HOW with every decision traced to the spec or constitution; `tasks.md` is an ordered checklist where every item states its verification.
3. **`specs/NNN-feature-name/`** — one directory per feature, filled stage by stage. Each stage is gated on approval of the previous one: no plan before the spec's questions are answered, no code before an approved task list.
4. **[`.claude/commands/`](.claude/commands/)** — the slash commands that automate the workflow (`/spec`, `/plan-feature`, `/tasks`, `/implement`; `/sdd-status` reports gate progress). The gates are enforced, not trusted: a PreToolUse hook ([`.claude/hooks/sdd-gate.sh`](.claude/hooks/sdd-gate.sh)) mechanically blocks application-code writes until a task list is approved, a [`constitution-check`](.claude/agents/constitution-check.md) agent audits every artifact before its approval gate, and CI runs [`scripts/sdd-lint.sh`](scripts/sdd-lint.sh) to validate the spec structure on every push.
5. **[`CLAUDE.md`](CLAUDE.md)** — the operating guide the AI agent follows in this repo, including pre-decided architecture constraints.

The commit history mirrors the same progression: harness → spec approval → plan → tasks → implementation, so the process is auditable in the log as well as the files.

## Next step

Open the repo in Claude Code and run `/sdd-status` — it reports every feature's gate state. All four features are complete, so the next action is a new `/spec`.

The two outstanding items are judgements, not code: `specs/002-widget-visual-redesign/manual-checks.md` records **MC-7** (does scroll position hold across "Load more"?) and **MC-8** (does the keyboard order read sensibly?) as not yet performed. Neither suite can decide them — jsdom has no layout, and Playwright can measure `scrollY` without knowing whether the row you were reading moved.

## Deployment

Deployed on Vercel at the URL above; `ANTHROPIC_API_KEY` is set as a project environment variable and never reaches the browser. Netlify remains a compatible fallback (`plan.md`).
