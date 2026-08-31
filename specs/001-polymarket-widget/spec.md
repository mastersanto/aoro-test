# Spec 001 — Polymarket Betting Widget with AI Assist

**Status:** Approved 2026-08-31
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
- Keyword search and category filter narrow the list.
- Works with no wallet connected and no sign-in.

### US-2 *(core)* — Place a real bet
As a bettor, I can select a market and outcome, enter an amount, see the estimated payout, connect my own wallet, and place the bet after an explicit confirmation step.

**Acceptance criteria**
- The confirmation step shows market, outcome, amount, price, and estimated payout before anything is signed (Article II).
- The transaction is signed client-side by the user's own wallet holding USDC on Polygon; the server never touches funds or private keys (Article III).
- Success shows the resulting position; failure shows a plain-language reason and leaves the user's funds untouched.

### US-3 *(core)* — Demo mode
As a visitor without a funded wallet (e.g. a reviewer), I can toggle demo mode and practice the full betting flow against real market data with a simulated balance.

**Acceptance criteria**
- Demo mode needs no wallet and moves no real money.
- Every bet-like control and result is unmistakably labeled as demo while the mode is active.
- The flow mirrors US-2 (same confirmation step) so it exercises the real UX.
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

**Acceptance criteria**
- Restricted regions get US-1 and US-4 unchanged; US-2's controls are disabled with a plain-language explanation (Article V).
- Demo mode (US-3) remains available — it moves no real money.
- The "not financial advice" disclaimer required by US-4 remains visible alongside AI suggestions.

## Out of scope (v1)

- Embedding on third-party sites — the widget ships as a single hosted page; an embeddable version is a possible future feature.
- Portfolio management, order history, selling or closing positions.
- Limit orders or advanced order types — market-style buys only.
- User accounts or any server-side user state.
- In-widget wallet creation or custody.

## Context (reference facts for planning)

- Polymarket's Gamma API serves market data publicly with no auth; the CLOB API places orders and requires wallet signing on Polygon with USDC collateral.
- Consequence: US-1, US-3, and US-4 are shippable with no wallet integration; US-2 depends on it. Sequencing search → demo bets → AI assist → real bets ships value early and retires risk late-stage only where unavoidable.

## Decision record

Scope questions put to the project owner before drafting, and their answers:

- **D1 — Form factor: single page only.** The assignment asks for a widget on a single page; an embeddable third-party version was considered and explicitly deferred (see Out of scope).
- **D2 — Money modes: both real and demo in v1.** Real betting matches the assignment; demo mode was added so a reviewer without a funded wallet can exercise the full flow.
- **D3 — Wallet: the user's own.** Connect an existing wallet holding USDC on Polygon; no in-widget wallet creation. Cleanest fit with constitution Article III (custody stays with the user).
- **D4 — Geo policy: read-only degrade.** Restricted regions keep browsing and AI assistance; real betting is disabled with an explanation, mirroring how Polymarket itself gates trading.
- **D5 — AI assistance is the assignment's "recommended bonus".** Core is search + bet; priorities are tagged accordingly. Provider (Claude API, server-side only) was pre-decided in the harness.

## Open questions

None — all scope questions were resolved in the Decision record above before drafting.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
