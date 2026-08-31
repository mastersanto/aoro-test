# Spec 003 — Scoped Outcome Recommendation

**Status:** Draft — awaiting user approval
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

**Context follows the selection.** The assistant's subject is always the market currently selected — never a previous one:

- Changing the selected market **immediately clears any recommendation for the previous market**. A recommendation for one market is never on screen while another market's bet entry is armed; that is how a user ends up reading the case for A while staking on B.
- Deselecting a market, or returning to no selection, returns the assistant to discovery (AR-6) and clears the scoped recommendation with it.
- Text the user typed is preserved across a selection change; generated recommendations are not. The distinction is deliberate — losing your own words is an annoyance, keeping someone else's advice about the wrong market is a hazard.
- A recommendation request that is in flight when the selection changes never renders against the new market.

### AR-2 *(core)* — The case against is shown with the case for
As someone reading a recommendation, I can see what would have to be true for it to be wrong, not only the argument that it is right.

**Acceptance criteria**
- Every recommendation presents both the reasoning for the favoured outcome **and** what would have to happen for that outcome to lose. A recommendation missing either is withheld, not shown with one side.
- Prominence is measurable, not judged: the counter-case renders in the same container as the case for, at the same type size, and is fully visible whenever the case for is (the co-visibility check feature 002 already established).
- The counter-case is never collapsed, truncated, or placed behind an interaction.
- Neither is conveyed by colour alone.

### AR-3 *(core)* — It reads as an opinion, never as a certainty or an instruction
As a user, I am not told what to do, and I am not given a prediction dressed as a fact.

**Structure is the primary control, not filtering.** A denylist of forbidden words does not stop persuasion — "the market is badly underpricing this", "no realistic path for the other side" and "at 12% this is close to free" contain no guarantee, no certainty term and no imperative, and are exactly the harm. So the response is constrained in *shape* first, and screened second.

**Acceptance criteria**
- The recommendation is composed of named, separately rendered parts — what the market resolves on, what its current price implies, the case for the favoured outcome, and what would make that outcome lose — rather than one free-form argument. There is no field in which open-ended rhetoric can be returned.
- **No numeral, percentage or monetary figure appears in any model-authored text.** Every figure the user sees is rendered by the application from its own data. This is mechanically checkable and is what makes "states or implies a probability the market does not" enforceable rather than aspirational.
- No part contains an instruction directed at the user, a claim that an outcome will or will not occur, or any reference to how much to stake.
- The screen runs **server-side**, so a withheld recommendation is never present in the response the browser receives.
- A recommendation failing any of the above is withheld and the user is told plainly that the assistant has no view to offer — never silently replaced, and never re-requested more than once, since unbounded re-generation selects for prose that is persuasive *and* compliant.
- It is attributed as the assistant's reading of current prices.

### AR-4 *(core)* — Nothing about placement changes
As the project owner, I can be sure this adds no new route to a bet.

**Acceptance criteria**
- Pre-filling happens only on an explicit user action. A recommendation never arms the bet form by appearing.
- Acting on one pre-fills the outcome only. It never fills an amount, and no part of the recommendation suggests a stake size, so choosing how much is always the user's own act.
- No path from a recommendation reaches an order without passing the existing confirmation, unchanged (Art. II; `002 VR-2`).
- Exactly one bet-entry surface is **mounted** at any viewport, and one confirmation. (Two containers exist — inline and sheet — but never both at once.)
- The "not financial advice" disclaimer is visible together with a recommendation, at both viewports, and states plainly that this is an opinion about prices rather than a prediction (Art. V).

### AR-5 *(core)* — Restricted regions keep the help and lose only the bet
As someone in a region where real betting is unavailable, I still get the assistant, and I am not pushed toward something I cannot do.

**Acceptance criteria**
- The recommendation remains available where real betting is disabled: it is information, and `001 US-5` deliberately preserves browsing, assistance and demo for those users.
- No part of a recommendation suggests working around a regional restriction.
- The geo explanation stays visible alongside the disabled bet entry, exactly as `001 US-5` and `002 VR-3` require — this feature's reordering must not displace it.
- Where real betting is disabled, the assistant is not demoted beneath a bet entry the user cannot act on (see AR-7).

### AR-6 *(core)* — Discovery is not lost
As someone who has not chosen a market, I still get help choosing one.

**Acceptance criteria**
- With no market selected, the assistant behaves exactly as `001 US-4` specifies: an interest-based search returning grounded market suggestions.
- Switching between the two modes requires no configuration and loses no state the user typed.

### AR-7 *(core)* — The bet leads once it is actionable
As someone who has chosen a market, the thing I came to do is the thing in front of me.

**Acceptance criteria**
- The bet entry leads when it is **actionable** — a market is selected and the current mode can accept a bet.
- The assistant leads when the bet entry has nothing to offer: no market selected, or the bet entry is disabled for the region in the current mode. Promoting a dead panel above working help is a defect.
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
- **Context switching** (AR-1): that changing or clearing the selection discards the previous market's recommendation, that typed input survives while generated advice does not, and that an in-flight request cannot land against a market it was not asked about. This is a state machine over an async result — precisely the class Article VII binds, and the class where a stale render is invisible until it matters.
- **Response shape and the screen** (AR-3): the structural constraint, the no-numerals rule, the construction check, server-side withholding, and the bounded single retry.
- **Balance** (AR-2): a recommendation without a counter-case is withheld; the counter-case's co-visibility with the case for.
- **The placement guarantees** (AR-4): pre-fill requires an explicit act and fills no amount; exactly one mounted bet-entry surface; one confirmation; disclaimer co-visible.
- **Restricted regions** (AR-5): the recommendation remains available, the geo explanation stays visible, and the assistant is not demoted beneath a disabled bet entry.
- **Mode and ordering selection** (AR-6, AR-7): which behaviour and which order apply for a given selection, mode and region state — including the mobile sheet's mounting.

## Context (reference facts for planning)

- Today's assistant is grounded **numerically**, not wholly: the model returns a pair of ids plus reasoning text, and the application rebuilds every *figure* from its own market data while rendering the model's prose verbatim (`001 US-4` already ships model-authored prose). So this feature does not introduce model prose — it makes that prose argumentative, which is the actual change and the actual risk.
- The existing confirmation, its bypass tests, and the single `onPlace` call site are the mechanism Article II relies on. They are unchanged by this feature and remain the gate.
- Feature 002 established two verification gates: behaviour in jsdom, appearance in a real browser, plus written manual checks. AR-2's prominence and AR-4's co-visibility are appearance-gate concerns; the rest are behaviour.
- A scoped recommendation sends one market to the model rather than the ~40 discovery sends, so it is cheaper and faster — a consequence, not a goal.

## Decision record

- **D1 — Recommend an outcome, not merely explain the market.** Chosen by the project owner over a description-only assistant, in full knowledge that it is the more consequential option.
- **D2 — Balance is mandatory, not stylistic.** A one-sided argument for a real-money decision is the specific harm this feature could do, so the counter-case is an acceptance criterion with equal prominence rather than a copy guideline.
- **D3 — Discovery is kept.** Replacing it would regress `001 US-4` and remove the assignment's stated bonus.
- **D4 — Pre-fill never includes an amount, and the recommendation never discusses stake size.** The stake is the one decision the assistant must not influence at all; "by default" would have left sizing prose permitted while the field stayed empty.
- **D5 — A recommendation is bound to its market, not to the panel.** Clearing on selection change is a correctness requirement, not tidiness: advice for one market displayed beside another market's armed bet form is the most plausible way this feature causes a wrong bet.
- **D6 — Structure over filtering.** A forbidden-word list is defeatable by fluent prose that contains none of the words. Constraining the response's shape, and forbidding model-authored numerals outright, are the controls that can actually be verified.

## Open questions

None — the scope was settled with the project owner before drafting.

## Approval

- [ ] Spec approved by user (required before `/plan-feature`)
