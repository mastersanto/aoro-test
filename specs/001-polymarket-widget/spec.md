# Spec 001 — Polymarket Betting Widget with AI Assist

**Status:** Approved 2026-08-31; **US-2 withdrawn 2026-08-31** (see Scope change)
**Owner:** jorgeivansandoval@gmail.com

## Why

The assignment: *"Create a Polymarket widget on a single page. The widget should allow a user to search markets, and the user can place a bet on a market. For a recommended bonus, connect your widget to AI to get AI-assisted predictions."*

Betting on Polymarket today means navigating the full exchange UI and already knowing which market you want. This widget compresses that into one page: search markets, choose an outcome (with AI help if undecided), and place the bet. A demo mode lets anyone — including a reviewer without a funded wallet — exercise the entire flow safely.

## What (user stories)

Tag semantics: *(core)* stories block release; *(bonus)* do not. Scope decisions behind these stories were resolved with the project owner — see the Decision record below.

### US-1 *(core)* — Search and browse markets
As a visitor, I can browse and search live Polymarket markets, seeing for each: title, outcomes, current prices (implied odds), volume, and end date.

**Acceptance criteria**
- Markets shown are live (open, not resolved) and refresh without a full page reload.
- A market that has been selected keeps refreshing too, from its own endpoint rather than from the list — the list is query-scoped, so a market leaving it means "filtered out or closed" and cannot distinguish them. *(Amended 2026-08-31 by feature 003 T6, which needs the selected market's price to stay current; previously the selection was a snapshot taken once.)*
- Keyword search and category filter narrow the list.
- Works with no wallet connected and no sign-in.

### ~~US-2 *(core)* — Place a real bet~~ — **WITHDRAWN 2026-08-31**

Withdrawn by the project owner. The story text is kept rather than deleted so the
decision is auditable and so a future reader can see exactly what was dropped.

> As a bettor, I can select a market and outcome, enter an amount, see the
> estimated payout, connect my own wallet, and place the bet after an explicit
> confirmation step.
>
> - The confirmation step shows market, outcome, amount, price, and estimated
>   payout before anything is signed (Article II).
> - The transaction is signed client-side by the user's own wallet holding trading
>   collateral on Polygon (pUSD); the server never touches funds or private keys
>   (Article III).
> - Success shows the resulting position; failure shows a plain-language reason and
>   leaves the user's funds untouched.

**Why it was withdrawn.** It was blocked at T21, a spike that cannot be completed
read-only: determining which spender to approve requires a funded wallet on Polygon
in a non-restricted region, and the US — where this is being built and deployed —
is close-only on Polymarket's main exchange. The blocker is jurisdictional, not
technical, so no amount of further work here removes it.

**What replaces it.** Nothing. US-3 (demo mode) already exercises the full journey
against live market data and live order-book prices, through the same confirmation
Article II requires. The widget is demo-only, and says so.

**What this does NOT change.** The region and per-market restriction checks stay,
and still run before anything else (`lib/betting-availability.ts`, US-5). They are
the compliance answer rather than a wallet precondition, and removing working
safety code to match a scope cut is how a codebase loses the reason it was careful.
The constitution is unamended: Article II still binds every demo placement, and
Article III becomes vacuous rather than violated — the server holds no funds
because there are none to hold.

### US-3 *(core)* — Demo mode — **now the only betting path**
As a visitor, I can practice the full betting flow against real market data with a simulated balance. *(With US-2 withdrawn 2026-08-31 this is no longer a fallback for reviewers without a wallet; it is how the widget places bets.)*

**Acceptance criteria**
- Demo mode needs no wallet and moves no real money.
- Every bet-like control and result is unmistakably labeled as demo while the mode is active.
- The flow passes through the confirmation Article II requires — the same one US-2 would have used.
- The simulated balance is per-session and resets on reload — consistent with "no server-side user state" (see Out of scope).

### US-4 *(bonus, per assignment)* — AI-assisted predictions
As an undecided user, I can describe what I'm interested in and receive AI-suggested markets and outcomes, each with reasoning grounded in the market's current odds and metadata.

**Acceptance criteria**
- Suggestions reference real, currently open markets with live prices — never invented ones.
- Each suggestion explains its reasoning and shows the suggested outcome's current price.
- An "AI assistance is not financial advice" disclaimer is visible alongside suggestions (Article V).
- The AI cannot trigger a bet; suggestions only pre-fill the bet form for the user to review (Article II).

### US-5 *(core)* — Geo-restricted regions degrade to read-only
As a user in a region where Polymarket trading is restricted, I can still browse markets and use AI assistance, but real betting is disabled with an explanation.

*(Retained after US-2's withdrawal. The check is now belt-and-braces — nothing real can be bet regardless — but it is correct, tested, and honest about the region, and Article V makes it an acceptance criterion rather than a feature of the wallet work.)*

**Acceptance criteria**
- Restricted regions get US-1 and US-4 unchanged; the real-money controls are disabled with a plain-language explanation (Article V).
- Demo mode (US-3) remains available — it moves no real money.
- The "not financial advice" disclaimer required by US-4 remains visible alongside AI suggestions.

## Scope change — 2026-08-31

**US-2 (real betting) withdrawn by the project owner**, after two prior instructions
to skip wallet work. Consequences, all applied in the same change:

- Phase 6 (T21–T28) is removed from `tasks.md`, with the reason recorded there.
- `plan.md`'s wallet, CLOB-signing and allowance architecture is marked withdrawn.
- The user-facing reason changes from "not enabled in this build **yet**" to
  demo-only by design. Saying "yet" would promise something that is not coming.
- `realBettingAvailability`'s `walletReady` flag is renamed `realBettingBuilt`,
  because the reason it is false is now a decision rather than pending work.
- **The assignment asked that "the user can place a bet on a market."** With US-2
  withdrawn, that is satisfied in demo only: real market data, live order-book
  fill prices, the same confirmation — but no real money moves. This is the one
  consequence worth stating plainly rather than burying, and it was the owner's
  call to make.

## Out of scope (v1)

- **Real-money betting** — see the Scope change above.
- Embedding on third-party sites — the widget ships as a single hosted page; an embeddable version is a possible future feature.
- Portfolio management, order history, selling or closing positions.
- Limit orders or advanced order types — market-style buys only.
- User accounts or any server-side user state.
- In-widget wallet creation or custody.

## Context (reference facts for planning)

- Polymarket's Gamma API serves market data publicly with no auth; the CLOB API places orders and requires wallet signing on Polygon with pUSD collateral (Polymarket's USDC-backed collateral token).
- Consequence: US-1, US-3, and US-4 are shippable with no wallet integration; US-2 depends on it. Sequencing search → demo bets → AI assist → real bets ships value early and retires risk late-stage only where unavoidable.

## Decision record

Scope questions put to the project owner before drafting, and their answers:

- **D1 — Form factor: single page only.** The assignment asks for a widget on a single page; an embeddable third-party version was considered and explicitly deferred (see Out of scope).
- **D2 — Money modes: both real and demo in v1.** Real betting matches the assignment; demo mode was added so a reviewer without a funded wallet can exercise the full flow.
- **D3 — Wallet: the user's own.** Connect an existing wallet holding USDC on Polygon; no in-widget wallet creation. Cleanest fit with constitution Article III (custody stays with the user). *(Recorded pre-planning; API research later established the actual collateral is pUSD, funded from USDC — the US-2 acceptance criterion is authoritative.)*
- **D4 — Geo policy: read-only degrade.** Restricted regions keep browsing and AI assistance; real betting is disabled with an explanation, mirroring how Polymarket itself gates trading.
- **D5 — AI assistance is the assignment's "recommended bonus".** Core is search + bet; priorities are tagged accordingly. Provider (Claude API, server-side only) was pre-decided in the harness.

## Open questions

None — all scope questions were resolved in the Decision record above before drafting.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
