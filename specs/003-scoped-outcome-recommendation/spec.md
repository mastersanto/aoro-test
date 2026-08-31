# Spec 003 — Scoped Outcome Recommendation

**Status:** Approved 2026-08-31
**Owner:** jorgeivansandoval@gmail.com

Story IDs are prefixed **AR-**. References to other features are written `001 US-4`, `002 VR-2`.

## Why

Today's assistant answers "which market?" — the user describes an interest and gets three markets to choose from. Once they have chosen one, it has nothing more to say, and the panel that helped them sits above the bet form they are now using.

This feature makes the assistant answer the next question — "which side, and why?" — for the market already selected, and reorders the panel so the bet takes precedence once there is a bet to place.

**This is the closest the product comes to the constitution's line, and the spec is written accordingly.** Article II permits it in terms: the assistant *"recommends markets and outcomes with reasoning and current odds"*. What it forbids is placing, and any code path that chains an AI output into a transaction. So the risk this feature introduces is not execution — the confirmation still stands between a recommendation and an order — it is **persuasion**: a fluent, confident argument for one side of a real-money question. Every criterion below exists to keep that argument honest rather than to restrain a mechanism that is already restrained.

## What (user stories)

Tag semantics: *(core)* stories block release; *(bonus)* do not.

### AR-1 *(core)* — A recommendation for the market I am looking at
As someone who has chosen a market, I can ask the assistant which outcome it would favour and why, without leaving the market.

**Acceptance criteria**
- The recommendation is available only when a market is selected, and concerns only that market.
- It names exactly one outcome of that market, and shows that outcome's current price.
- Every figure shown comes from the application's own market data; nothing numeric originates from the model.
- **The recommendation states which market it is about**, so it can never be read as applying to another.
- If the assistant has no usable view, it says so rather than manufacturing a case.

**The argument is bound to the price it was made from.** Article II requires reasoning *with current odds*; an argument anchored to a price that has since moved is no longer that:

- A recommendation records the price it reasoned from and shows it as such.
- A recommendation is **withdrawn, with the reason shown**, as soon as any of these is true: the favoured outcome's price has moved by **more than 2 percentage points** from the price it was argued at; the market has closed or resolved; or the recommendation is more than **10 minutes** old. It never ages silently beside an armed bet entry.
- Those two numbers are the criterion, not illustrations. A tolerance left to the implementer is not a tolerance: it can be set wide enough to permit exactly what this rule exists to prevent, and no test could fail.
- Within the tolerance a small drift is still possible, so the confirmation continues to show the live price — the user is never shown one price and charged another. What this rule prevents is an *argument* outliving the prices that produced it.
- The selected market's data is refreshed on the same cadence as the list, rather than remaining the snapshot captured when it was selected. Without that, "current price" is unenforceable by construction.
- Changing money mode does not invalidate the recommendation — it concerns the market, not the stake — but any pre-filled outcome and any typed amount are cleared, so a stake entered against a practice balance can never carry into a real one.

**Context follows the selection.** The assistant's subject is always the market currently selected — never a previous one:

- Changing the selected market **immediately clears any recommendation for the previous market**. A recommendation for one market is never on screen while another market's bet entry is armed; that is how a user ends up reading the case for A while staking on B.
- Deselecting a market, or returning to no selection, returns the assistant to discovery (AR-6) and clears the scoped recommendation with it.
- **The assistant's typed prompt** is preserved across a selection change; generated recommendations are not. The distinction is deliberate — losing your own words is an annoyance, keeping someone else's advice about the wrong market is a hazard. This explicitly does **not** extend to the bet amount: a stake typed against one market never survives onto another.
- Selecting a market also clears any discovery suggestions naming *other* markets. Three live "use this" controls for markets B, C and D beside market A's armed bet entry is the same hazard on its most likely axis.
- A request in flight when the selection changes — or is cleared — never renders against a market it was not asked about, and never against no selection at all.

### AR-2 *(core)* — The case against is shown with the case for
As someone reading a recommendation, I can see what would have to be true for it to be wrong, not only the argument that it is right.

**Acceptance criteria**
- Every recommendation presents both the reasoning for the favoured outcome **and** what would have to happen for that outcome to lose. A recommendation missing either is withheld, not shown with one side.
- Prominence is measurable, not judged: the counter-case renders in the same container as the case for, at the same type size, and is fully visible whenever the case for is (the co-visibility check feature 002 already established).
- The counter-case is never collapsed, truncated, or placed behind an interaction.
- Neither is conveyed by colour alone.

### AR-3 *(core)* — It reads as an opinion, never as a certainty or an instruction
As a user, I am not told what to do, and I am not given a prediction dressed as a fact.

**What these controls do and do not achieve.** No rule about text reliably prevents a fluent argument from persuading; three adversarial reviews defeated successive versions of this section, each time by paraphrase rather than by finding a loophole in the words. The rules below therefore aim to remove the *forms* persuasion most reliably takes — asserted likelihood, quantities, and claims about the price being wrong — and the spec does not claim more than that. The controls actually load-bearing against a bad bet are elsewhere and are unchanged: the counter-case shown alongside (AR-2), the disclaimer (AR-4), the stake the user types themselves (AR-4), and the confirmation (Art. II). This section reduces harm; it does not eliminate it, and any task or plan claiming otherwise is wrong.

**Structure is the primary control, not filtering.** A denylist of forbidden words does not stop persuasion — "the market is badly underpricing this", "no realistic path for the other side" and "at 12% this is close to free" contain no guarantee, no certainty term and no imperative, and are exactly the harm. So the response is constrained in *shape* first, and screened second.

**Acceptance criteria**
- The recommendation is composed of named, separately rendered parts — what the market resolves on, what its current price implies, the case for the favoured outcome, and what would make that outcome lose — rather than one free-form argument.
- **No part expresses likelihood, confidence, or the sufficiency of evidence, in any form.** Not as a figure, not as a word, not as a construction: no "likely", "clearly", "nine times out of ten", "little stands in the way", "nothing suggests otherwise", "the remaining steps are procedural". This is the criterion the earlier drafts gestured at and never stated, and it is the one that matters — naming a field constrains what it is *about*, not how strongly it argues. Any expression of how probable the outcome is belongs to the market's price, which the application renders itself.
- Each part is **bounded in length**, so the case for cannot become an essay that accumulates force by volume.
- **No quantity appears in any model-authored text — as a digit, a percentage, a monetary figure, or a spelled-out number.** Every figure the user sees is rendered by the application from its own data. Digits alone are not the rule: "nine times out of ten" states a probability as surely as "90%".
- The case for describes **what the market's own resolution criteria require, and what would have to occur to meet them**. It does not characterise the market's price as anything other than what it is: no claim, in any wording, that the price is wrong, lagging, stale, or has failed to account for something.
- No part contains an instruction directed at the user, a claim that an outcome will or will not occur, a claim that the market is mispriced, or any reference to how much to stake.
- The screen runs **server-side**, so a withheld recommendation is never present in the response the browser receives.
- The checks above are together the **content screen**. A recommendation failing any of them is withheld and the user is told plainly that the assistant has no view to offer — never silently replaced, and never re-requested more than once, since unbounded re-generation selects for prose that is persuasive *and* compliant.
- It is attributed as the assistant's reading of current prices.

### AR-4 *(core)* — Nothing about placement changes
As the project owner, I can be sure this adds no new route to a bet.

**Acceptance criteria**
- Pre-filling happens only on an explicit user action. A recommendation never arms the bet form by appearing.
- Acting on one pre-fills the outcome only. It never fills an amount, and no part of the recommendation suggests a stake size, so choosing how much is always the user's own act.
- No path from a recommendation reaches an order without passing the existing confirmation, unchanged (Art. II; `002 VR-2`).
- **At most one** bet-entry surface is mounted at any viewport, and at most one confirmation. Two containers exist — inline and sheet — but never both at once, and on a phone with the sheet dismissed there is legitimately none. *(Amended 2026-08-31 by feature 004 T12, then corrected the same day after audit. This was enforced by counting elements carrying a dialog role; `004 UX-3` gives the bet sheet its own dialog role, which a screen-reader user needs and which makes a bare role count read two. The first replacement counted the confirmation by its accessible name, and an audit showed that was strictly **weaker**: a second confirmation labelled anything other than "Confirm your bet" — a real-money one at Phase 6, which is precisely what this criterion exists to catch — would have passed. The count is now on the confirmation's payout field, which is name-independent and which Article II requires every confirmation to display, so it cannot be renamed or dropped to evade the check. A duplicate bet-entry surface remains caught by the separate outcome-group count.)*
- The "not financial advice" disclaimer is visible together with a recommendation, at both viewports, and states plainly that this is an opinion about prices rather than a prediction (Art. V).

### AR-5 *(core)* — Restricted regions keep the help and lose only the bet
As someone in a region where real betting is unavailable, I still get the assistant, and I am not pushed toward something I cannot do.

**Acceptance criteria**
- The recommendation remains available where real betting is disabled: it is information, and `001 US-5` deliberately preserves browsing, assistance and demo for those users.
- No part of a recommendation suggests working around a regional restriction.
- The geo explanation stays visible alongside the disabled bet entry, exactly as `001 US-5` and `002 VR-3` require — this feature's reordering must not displace it.
- Where real betting is disabled — for a regional reason or any other — the assistant is not demoted beneath a bet entry the user cannot act on (see AR-7).

### AR-6 *(core)* — Discovery is not lost
As someone who has not chosen a market, I still get help choosing one.

**Acceptance criteria**
- With no market selected, the assistant behaves exactly as `001 US-4` specifies: an interest-based search returning grounded market suggestions.
- Switching between the two modes requires no configuration and loses no state the user typed.

### AR-7 *(core)* — The bet leads once it is actionable
As someone who has chosen a market, the thing I came to do is the thing in front of me.

**Acceptance criteria**
- The bet entry leads when it is **actionable** — a market is selected and the current mode can accept a bet.
- The assistant leads whenever the bet entry cannot be acted on, **for any of the reasons the application recognises** — no market selected, an unknown or restricted region, a market the exchange marks restricted, or a wallet the build does not yet provide. Naming only the regional reason would leave the rule undefined for the shipped default, in which real betting is disabled because the wallet is unimplemented. Promoting a dead panel above working help is a defect regardless of which reason killed it.
- On a phone the ordering is satisfied by the sheet presenting over the page when open; with it dismissed no bet entry is mounted and the assistant is the primary surface.
- The sheet opens only when the bet entry is **actionable**. Selecting a market or acting on a recommendation may open it, since both are explicit user actions; neither may present a bet entry the user cannot act on over the assistance they can — that is the same defect, and today's build reaches it in two taps by selecting a market in real-money mode.
- If the bet entry stops being actionable while the sheet is open — a mode change, a region decision arriving, the market becoming restricted — the sheet closes and the assistant returns as the primary surface, rather than remaining open over it in a disabled state.
- Reordering changes no behaviour: every `001` and `002` guarantee still holds, and **both** the behaviour suite and the appearance suite pass unmodified.

## Out of scope

- Any change to how orders are constructed, signed or placed.
- Recommendations across multiple markets at once, or portfolio-level advice.
- Any claim about the user's own position, balance or history.
- Personalisation, memory of past questions, or user profiling.
- Automatic or unprompted recommendations — the user asks each time.

## What binds under Article VII

Exempt as styling: the panel's colour, type and spacing, and the *desktop* ordering change of AR-7, which moves an existing mounted component.

**Not exempt, despite looking like layout:** AR-7 at 390px. There is no inline panel to move at that width — the only bet entry is the sheet, whose mounting is viewport- and state-conditional, and `002` already declared that a state machine. Satisfying "the bet entry leads" on a phone means changing mount or open/dismiss transitions, and the guarantee at risk lives in the behaviour suite, not the appearance suite.

Binding, and written test-first:
- **Grounding** (AR-1): the recommended outcome belongs to the selected market, and no figure in the response originates from the model.
- **The failure branch** (AR-1): "no usable view" is a state transition and error mapping, not copy — it must be reachable and tested.
- **Price currency and withdrawal** (AR-1): that a recommendation is withdrawn when the favoured outcome's price moves more than 2 points from the argued price, when the market closes or resolves, or after 10 minutes, and that the selected market refreshes rather than remaining a snapshot. This is the transition that makes Art. II's "current odds" true, and its absence is invisible until someone acts on a stale argument.
- **Mode transitions** (AR-1): that a mode change clears the pre-filled outcome and typed amount.
- **Context switching** (AR-1): that changing or clearing the selection discards the previous market's recommendation, that typed input survives while generated advice does not, and that an in-flight request cannot land against a market it was not asked about. This is a state machine over an async result — precisely the class Article VII binds, and the class where a stale render is invisible until it matters.
- **Response shape and the content screen** (AR-3): the structural constraint, the no-quantities rule (digits and spelled-out alike), the no-likelihood rule, the no-mispricing rule, per-part length bounds, server-side withholding, and the bounded single retry.
- **Balance** (AR-2): a recommendation without a counter-case is withheld; the counter-case's co-visibility with the case for.
- **The placement guarantees** (AR-4): pre-fill requires an explicit act and fills no amount; **at most one** mounted bet-entry surface and at most one confirmation, none being legitimate on a phone with the sheet dismissed; disclaimer co-visible.
- **Restricted regions** (AR-5): the recommendation remains available, the geo explanation stays visible, and the assistant is not demoted beneath a disabled bet entry.
- **Mode and ordering selection** (AR-6, AR-7): which behaviour and which order apply for a given selection, mode, region, market-restriction and wallet-readiness state. The availability rule itself takes three of these — region, market restriction, wallet readiness — with mode applied at the call site; the ordering rule takes all of them plus selection. Includes the mobile sheet's opening, dismissal, and closure when the entry stops being actionable.

## Context (reference facts for planning)

- Today's assistant is grounded **numerically**, not wholly: the model returns a pair of ids plus reasoning text, and the application rebuilds every *figure* from its own market data while rendering the model's prose verbatim (`001 US-4` already ships model-authored prose). So this feature does not introduce model prose — it makes that prose argumentative, which is the actual change and the actual risk.
- The existing confirmation, its bypass tests, and the single `onPlace` call site are the mechanism Article II relies on. They are unchanged by this feature and remain the gate.
- Feature 002 established two verification gates: behaviour in jsdom, appearance in a real browser, plus written manual checks. AR-2's prominence and AR-4's co-visibility are appearance-gate concerns; the rest are behaviour.
- **Real betting is not implemented in the current build.** Availability evaluates region *before* wallet-readiness, so a user in a blocked, close-only or undetermined region is refused for the regional reason, while a user in a permitted region is refused for the wallet reason. A rule phrased only around regional restriction is therefore undefined for exactly the permitted-region users — which is how AR-7's first draft came to have a gap, and it is the smaller half of the population, not the whole of it.
- The selected market is presently a snapshot captured at selection and is never re-hydrated by the list's 30-second refresh, so its price can drift from the list's own. That is a pre-existing behaviour; this is the first feature to anchor an argument to that price, so it is this spec's job to say what "current" means.
- Today's discovery reasoning is invited to cite figures, while AR-3 forbids model-authored numerals in a scoped recommendation. The asymmetry is deliberate: a recommendation argues for a side, and a number in an argument carries authority a listed suggestion's does not.
- A scoped recommendation sends one market to the model rather than the ~40 discovery sends, so it is cheaper and faster — a consequence, not a goal.

## Known limits

Recorded because a spec that hides these is claiming more protection than it has:

- **A structurally valid counter-case can still be self-defeating.** AR-2 requires the counter-case to be present, equally prominent and co-visible; it cannot require it to be *good*. A counter-case written to be dismissed satisfies every criterion.
- **"Suggests working around a regional restriction" (AR-5) has no mechanical check.** It is a real requirement with no automated enforcement; it belongs in the manual checks feature 002 established.
- **The content screen reduces persuasion; it does not remove it.** See AR-3.

## Decision record

- **D1 — Recommend an outcome, not merely explain the market.** Chosen by the project owner over a description-only assistant, in full knowledge that it is the more consequential option.
- **D2 — Balance is mandatory, not stylistic.** A one-sided argument for a real-money decision is the specific harm this feature could do, so the counter-case is an acceptance criterion with equal prominence rather than a copy guideline.
- **D3 — Discovery is kept.** Replacing it would regress `001 US-4` and remove the assignment's stated bonus.
- **D4 — Pre-fill never includes an amount, and the recommendation never discusses stake size.** The stake is the one decision the assistant must not influence at all; "by default" would have left sizing prose permitted while the field stayed empty.
- **D5 — The residual persuasion risk is accepted knowingly.** Three adversarial reviews defeated successive versions of AR-3 by paraphrase. The project owner was shown that record, together with two narrower alternatives (explain-only, and recommend-without-model-prose), and chose to proceed with the argued recommendation as specified. The Known limits section exists so that choice stays visible to whoever reads this next, rather than being rediscovered.
- **D6 — A recommendation is bound to its market, not to the panel.** Clearing on selection change is a correctness requirement, not tidiness: advice for one market displayed beside another market's armed bet form is the most plausible way this feature causes a wrong bet.
- **D7 — Structure over filtering.** A forbidden-word list is defeatable by fluent prose that contains none of the words. Constraining the response's shape, and forbidding model-authored numerals outright, are the controls that can actually be verified.

## Open questions

None — the scope was settled with the project owner before drafting.

## Approval

- [x] Spec approved by user (required before `/plan-feature`) — 2026-08-31, affirmed after three audit rounds with the Known limits shown
