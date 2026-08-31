# Plan 004 — Usability and Workflow

**Status:** Approved 2026-08-31
**Spec:** ./spec.md (approved 2026-08-31)

## Approach

Five independent fixes inside the shipped architecture. No new dependency, no new
external service, no change to the data path: `002`'s visual system and `003`'s
recommendation flow keep their current behaviour, and both existing suites must
pass unmodified.

The shape of each fix is the same: pull the decision into a pure module under
`lib/`, test that module directly, and leave the component rendering it. That is
what makes Article VII's binding items testable in jsdom, which performs no
layout — the appearance of the new controls goes to the Playwright gate instead.

## Constraints discovered in the code (these shape the design)

1. **Search paginates by page number; browsing paginates by cursor.**
   `/public-search` returns `pagination: {hasMore, totalResults}` and accepts
   `page=N`; `/markets/keyset` returns `next_cursor` and accepts `after_cursor`
   (both verified 2026-08-31). `searchMarkets` (`lib/polymarket/gamma.ts:144`)
   discards the pagination block and `app/api/markets/route.ts:52` hardcodes
   `nextCursor: null` for the search branch.
   **Consequence:** UX-1 covers both, behind one client-side notion of "there is
   more" — the route returns an opaque `nextCursor` either way, and only the
   route knows whether it holds a cursor or a page number.
   `/public-search` **ignores `order`** (verified: identical results across three
   orderings), so UX-2 is browse-only and the sort control says so during a
   search. Sorting the ≤20 rows a search returned would sort a truncated subset
   and look correct — the failure UX-2 exists to prevent.
2. **The list's 30-second refresh replaces `markets` wholesale**
   (`components/MarketList.tsx:50`). Once pages accumulate, that same refresh
   would truncate the list back to page 1 — a regression the user would read as
   "the app keeps losing my place". Refresh must merge into what is loaded, not
   replace it.
3. **`app/api/markets/route.ts` already accepts and caches on `cursor`**
   (line 39, 42). UX-1 needs no new server capability, only a client that keeps
   the cursor and a sort parameter added to the cache key.
4. **Demo positions carry `tokenId` and `marketId`** (`lib/demo.ts:11`) but the
   widget only holds the *selected* market: `003`'s refresh is keyed on
   `selectedId` (`Widget.tsx:45`) and the list's own refresh is query-scoped.
   Neither covers a position in an unselected market, so UX-4 needs its own way
   to quote several positions at once.
5. **Demo bets fill at the order book's buy price** (`Widget.tsx:215`,
   `fetchPrice(tokenId, "buy")`), not at Gamma's `outcomePrices`. Valuing against
   Gamma would show a gain or loss the moment a bet is placed, from nothing but
   the two sources disagreeing. UX-4 quotes the book.
6. **At mobile width the confirmation renders inside the bet sheet**
   (`Widget.tsx:361` → `BetPanel.tsx:166`), so both can be open at once, and
   `tests/components/mobile-sheet.test.tsx:111` asserts exactly one element with
   a dialog role. Giving the sheet that role makes it two — see UX-3 below.
7. **The confirmation already carries `role="dialog"` and `aria-modal`**
   (`components/ConfirmBetDialog.tsx:46`); the bet sheet carries neither. Neither
   traps focus, neither restores it, and `grep -rn "Escape" components/` returns
   nothing. Cancel *is* reachable by Tab today — the first draft of this plan
   claimed otherwise and was wrong.

## Architecture

### UX-1/UX-2 — `lib/market-page.ts` + `lib/market-sort.ts` (new, pure)

`market-page.ts` is the pagination state machine as data:

- `appendPage(existing, incoming)` — concatenates, dropping any market whose id
  is already present, preserving first-seen order. Gamma is keyset-paginated, so
  a market whose volume changes between requests can legitimately appear on two
  pages; without this the same row renders twice.
- `mergeRefresh(existing, fresh)` — updates in place by id and keeps every
  already-loaded market that the refresh did not mention. This is what makes
  constraint 2 safe.

`market-sort.ts` holds `SORT_OPTIONS` as data — `{id, label, order, ascending}`
for `volume24hr` desc (default, today's behaviour), `endDate` asc, `volume` desc,
`liquidity` desc. All four verified against Gamma 2026-08-31. `startDate` returned
unusable values and is deliberately absent.

`fetchMarkets` gains `order`/`ascending`; the route maps a `sort` query parameter
through `SORT_OPTIONS` and **falls back to the default for an unknown id** — user
input never reaches the upstream query string directly. `sort` joins the cache key.

`MarketList` keeps `cursor`, `loadingMore`, and `sortId`. Changing search,
category or sort resets the cursor and the accumulated list together, in one
state transition, so a cursor from the previous query can never be sent with the
new one.

### UX-3 — `lib/use-dialog.ts` (new hook) applied to both surfaces

One hook, `useDialog({open, onDismiss})`, returning a ref for the dialog box. It
owns: focusing the first focusable element on open, containing Tab and Shift+Tab,
closing on `Escape`, and restoring focus to the previously focused element on close.

**It keeps a module-level stack of open dialogs, and only the topmost one is
active.** At mobile width the confirmation renders *inside* the bet sheet
(constraint 6), so both are open together. Two independent traps would fight over
focus, and one `Escape` would close both. Registering on open and de-registering on
close makes "topmost wins" a property of the hook rather than something each caller
has to arrange, and it is directly testable.

`BetSheet` gains `role="dialog"` and an accessible name. It does **not** gain
`aria-modal`: the confirmation that can sit above it is the modal, and announcing
two nested modals would misdescribe the page to a screen reader.

**The `003 AR-4` amendment.** `tests/components/mobile-sheet.test.tsx:111` enforces
"at most one confirmation" by counting elements with a dialog role. The sheet's new
role makes that two. The assertion is replaced in the same task by one that counts
the confirmation by its accessible name ("Confirm your bet"), which counts the thing
AR-4 is about instead of any dialog. This is the one existing assertion 004 changes;
D1 names it, and `003`'s spec records it.

**Escape maps to `onCancel`, never `onConfirm`** — the constraint UX-3 states. The
`001` T11 bypass suite is extended to cover the keyboard path; those tests drive
click, submit and Enter only, so they continue to pass unmodified.

### UX-4 — `lib/demo-valuation.ts` (new, pure) + `GET /api/quotes` (new route)

Given a position and a quote for it:

| Quote | Status | Value |
|---|---|---|
| absent (not quoted, or the market is gone) | `unvalued` | none |
| stale — older than `MAX_QUOTE_AGE_MS` | `unvalued` | none |
| price is not a usable number (0, missing, or outside 0–1) | `unvalued` | none |
| market open, price usable | `open` | `shares × price` |
| market closed, held outcome ≥ `SETTLED` (0.99) | `won` | `shares × 1` |
| market closed, a *different* outcome ≥ `SETTLED` | `lost` | `0` |
| market closed, no outcome ≥ `SETTLED` | `unresolved` | none |

Three rows carry the weight. **`unresolved`**: resolved markets often report
`["0","0"]` (verified), and the obvious rule — "value it at its price" — reads that
as a loss the exchange never published. **`unvalued` for an unusable price**: the
same fabrication in the open case, and `BetPanel.tsx:42` already treats a price
outside 0–1 as no information. **`unvalued` for a stale quote**: `Widget.tsx:53`
deliberately keeps the last good market data through an outage, so without an age
check a frozen number would be labelled "current value".

Neither `unvalued` nor `unresolved` contributes to the totals, and the count of each
is reported beside them — a total that silently omits positions is a total that
claims the rest are worth nothing.

**The quote is the order book's buy price** for the held token — the same measure
`Widget.tsx:215` fills at. `GET /api/quotes?tokens=…&markets=…` returns, per token,
that price, and per market, Gamma's authoritative `closed` flag (the same
`fetchMarketById` `003` uses, so closure never comes from absence from a
query-scoped list). Ids are capped and the response cached for the usual 30 seconds.
A market that 404s is simply absent, which the table turns into `unvalued`.

**The spendable balance does not move.** `DemoState.balanceUsd` stays the cash
figure `001 US-3` defines. Valuation is display-only: a paper gain that became
stakeable through `BetPanel.tsx:39`'s balance check would redefine US-3 silently.
The panel therefore shows cash and position value as separate figures, both DEMO.

### UX-5 — make the existing recovery visible, and refuse it where it is unsafe

The first draft of this plan said the assist panel offered nothing to press. It was
wrong: the button stays mounted and enabled and the prompt survives
(`AssistPanel.tsx:82`). The gap is that it still reads "Get suggestions", so nothing
marks it as the way back from a failure.

- `AssistPanel` and `RecommendPanel`: after a failure the existing action relabels
  ("Try again"), and reads as in-progress while a retry is in flight. No second
  control, no duplicated request path — the existing `if (!trimmed || loading)`
  and `recLoading` guards already prevent concurrency.
- `MarketList`: a retry control, plus text saying it also retries by itself — it
  already does, every 30 seconds, and a reader who cannot see that is being asked
  to guess.
- **Bet placement gets no retry** (Article II). A failed placement has already
  cleared the draft (`BetPanel.tsx:66`), so a control that re-sent it would place a
  bet past no confirmation. Today that re-spends demo money; at Phase 6 it would
  re-submit a signed order.
- **The geo decision gets no retry** (Article V). `Widget.tsx:88` fails closed when
  the region is unknown; that is a compliance outcome, not a transient error.

## Data flow (changed paths only)

```
browse:  MarketList(sortId, cursor) → /api/markets?sort=&cursor=  → fetchMarkets(order, ascending, after_cursor)
search:  MarketList(q, cursor)      → /api/markets?q=&cursor=     → searchMarkets(page)      (no sort)
         both                        → appendPage / mergeRefresh → rows
demo:    Widget(positions)          → /api/quotes?tokens=&markets= → fetchPrice ×n + fetchMarketById ×n
                                    → valuePositions() → DemoPositions
```

## Environment and deployment

No new environment variables; `.env.example` is unchanged. No new dependency.
Deployment is unaffected — the same Vercel project and build.

## Constitution check

- **Article I (spec before code)** — every change traces to a UX story above.
- **Article II (AI suggests, humans decide)** — the surface most at risk here is
  UX-3. Escape and the focus trap are applied so that *dismissal cancels*; the
  single `onPlace` call site inside `confirm()` is untouched, and the bypass
  suite is extended to cover the keyboard path rather than edited.
- **Article III (custody)** — untouched; nothing here goes near a wallet, and the
  feature explicitly excludes `001`'s blocked Phase 6.
- **Article IV (secrets server-side)** — `/api/quotes` calls Gamma, which needs no
  key. Nothing new reaches the client bundle.
- **Article V (compliance is a requirement)** — the first draft of this feature
  omitted Article V entirely; the spec now carries a Compliance section, and these
  are its plan-side consequences. The geo explanation keeps its `003 AR-5` position
  beside the mode toggle, which the focus work must not disturb. The disabled
  controls that carry the regional refusal stay disabled and therefore unfocusable —
  UX-3's keyboard criterion exempts them explicitly rather than by silence. The geo
  decision gets no retry. The "not financial advice" disclaimer's co-visibility with
  suggestions is re-checked with UX-5's new error and retry states present. UX-4 is
  the new risk: DEMO labelling on every value, difference and total, in both gates.
- **Article VI (verification)** — three gates unchanged: `npm run verify` must be
  green, and the new controls get appearance checks because jsdom cannot see a
  control that is 20px tall or off-screen.
- **Article VII (test-first)** — RED/GREEN pairs for every binding item, which after
  the audit includes the dialog role and the topmost-wins rule, the Article V
  invariants UX-3 and UX-5 cross, and each row of the valuation table. Exempt as
  styling: only the *appearance* of the new controls. Criteria about whether
  something is visible, tappable or in a sensible focus order are not styling and go
  to the appearance gate, which runs a real browser — jsdom performs no layout.

**One conflict, resolved explicitly:** UX-3's dialog role collides with `003 AR-4`'s
count-based enforcement. Handled as a recorded amendment (above) rather than by
loosening the invariant, and `003`'s spec is updated in the same change.

## Risks

1. **Sorting by `endDate` on open markets may surface markets ending within
   minutes**, which are the worst ones to bet on. Mitigation: none in code — the
   end date is already on every row, and hiding markets the exchange lists open
   would be a bigger lie than showing them. Noted so it is a known consequence.
2. **`/api/quotes` fans out to N book + N market requests.** Capped and cached 30s;
   a session's demo positions are typically fewer than five. A single failed quote
   degrades to `unvalued` for that position rather than failing the response.
3. **The 0.99 settlement threshold is a judgement.** Observed resolved markets
   report `0.9999989…`; a market genuinely trading at 0.995 while open is
   unaffected, because the rule applies only when `closed` is true.

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
