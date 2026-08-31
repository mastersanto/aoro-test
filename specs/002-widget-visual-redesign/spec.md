# Spec 002 — Widget Visual Redesign

**Status:** Draft — awaiting user approval
**Owner:** jorgeivansandoval@gmail.com

**Viewports.** "Desktop" means 1280px wide; "mobile" means 390px wide. Every visibility criterion below is asserted at both unless it names one.

Story IDs in this feature are prefixed **VR-** so they never collide with feature 001's US- ids. References to 001's stories are written `001 US-2`.

## Why

Feature 001 shipped the widget's behavior; its presentation is deliberately plain — neutral greys, body copy on a system stack, uniform cards. That reads as a prototype, not as a place someone would risk money. Prediction-market users expect the visual language of an exchange: dense scannable rows, prices as first-class numerals, and enough contrast that odds are legible at a glance.

A design direction was explored on a canvas and approved by the project owner. This feature applies it to the shipped surfaces.

**What this feature is not.** It adds no behavior. But "only a reskin" is exactly the assumption that lets a redesign quietly weaken a safety surface, so this spec states the safety outcomes in visual terms — *visible*, *unscrolled*, *not colour-alone* — rather than restating 001's criteria and trusting they still hold.

## What (user stories)

Tag semantics: *(core)* stories block release; *(bonus)* do not.

### VR-1 *(core)* — Markets are scannable at a glance
As someone browsing markets, I can compare many markets quickly, reading each one's odds, activity and deadline without stopping to parse a card.

**Acceptance criteria**
- Markets present as a dense list with aligned columns rather than uniform blocks.
- Each row carries everything the shipped card carries today — question, outcomes with prices, 24h volume, **total volume**, end date. No field is dropped; this feature removes no content.
- Prices are set so digits align down the column.
- Each market shows its outcome split proportionally, so relative probability is readable without reading numbers.
- The selected market is distinguishable from unselected ones by more than colour alone.
- The list's non-market states — loading, empty, error, stale-data — each remain visible and legible in the new layout.

### VR-2 *(core)* — The confirmation stays fully visible
As someone about to bet, I see everything I am agreeing to at once, on any screen, without hunting for it.

**Acceptance criteria**
- Market, outcome, amount, price and estimated payout are **simultaneously visible without interaction** — not behind a disclosure, tab, tooltip, hover or scroll — at both viewports.
- None of the five is conveyed by colour alone, and none is rendered visually hidden.
- **Every** bet-entry surface, including any mobile sheet or compact layout, routes through the same single confirmation. A second entry point with its own confirmation is a defect, not a variant.
- The market question is rendered in full in the confirmation — wrapped, never clipped or ellipsised — at both viewports.

### VR-3 *(core)* — Safety signals survive the reskin
As the project owner, I can be sure the redesign changed appearance only, and that every signal 001 established is still doing its job.

**Acceptance criteria**
- DEMO labelling is unmistakable, at both viewports, on every bet-like control, **every result of a bet**, the balance, the confirmation and every position row — matching `001 US-3`, which says "control and result".
- One colour is reserved exclusively for the demo signal and used for nothing else; a viewer can tell demo from real without reading text.
- The "not financial advice" disclaimer is visible together with AI suggestions without scrolling, at both viewports.
- Where real betting is disabled, its explanation is visible on the same screen as the disabled control at both viewports — not only in a collapsed region or off-screen.
- Outcome identity (which side is which) is never conveyed by colour alone. Wherever an outcome is the thing being bet on — the bet panel and the confirmation — its label appears in full, not abbreviated; compact list rows may abbreviate.
- The accessible names and visible text the feature-001 tests query are unchanged, so those tests keep asserting what they were written to assert.

### VR-4 *(core)* — Usable on a phone
As someone on a phone, I can browse and place a demo bet without pinching or mis-tapping.

**Acceptance criteria**
- Works at 390px wide with no horizontal scrolling.
- Every interactive control is at least 44px tall.
- The bet entry is reachable without scrolling past the whole market list.
- No painted device chrome (no fake status bar or keyboard).

### VR-5 *(core)* — One coherent look
As a future contributor, I can add a surface that looks like it belongs without guessing.

**Acceptance criteria**
- Styling values are defined once and reused, so two surfaces showing the same kind of thing look the same.
- Text remains legible and the layout stable if a webfont fails to load.
- Text meets WCAG AA contrast (4.5:1 body, 3:1 large text) against its background.

### VR-6 *(core)* — The redesign's guarantees are actually verified
As the project owner, I can see that VR-2 through VR-5 are checked by something that can fail, rather than asserted in prose.

**Acceptance criteria**
- Each VR-2 and VR-3 visibility guarantee has a check that fails when the guarantee is broken — hiding a confirmation field, collapsing it behind a disclosure, pushing the disclaimer off-screen at 390px, or removing a DEMO signal must each turn something red.
- Presence-in-the-DOM alone does not satisfy any of them: a check that would still pass with the element visually hidden or off-screen does not count.
- VR-4's 44px minimum and VR-5's contrast ratios are measured, not eyeballed.
- The checks run in the project's normal test command, so a later change cannot pass review without them.
- Where a guarantee genuinely cannot be automated, it is listed explicitly as a manual check with the steps to perform — an honest gap, not silence.

## Out of scope

- Any behavior change: no new endpoints, no changed flows, no content removed or added.
- Real betting (`001 US-2`, Phase 6) — this redesign must not depend on it, and must style its disabled state.
- Light mode, theming, or a user-facing appearance setting.
- Motion beyond simple visual transitions. *(This exclusion is about animation only. It does not exempt application state transitions, which bind under constitution Article VII — see "What binds" below.)*
- Any portfolio or position-history view beyond what 001 ships.

## What binds under Article VII

Article VII exempts "styling and layout". Framing this whole feature as visual would wrongly exempt work that is not. These parts **bind** and are written test-first:

- **The proportional outcome bar.** Its geometry is derived from price — that is price math, and a mis-scaled bar misstates odds while every numeral on screen stays correct.
- **The market list's state handling.** Restructuring it touches the debounced query, the stale-response race guard, the stale-data flag, and error-message mapping. These are state transitions and error mapping, and they have **no dedicated component tests today** — this feature adds them before restructuring.
- **The market row's queryable contract.** The list is not untested: six assertions in `tests/components/geo-degrade.test.tsx` and `tests/components/demo-flow.test.tsx` select a market by its heading role and then its enclosing `role="button"`. Turning cards into dense rows may legitimately change those roles. If it does, the replacement must be made **in the same change**, selecting the equivalent element by an equivalent accessible role, and reviewed as a deliberate contract change. Deleting or weakening one of those assertions to make a layout compile is a defect — that is the exact failure this spec exists to prevent.
- **Any mobile bet-entry sheet.** Open/dismiss/viewport-conditional mounting is a state machine.
- **The VR-2 and VR-3 visibility guarantees**, and VR-6 as a whole. Assertions that the five fields, the disclaimer and the DEMO signals are actually visible and unscrolled, since presence-in-DOM does not imply visible.

Genuinely exempt: type, spacing, radii, iconography, colour *choices*, and pure layout that changes no state.

Colour is exempt only as aesthetics. Where colour carries meaning — the demo signal's exclusive colour (VR-3) and any outcome or state a user acts on — it is a safety signal, not styling, and binds.

The plan must also state **how** the VR-2/VR-3 visibility criteria and VR-4's 44px and VR-5's contrast are actually verified. jsdom performs no layout and applies no cascade, so `toBeInTheDocument()` cannot satisfy any of them; a plan that claims it does fails this gate. Whatever mechanism the plan chooses is a dependency decision and needs its Article VI justification.

## Context (reference facts for planning)

- The approved mockups live in `design/widget-terminal/` (`Main`, `Assist`, `Confirm`, `Mobile`) and on the shared design canvas. They are the visual reference, not a specification: where a mockup and this spec disagree, this spec wins. Specific type, colour and spacing choices are plan-level decisions.
- The market list's state handling, error mapping and row content are now covered by `tests/components/market-list.test.tsx`, added to feature 001 before this feature was planned precisely so the redesign has a real gate there. Those tests were mutation-checked: removing the race guard, dropping the total-volume field, and leaking upstream detail into an error each turn exactly one of them red.
- **Feature 001's test suite is a necessary but insufficient gate.** Those tests run in jsdom and assert DOM presence and text content, not visibility, size, contrast or position. A reskin can pass every one of them while hiding a required field. This is why VR-2 and VR-3 state visibility outcomes the plan must find a way to verify.
- The shipped surfaces this feature restyles: market list and cards; bet panel and confirmation dialog; AI assist panel; demo positions; geo notice; and three surfaces in the widget shell that VR-3 constrains directly — the **money-mode toggle** (Demo / Real money: the single control deciding whether a bet is real), the **DEMO balance banner**, and the **bet-result notice**.
- One colour currently carries exactly one meaning — demo. Reusing it for anything else would destroy that signal.
- The app **already loads webfonts** (a sans and a mono, the mono setting every price and payout); body copy alone falls back to a system stack. VR-5's fallback criterion therefore concerns existing dependencies — the plan should not assume it is starting from none.
- The approved mockups also contain elements feature 001 does not ship (quick-amount chips, an inline price/shares/payout summary, a shares row in the confirmation, a live indicator, a "last refreshed" line). Under "no content added" they are **out of scope** for this feature; adding any of them is a separate spec change, not an implementation detail.

## Decision record

- **D1 — A separate feature, not an amendment to 001.** The redesign is separably shippable and touches no 001 user story; folding it in would require re-approving 001's task list and would blur "what shipped" against "how it looks".
- **D2 — Direction chosen from three candidates.** A dark, data-first "trading terminal" direction, over "fintech clean" and "bold editorial", approved by the project owner on the design canvas.
- **D3 — Static mockups, not a prototype.** They exist to judge appearance; behavior is already specified and tested in 001. Nothing in `design/` is imported by the application.

## Open questions

None — the direction was settled with the project owner before drafting, and this feature adds no behavior.

## Approval

- [ ] Spec approved by user (required before `/plan-feature`)
