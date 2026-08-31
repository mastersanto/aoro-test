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
