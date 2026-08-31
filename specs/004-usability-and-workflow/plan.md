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

1. **Text search cannot paginate or sort.** `searchMarkets` (`lib/polymarket/gamma.ts:144`)
   calls Gamma's `/public-search`, which returns events with nested markets and
   **no cursor** — `app/api/markets/route.ts:52` hardcodes `nextCursor: null` for
   the search branch, correctly. `/public-search` takes no `order` either.
   Browsing (`/markets/keyset`) supports both.
   **Consequence:** UX-1 and UX-2 apply to browsing. During a search the "Load
   more" control is absent and sorting is unavailable with a stated reason. The
   alternative — sorting the ≤20 rows a search returned — is precisely the
   "silently sorts a subset and looks correct" failure UX-2 rules out.
2. **The list's 30-second refresh replaces `markets` wholesale**
   (`components/MarketList.tsx:50`). Once pages accumulate, that same refresh
   would truncate the list back to page 1 — a regression the user would read as
   "the app keeps losing my place". Refresh must merge into what is loaded, not
   replace it.
3. **`app/api/markets/route.ts` already accepts and caches on `cursor`**
   (line 39, 42). UX-1 needs no new server capability, only a client that keeps
   the cursor and a sort parameter added to the cache key.
4. **Demo positions carry `tokenId` and `marketId`** (`lib/demo.ts:11`) but the
   widget only holds the *selected* market. Valuing a position needs a price for
   a market that may not be on screen, so UX-4 needs a way to quote several
   markets at once.
5. **The confirmation already carries `role="dialog"` and `aria-modal`**
   (`components/ConfirmBetDialog.tsx:46`); the bet sheet carries neither. Neither
   traps focus, neither restores it, and `grep -rn "Escape" components/` returns
   nothing.

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

One hook, `useDialog({open, onDismiss})`, returning a ref to attach to the dialog
box. It owns: focusing the first focusable element on open, containing Tab and
Shift+Tab within the container, closing on `Escape`, and restoring focus to the
previously focused element on close. `BetSheet` also gains `role="dialog"`,
`aria-modal` and a label.

**Escape maps to `onCancel`, never `onConfirm`.** Article II's confirmation is the
point of the dialog; a dismissal gesture that placed a bet would be the exact
inversion of it. The `T11` bypass suite is extended rather than modified.

### UX-4 — `lib/demo-valuation.ts` (new, pure) + `GET /api/quotes` (new route)

The valuation rule, given a position and a quote for its market:

| Quote | Status | Value |
|---|---|---|
| absent (market not quoted, or gone) | `unknown` | none |
| open, price is a finite number | `open` | `shares × price` |
| open, price missing | `unknown` | none |
| closed, held outcome ≥ 0.99 | `won` | `shares × 1` |
| closed, a *different* outcome ≥ 0.99 | `lost` | `0` |
| closed, no outcome ≥ 0.99 | `unresolved` | none |

The last row is the one that matters. Verified 2026-08-31: resolved markets often
report `outcomePrices` of `["0","0"]`. The obvious rule — "value it at its price"
— reads that as zero and reports a **loss**, inventing a settlement the exchange
never published. `unresolved` carries no value and is excluded from the totals,
which are reported as "N positions could not be valued" rather than silently
summed as if they were worth nothing.

`GET /api/quotes?ids=a,b,c` returns `{quotes: {[marketId]: {closed, outcomes:
[{tokenId, price}]}}}` via `fetchMarketById` — the same endpoint `003` already
uses for the selected market, so closure comes from the authoritative flag rather
than from absence from a query-scoped list. Ids are capped at 20 and the response
is cached for the same 30 seconds as everything else. A market that 404s is simply
absent from the map, which the table above turns into `unknown` — not a loss.

The widget quotes its positions' markets on the existing 30-second cadence
(`MARKET_REFRESH_MS`), not a new clock.

Every value keeps the DEMO framing that `001 US-3` and `002 VR-3` require.

### UX-5 — retry at each failure site

- `AssistPanel`: a "Try again" button in the error block, calling the same `ask()`.
  The prompt is already held in state and is not cleared, so the input survives;
  the existing `if (!trimmed || loading) return` guard is what prevents a double
  fire.
- `RecommendPanel`: the same, calling `onRequest`, guarded by `recLoading`.
- `MarketList`: a "Retry now" button, plus text stating that it also retries by
  itself — it already does, every 30 seconds, and a user who cannot see that is
  being asked to guess.
- The widget's own error banner reports a rejected demo bet (a stake above the
  practice balance). That is a validation failure, not a failed request: retrying
  the same input would fail identically, so it gets no retry button. Stated here
  so its absence is a decision rather than an oversight.

## Data flow (changed paths only)

```
browse:  MarketList(sortId, cursor) → /api/markets?sort=&cursor= → fetchMarkets(order, ascending, cursor)
                                    → appendPage / mergeRefresh → rows
search:  MarketList(q)              → /api/markets?q= → searchMarkets → rows   (no cursor, no sort)
demo:    Widget(positions)          → /api/quotes?ids= → fetchMarketById ×n → valuePositions() → DemoPositions
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
- **Article V (compliance is a requirement)** — the geo explanation and the "not
  financial advice" disclaimer keep their positions. UX-4 is the live risk: a
  panel showing gains could read as real money, so DEMO labelling on the values
  and totals is an acceptance criterion, checked in both gates.
- **Article VI (verification)** — three gates unchanged: `npm run verify` must be
  green, and the new controls get appearance checks because jsdom cannot see a
  control that is 20px tall or off-screen.
- **Article VII (test-first)** — RED/GREEN pairs for the five binding items named
  in the spec. The appearance of the new controls is exempt as styling.

**No conflicts found.** The one judgement call worth flagging: UX-3 is argued as
an Article II matter above. If that reading is rejected the work still stands as
plain accessibility — nothing depends on the classification except the priority.

## Risks

1. **Sorting by `endDate` on open markets may surface markets ending within
   minutes**, which are the worst ones to bet on. Mitigation: none in code — the
   end date is already on every row, and hiding markets the exchange lists open
   would be a bigger lie than showing them. Noted so it is a known consequence.
2. **`/api/quotes` fans out to N Gamma requests.** Capped at 20 ids and cached 30s.
   A session's demo positions are typically fewer than five.
3. **The 0.99 settlement threshold is a judgement.** Observed resolved markets
   report `0.9999989…`; a market genuinely trading at 0.995 while open is
   unaffected, because the rule applies only when `closed` is true.

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
