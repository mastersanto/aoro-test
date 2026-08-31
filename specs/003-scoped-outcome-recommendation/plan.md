# Plan 003 — Scoped Outcome Recommendation

**Status:** Draft — awaiting user approval
**Spec:** ./spec.md (approved 2026-08-31, no open `[NEEDS CLARIFICATION]` markers)

## Stack

No new dependencies. Everything this feature needs already exists in the project.

| Choice | Traces to |
|---|---|
| The existing `@anthropic-ai/sdk` server route pattern | AR-1. A second endpoint alongside `/api/assist`, not a mode flag on it: the two have different inputs, different output shapes and different screens, and one route serving both would make the content screen conditional — exactly where a bypass hides |
| `messages.parse` with a JSON schema, as `/api/assist` already uses | AR-3's structural constraint. Named parts are schema fields; there is no free-text field to return an essay in |
| A pure module for the content screen | AR-3. The screen must be testable without a model call, so it is a function over a candidate response, not logic embedded in the route |
| A pure module for recommendation freshness | AR-1's 2-point / 10-minute rule. Same reason: a withdrawal rule that needs a live price to test is a rule that gets tested loosely |
| No new dependency for text screening | Art. VI. Quantities (digits and spelled-out), length bounds and known likelihood phrasings are plain string work. The spec's rule also reaches *constructions*, which no lexical check fully covers — and no library would either; that gap is recorded in the spec's Known limits rather than papered over with a dependency |

## Architecture

```
POST /api/recommend            NEW — one market in, a structured recommendation or a withholding out
  ├─ validates the market id against Gamma (never trusts the client's copy)
  ├─ Claude, schema-constrained to named parts, no free-text field
  ├─ lib/ai/content-screen.ts  NEW — pure; withholds on any AR-3 violation
  └─ returns {recommendation} | {withheld, reason}   ← never both, never partial

lib/ai/recommendation.ts       NEW — pure: freshness, withdrawal, and the argued-at price
components/RecommendPanel.tsx  NEW — the scoped view
app/api/market/[id]/route.ts   NEW — by-id re-hydration proxy (see below)
components/Widget.tsx          CHANGED — re-hydration, ordering, sheet actionability, mode reset
components/BetPanel.tsx        CHANGED — a mode change clears the chosen outcome and typed amount
components/AssistPanel.tsx     CHANGED — discovery suggestions clear when a market is selected
```

**The screen runs server-side and gates the response body itself.** A withheld recommendation is never serialized, so it cannot be recovered from the network tab — spec AR-3's "never present in the response the browser receives" is a property of the route, not of the component.

**One retry, then withhold.** If the first candidate fails the screen, the route may regenerate once and re-screen. It may not loop: unbounded regeneration selects for prose that is persuasive *and* compliant, which is worse than withholding.

## Data flow

- **Request** carries a market id and nothing else. The route re-fetches that market from Gamma rather than trusting a client-supplied copy, so the price the argument is built on is the server's, and a tampered client cannot induce an argument about a market that does not exist.
- **The model receives** one market: its question, resolution source, outcomes and prices. Not the user's balance, not their mode, not their history — AR-4 and the spec's out-of-scope list.
- **The response** is `{ resolvesOn, priceImplies, caseFor, caseAgainst, favouredTokenId }` from the model — text and ids only, no numeric field in its schema — plus `arguedAtPrice`, **inserted by the route** from the market it fetched. That keeps `spec.md`'s "nothing numeric originates from the model" literally true while giving the withdrawal rule the anchor it needs.
- **Figures the user reads** — the outcome's current price, the payout — are rendered from the client's own market data. `arguedAtPrice` is the one exception and is displayed only as what it is: the price the argument was made at, shown beside the current one when they differ.
- **Grounding** reuses the existing pattern: `favouredTokenId` must belong to the re-fetched market, and the client renders label and price from its own copy — never from the model.
- **Mode changes** clear the chosen outcome and the typed amount (`spec.md` AR-1). Today they survive: both are `BetPanel` local state and the remount key omits mode, so a stake typed against a practice balance would carry into real money. `BetPanel` is therefore a changed file, not an untouched one.
- **Selecting a market clears discovery suggestions naming other markets** (AR-1). Today they are `AssistPanel` local state with no clearing path, so "AssistPanel unchanged" and that criterion cannot both hold. The typed prompt is preserved; the generated list is not.
- **In-flight requests are guarded by a request id**, the pattern `MarketList.tsx` already uses for its own races: a response whose id is not the current one is discarded, so a recommendation asked about one market can never render against another, or against no selection.
- **Withdrawal** is evaluated client-side against the live market: the recommendation carries the price it argued at, and `lib/ai/recommendation.ts` decides `fresh | stale | closed | expired`. Anything but `fresh` withdraws it with the reason shown.

## The snapshot problem (AR-1)

The selected market is captured once at selection (`Widget.tsx:20`) and never re-hydrated, while the list repolls every 30s (`MarketList.tsx:8`). Today that is invisible; under this feature it is the difference between "current odds" and a stale argument.

**Change:** the selected market is re-hydrated **by id from its own endpoint**, not by presence in the list.

The list is not a market feed — it is a query-scoped page of 24, narrowed by the user's search text and category. A selected market leaves that payload when the user types, filters, or the market drops past rank 24 on volume, none of which is closure. Worse, the list is fetched with `closed=false` and filters closed markets out, so through that source a closed market and a filtered-out one are *indistinguishable by construction*. Inferring closure from absence would withdraw a valid recommendation and close the sheet on a market that is open and bettable — a regression on behaviour that works today.

`GET /markets/{id}` on Gamma returns the market with an authoritative `closed` flag (verified 2026-08-31; recorded in the polymarket-api skill). Re-hydration polls that, proxied through a server route like every other Gamma call. Closure is read from the flag; absence from the list means nothing.

This is a change to feature 001's shipped behaviour, and it is an improvement independent of 003 — the bet panel currently prices from the same stale snapshot. It is called out here rather than smuggled in, and 001's spec is amended in the same change (constitution Art. I).

## What re-hydration must not break

Refreshing a market under a live UI is the riskiest thing in this plan, and two paths need explicit rules:

- **An open confirmation must not silently re-price.** The dialog reads its price from the draft captured when the user pressed review. After a poll the panel behind it would render the refreshed price, so the two could disagree. Rule: while a confirmation is open, the draft is authoritative and the dialog shows the price the user is agreeing to; if that price has moved, the dialog says so and requires re-confirmation rather than swapping the number underneath them. `spec.md`'s "never shown one price and charged another" is satisfied by *telling*, not by silently updating.
- **A refresh must never tear down an open confirmation.** Re-hydration updates the market's data in place; it must not change the identity that remounts `BetPanel`, and a market becoming closed while a confirmation is open must surface as a message on the dialog, not as an unmount — the current remount key would otherwise destroy the panel mid-`await` inside `confirm()`.

## Verification (per feature 002's two gates)

- **Behaviour (`npm test`)**: the content screen against a corpus of defeat sentences — including the three that beat earlier drafts — freshness/withdrawal transitions, grounding, mode and selection transitions, the sheet's actionability rule, and that a withheld recommendation carries no partial content.
- **Appearance (`npm run test:visual`)**: the counter-case co-visible with the case for at the same type size; the disclaimer co-visible with a recommendation at both viewports; the assistant not demoted beneath a non-actionable bet entry; the withdrawal notice genuinely visible.
- **Manual (`manual-checks.md`)**: AR-5's "suggests working around a regional restriction", which the Known limits section already records as unenforceable mechanically.

## Environment and deployment

No new environment variables; the route reuses `ANTHROPIC_API_KEY` and the existing model configuration. `.env.example` **is updated in the same change**: its comment currently says the key is used "only by the /api/assist route", which a second consumer makes false. Vercel deployment is unaffected — one more server route.

## Risks and open items

1. **The content screen is the feature's weakest link, by the spec's own admission.** Mitigation is a defeat corpus in the test suite, seeded with every sentence that beat an earlier draft, and treated as a growing artifact: a new defeat found later is added, not argued away.
2. **Re-hydration touches shipped behaviour** used by the bet panel and the geo gate, and the existing suites are *not* a mitigation for it: 154 behaviour tests and 50 appearance checks pass today, but none renders the widget and then changes the search query or re-runs the poll, so nothing in them exercises the snapshot lifecycle this changes. New tests must cover it — the suites staying green is necessary, not sufficient, and treating it as sufficient is how a change like this ships broken.
3. **A second model call per recommendation** when the first is withheld. Bounded at one retry; cost is one market's context, far smaller than discovery's ~40.
4. **Withdrawal could become noisy** if 2 points is too tight for volatile markets, turning a safety rule into a nuisance the user learns to ignore. If observed, the fix is a spec amendment with a stated number, never a quiet widening.

## Constitution check

- **Art. I** — implements approved spec 003; 001's spec is amended in the same change for the re-hydration. **Pass.**
- **Art. II** — no new path to placement: the recommendation pre-fills only on an explicit act, fills no amount, and reaches an order only through the existing confirmation and the single `onPlace` call site. "Current odds" is secured by the withdrawal rule rather than asserted. **Pass.**
- **Art. III** — no wallet, signing or custody code is touched. **N/A.**
- **Art. IV** — the key stays in the existing server-only module; the new route imports it the same way; nothing secret reaches the client. **Pass.**
- **Art. V** — geo is an acceptance criterion (AR-5) with a visual check; the disclaimer's placement is checked at both viewports. **Pass.**
- **Art. VI** — no new dependencies; two new pure modules chosen specifically so the binding logic is testable without a model call. **Pass.**
- **Art. VII** — `tasks.md` is not yet written, so this gate states a requirement rather than certifying compliance: every item in the spec's binding list must map to a RED/GREEN pair, and the styling exemption covers only the panel's appearance, not the ordering state machine at 390px. **Deferred to the `/tasks` gate**, which is where it can be checked.

## Approval

- [ ] Plan approved by user (required before `/tasks`)
