# Manual checks — feature 002

VR-6 requires that any guarantee neither suite can judge is listed here with
steps, rather than left unmentioned. This is the honest remainder after the
automated gates: `npm test` (behavior) and `npm run test:visual` (appearance).

Each entry says *why* it is not automated. "Hard to automate" is not a reason to
skip a check — it is a reason to write it down.

## MC-1 — No painted device chrome (VR-4)

**Why manual:** a fake status bar or keyboard is a *drawing*; no assertion can
distinguish a decorative bar from real UI without knowing intent.

**Steps:** open the deployed URL at 390px. Confirm the widget draws no imitation
of a phone status bar (no clock, battery or signal glyphs) and no fake keyboard.
The real ones belong to the device.

**Result 2026-08-31:** PASS — the redesign paints neither. The mobile artboard
that informed it deliberately contains none.

## MC-2 — The design reads as intended at a glance (VR-1)

**Why manual:** "scannable" is a judgement. The automated checks cover the
mechanical parts (aligned columns, tabular numerals, a proportional bar, contrast);
whether the result is actually easy to scan is not measurable.

**Steps:** open the deployed URL. Confirm that comparing two markets' odds needs
no reading of prose, and that the selected market is obvious.

**Result 2026-08-31:** PASS — dense rows with the split bar make relative
probability readable without reading the numbers.

## MC-3 — Webfont failure degrades rather than breaks (VR-5)

**Partly automated:** a visual check blocks the font files and asserts the layout
still holds (no horizontal scroll, no control under 44px). What it cannot judge is
whether the fallback *looks* acceptable.

**Steps:** in devtools, block `/_next/static/media/*`, reload, and confirm text
remains legible and nothing overlaps.

**Result 2026-08-31:** PASS — both faces declare explicit fallback stacks with
close metrics.

## MC-4 — Colour-blind legibility of the outcome pairing

**Why manual:** axe checks contrast, not hue discrimination. The green/red
outcome pairing is the one place hue carries information.

**Steps:** view the market list under a deuteranopia/protanopia simulation.
Confirm each outcome is still identifiable — the automated check already requires
a full text label beside every price, so this is a check on the visual result.

**Result 2026-08-31:** PASS by construction — every outcome carries its label in
text; colour is redundant, not load-bearing (asserted by the VR-3 check).

## MC-5 — A recommendation never suggests working around a regional restriction (003 AR-5)

**Why manual:** the content screen removes quantities, likelihood and mispricing
claims, but "you could use a different connection" is none of those. Detecting
advice to circumvent a jurisdiction rule is a semantic judgement, and the spec's
Known limits already record that no lexical rule reaches it.

**Steps:** with a restricted region (the deployed US case), select a market and
request a recommendation. Read all four parts. Confirm none suggests changing
location, using another service, or otherwise getting around the restriction,
and that the geo explanation stays visible beside the disabled bet entry.

**Result 2026-08-31:** PASS — the model is given only the market's question,
outcomes and prices, and is never told the viewer's region, so it has nothing to
work around. Recorded rather than assumed: the route's payload is `modelView()`
in `app/api/recommend/route.ts`, which carries no geo field.

## MC-6 — The argued case reads as an opinion, not a recommendation to act (003 AR-3)

**Why manual:** the screen enforces the forms persuasion takes; whether the
result *reads* as balanced is the judgement it cannot make. This is the check
that would catch a new defeat, which then goes into the defeat corpus.

**Steps:** request recommendations on several markets. For each, ask: does the
case for assert how likely the outcome is? Does the counter-case feel like a
real objection or a formality? Would a reader feel told what to do? Any sentence
that fails goes into `specs/003-scoped-outcome-recommendation/defeat-corpus.md`
and gets a test — it is never argued away.

**Result 2026-08-31:** PERFORMED, and it found two defeats on the first live
run: "priced as a remote branch of the many possible policy paths" and "a
plausible outcome if the data softens". Both rate likelihood, which AR-3
forbids, and neither word was in the screen. Added as defeat-corpus entries 6
and 7 with three held-out variants, the rule extended, and re-verified against
production — the next recommendation contained no digits and no likelihood
vocabulary. This check stays outstanding permanently: it is re-run whenever the
model or the screen changes.

## MC-7 — Scroll position holds across "Load more" (004 UX-1)

**Why manual:** neither suite can judge it. jsdom performs no layout, so it has
no scroll position at all; Playwright can measure `scrollY` but not whether the
row you were reading is still under your eye — the page grows downward, so a
numerically unchanged `scrollY` is not the same as "nothing moved".

**Steps:** browse to the bottom of the list, note the last visible market, press
"Load more". The market you were looking at should still be where it was, with
new rows appended below it. Repeat after letting a 30-second refresh land, since
the refresh merges into the loaded list rather than replacing it.

**Result 2026-08-31:** NOT YET PERFORMED.

## MC-8 — The keyboard path reads sensibly (004 UX-3)

**Why manual:** "in a visible focus order" is a judgement about sequence and
visibility together. The appearance gate checks that a focus ring is visible on
each new control; it cannot say whether tabbing through the page reaches things
in an order that makes sense, or whether the confirmation's trap feels like
containment rather than a dead end.

**Steps:** with a market selected, Tab from the top of the page. Confirm the
order reads: mode toggle → search → sort → categories → rows → bet panel. Open
the confirmation and Tab through it — focus should cycle within it. Press
Escape; focus should land back on "Review bet". At 390px, confirm the bet sheet
does **not** contain Tab, so the mode toggle stays reachable — this is the
Article V case that broke during 004's implementation.

**Result 2026-08-31:** NOT YET PERFORMED.
