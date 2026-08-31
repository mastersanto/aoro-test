# Spec 004 — Usability and Workflow

**Status:** Approved 2026-08-31 (revised after constitution audit, same day — see Revision note)
**Owner:** jorgeivansandoval@gmail.com

Story IDs are prefixed **UX-**. Other features are referenced as `001 US-1`, `002 VR-2`, `003 AR-1`.

## Revision note

The first draft of this spec was audited and failed on five articles. Three of its
five motivating claims about the shipped code were wrong, and I had written them
under a sentence asserting they came from reading it. They are corrected below and
the corrections are kept visible rather than quietly edited out, because what the
gaps actually are changes what this feature should build:

- **"The AI panel offers nothing to press."** False. `components/AssistPanel.tsx:82`
  keeps its button mounted and enabled after a failure, and the prompt is never
  cleared. The real gap is smaller and different: the button still reads "Get
  suggestions", so nothing tells the reader that pressing it again is the recovery.
- **"A keyboard user can open the confirmation and be unable to leave it."** False,
  and backwards. Cancel is a native button one Tab away (`ConfirmBetDialog.tsx:108`);
  the *absence* of a focus trap makes focus freer, not captured. Nothing is trapped
  today.
- **"Search cannot paginate."** False. `/public-search` returns
  `pagination: {hasMore, totalResults}` and accepts `page=N`, returning different
  events per page (verified 2026-08-31). The shipped client discards it.

The consequence for UX-3 is the important one. Its Article II escalation rested on
the false trap claim, so it is withdrawn: **UX-3 is an accessibility and usability
fix, not a constitutional one.** What remains constitutional is a constraint on the
new work, which is a different and narrower claim — see UX-3.

## Why

The widget works, and in five specific places it works badly:

- The market list shows 24 markets and stops. Both `/api/markets` and Gamma's search
  return a way to ask for more; the client discards it.
- The list is always ordered by 24-hour volume. Someone looking for a market closing
  today cannot find one.
- No component handles `Escape`, the bet sheet has no dialog role and no accessible
  name, and neither surface moves focus into itself or restores it on close.
- After a failure, the control that would retry looks exactly like the control that
  started the request, and says the same thing. Recovery is available and invisible.
- Demo positions never change value. The practice balance only ever falls, which
  teaches the opposite of what betting is.

This feature fixes those five in place. It is not a redesign — `002`'s visual
system and `003`'s recommendation flow keep their behaviour.

## What (user stories)

Tag semantics: *(core)* stories block release; *(bonus)* do not.

### UX-1 *(core)* — Reach more than the first page
As someone browsing or searching, I can go beyond the first 24 results.

**Acceptance criteria**
- More results can be loaded without removing the ones already on screen.
- The control to load more is present exactly when more exist upstream, and absent
  when they do not — while browsing *and* while searching.
- A result never appears twice, even if the exchange returns it on two pages.
- Changing the search, category or sort starts a fresh first page: no cursor or page
  number from a previous query is ever sent with a new one.
- The periodic refresh updates what is loaded without discarding later pages.
- A failure to load more leaves what is already shown intact and says what happened.

### UX-2 *(core)* — Order the list by what I care about
As someone browsing, I can order markets by activity or by how soon they end.

**Acceptance criteria**
- At minimum: 24-hour volume (the current default), soonest to end, and total volume.
- The active ordering is readable from the control itself, without opening anything.
- Ordering composes with the category filter rather than resetting it.
- Ordering is a query the exchange performs. Re-ordering the rows already loaded is
  forbidden: it sorts a subset and looks correct.
- **Ordering is unavailable while a text search is active, and says so.** Gamma's
  `/public-search` ignores `order` (verified 2026-08-31 — identical results across
  three orderings), so the only orderable surface is browsing.

### UX-3 *(core)* — Operable by keyboard
As someone using a keyboard or a screen reader, I can complete and cancel a bet
without a mouse, and both bet surfaces announce themselves.

**Acceptance criteria**
- `Escape` closes the confirmation and the mobile bet sheet.
- When either opens, focus moves into it; while open, Tab stays within it; when it
  closes, focus returns to the control that opened it.
- When the confirmation is open above the sheet, exactly one of them is active:
  `Escape` and the focus trap belong to the topmost surface only.
- The bet sheet carries a dialog role and an accessible name.
- Every enabled control reachable by mouse is reachable by keyboard. **Controls
  deliberately disabled are the stated exception** — `BetPanel.tsx:111` and `:133`
  disable outcome and amount inputs when betting is blocked, and a disabled control
  is unfocusable by design. Disabling is how `001 US-5` and Article V refuse a bet;
  making those focusable is not in scope and would weaken that refusal.
- **The constitutional constraint is on what dismissal does, not on what exists
  today: `Escape` must cancel and must never place.** Article II requires an
  explicit confirmation before any bet; a dismissal gesture wired to confirm would
  invert it. This is a requirement on the new handler, not a defect being fixed.

### UX-4 *(core)* — Demo positions are worth something
As someone practising, I can see what my positions are worth now, so the practice
account reflects gains as well as losses.

**Acceptance criteria**
- Each position shows what it cost and what it is worth now, and the difference.
- **Value is quoted from the same source the position was filled at** — the order
  book's buy price for that outcome token (`Widget.tsx:215` fills at
  `fetchPrice(tokenId, "buy")`). Valuing a book-filled cost against the market
  list's price would show a gain or loss the instant a bet is placed, caused by
  nothing but the two sources disagreeing.
- A position whose price cannot be established **now** is shown as not valued. This
  covers: no quote available, a quote that is not a usable price (zero, missing, or
  outside 0–1 — the same range `BetPanel.tsx:42` already treats as no information),
  and a quote too old to call current.
- When a market has closed and the data identifies a winner, the position reads as
  won or lost.
- **When a market has closed but the data identifies no winner, the position reads
  as unresolved and is never reported as a loss.** Verified 2026-08-31: resolved
  markets often report prices of `["0","0"]`, from which nothing follows. Treating
  that as zero would fabricate a settlement the exchange never published.
- Positions that could not be valued are excluded from the totals **and their count
  is stated**, so a total is never a sum that quietly pretends the rest are worth nothing.
- **The spendable practice balance is unchanged by any of this.** It stays the cash
  figure `001 US-3` defines, debited on a bet and nothing else. An unrealised gain
  is displayed, never staked — otherwise a paper gain becomes bettable through
  `BetPanel.tsx:39`'s balance check, silently redefining `001 US-3`.
- Every figure keeps its DEMO labelling (`001 US-3`, `002 VR-3`). Values, totals and
  the difference must each be unmistakably practice money.

### UX-5 *(core)* — Recover without retyping
As someone who hit an error, I can tell how to retry, and retrying does not cost me
what I typed.

**Acceptance criteria**
- Wherever a request the user can retry has failed, the control that retries it says
  so — distinct from the label it carries before the first attempt.
- Retrying re-sends the same request and does not clear what the user typed.
- A retry in flight is disabled and labelled as in progress, so a second press
  cannot start a second request.
- Where a surface already retries by itself, it says so rather than leaving the
  reader to guess.
- **Bet placement is excluded, and this is an Article II requirement, not an
  omission.** A failed placement leaves no confirmation on screen
  (`BetPanel.tsx:66` clears the draft). A control that re-sent it would place a bet
  that passed no confirmation showing market, outcome, amount, price and payout.
  Recovery from a rejected bet is to enter it again, through the confirmation.
- **The geo decision is excluded for the same class of reason.** `Widget.tsx:88`
  fails closed when the region cannot be determined. That refusal is a compliance
  outcome, not a transient error, and must not be re-rolled by a retry button.

## Compliance (Article V)

Article V requires every spec touching betting to state geo handling and disclaimer
placement. The first draft omitted this entirely. Nothing here changes either
mechanism; what follows is what must remain true after this feature lands, and each
is a test, not a promise:

- The geo explanation keeps its position beside the mode toggle (`003 AR-5`), where
  it survives the bet panel being demoted. UX-3's focus work must not move or hide it.
- Real betting stays refused in restricted regions by the same predicate
  (`lib/betting-availability.ts`). UX-3's keyboard criterion explicitly exempts the
  disabled controls that carry that refusal; UX-5 explicitly refuses to retry it.
- The "AI assistance is not financial advice" disclaimer keeps rendering wherever
  suggestions render (`001 US-4`, `002 VR-3`). UX-5 adds an error and retry state to
  that panel, so the disclaimer's co-visibility with suggestions is re-checked with
  those states present.
- UX-4 introduces the feature's one new compliance risk: a panel showing rising
  value could read as real money. DEMO labelling on every value, difference and
  total is an acceptance criterion above, checked in both gates.

## Out of scope

- Anything requiring a wallet: `001`'s Phase 6 stays blocked at T21 and is untouched.
- A new visual direction, or changes to `003`'s recommendation behaviour.
- A market detail view, or any change to the browse → select → bet journey's shape.
- Persisting demo positions across reloads: `001 US-3` makes the balance per-session.
- **Portfolio management as `001` and `002` exclude it** — order history, closing or
  selling a position, realised-P&L accounting. UX-4 values the positions `001 US-3`
  already displays; it adds no history and no way to exit a position. This boundary
  is stated because a cost/value/difference panel sits close to the excluded thing.

## Known amendments to earlier features

Stated here rather than discovered during implementation, since `001` and `002` both
require the specs to describe the system as built:

- **`003 AR-4`'s "at most one confirmation" changes form.** It is currently enforced
  by counting elements with a dialog role (`tests/components/mobile-sheet.test.tsx:111`).
  UX-3 gives the bet sheet a dialog role, which would make that count two. The
  invariant is replaced by one that counts the confirmation itself, by its accessible
  name — strictly more precise, since it counts the thing AR-4 is about rather than
  any dialog. The replacement lands in the same task, and AR-4's meaning is unchanged.

## Context (reference facts — no design)

- `/api/markets` returns `nextCursor` from Gamma's keyset pagination; the client
  discards it (`components/MarketList.tsx:50`).
- Gamma's `/markets/keyset` accepts `order` with `ascending` for `volume24hr`,
  `endDate`, `liquidity` and `volume` (verified 2026-08-31). `startDate` returned
  unusable values.
- Gamma's `/public-search` returns `pagination: {hasMore, totalResults}` and accepts
  `page=N` (verified 2026-08-31). It ignores `order`.
- Closed markets do not consistently identify a winner (verified 2026-08-31): some
  report prices near 1 and 0, others report `["0","0"]`.
- Demo bets fill at the order book's buy price (`Widget.tsx:215`); the market list
  carries Gamma's `outcomePrices`. The two differ.
- `003 AR-1` refreshes only the *selected* market, keyed on `selectedId`
  (`Widget.tsx:45`). It does not cover positions in unselected markets.
- The confirmation carries `role="dialog"` and `aria-modal` (`ConfirmBetDialog.tsx:47`);
  the bet sheet carries neither, and no component handles `Escape`.
- At mobile width the confirmation renders inside the bet sheet
  (`Widget.tsx:361` → `BetPanel.tsx:166`), so the two can be open at once.

## Decision record

- **D1 — Fix in place.** Chosen by the project owner over reworking the journey.
  Existing tests are treated as the regression gate; the single exception is the
  dialog-count assertion named under Known amendments, which is replaced rather than
  deleted, in the same task, with the reason recorded.
- **D2 — All five gaps in one feature.** Small and independent; splitting would cost
  more in process than the work.
- **D3 — Valuation is mark-to-market at the fill's own price source, with settlement
  as its limiting case.** One rule — a position is worth its shares at the current
  book price, and a resolved market's outcome is that price — with two explicit
  refusals: an unusable price is "not valued", never zero, and an unresolved closed
  market is "unresolved", never a loss.
- **D4 — Valuation is display-only.** The spendable balance stays cash. Letting
  paper gains be staked would change `001 US-3` without saying so.

## Open questions

None. The three API facts this feature depends on — keyset ordering, search
pagination, search ordering — were each verified against the live exchange rather
than assumed, after the first draft asserted one of them wrongly.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31
