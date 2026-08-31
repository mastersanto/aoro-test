# Plan 002 — Widget Visual Redesign

**Status:** Approved 2026-08-31
**Spec:** ./spec.md (approved 2026-08-31, no open `[NEEDS CLARIFICATION]` markers)

## Stack

Everything below either already exists in the project or is added for VR-6, which no existing tool can satisfy.

| Choice | Traces to |
|---|---|
| **CSS custom properties in a Tailwind v4 `@theme` block** (`app/globals.css`) | VR-5 "styling values defined once and reused". Tailwind 4 already reads `@theme`, so tokens resolve in both utility classes and raw CSS — no new dependency, no token-library |
| **`next/font/google`** for the two faces | VR-5 fallback/stability. Already the mechanism in use for the current faces; it self-hosts the files, so no runtime request to Google and no CSP concern. This *replaces* the existing pair rather than adding a third |
| **`@playwright/test`** (new) | VR-6. jsdom performs no layout: `getBoundingClientRect` is zeroed and no cascade is applied, so it cannot fail when a field is hidden, mis-sized or pushed off-screen. A real browser can. Verified on this machine: a cached Chrome for Testing 151 launches headless, so local cost is the npm package only |
| **`@axe-core/playwright`** (new) | VR-5 contrast, measured not eyeballed. Not hand-rollable *here* specifically: the approved direction sets text on translucent backgrounds (the selected outcome, the DEMO chips), so the effective background must be composited through ancestors before any ratio means anything — plus the 18pt/14pt-bold large-text rule. A ~30-line luminance helper was considered and rejected: it computes a confident number from the wrong background |
| No other additions | Art. VI: no animation library, no component library, no CSS-in-JS. The redesign is markup and tokens |

## Architecture

No new routes, no new data flow, no server change. The work is confined to presentation plus one new pure module and one new test suite:

```
app/globals.css          @theme tokens (colour, type, space, radius)
app/layout.tsx           the two faces via next/font/google
components/…             restyled in place; MarketList becomes dense rows
lib/outcome-bar.ts       NEW — pure: prices → bar segment widths (binds, Art. VII)
tests/visual/*.spec.ts   NEW — Playwright: visibility, 44px, contrast (VR-6)
```

**What does not change:** every route, every server module, `lib/payout.ts`, `lib/demo.ts`, `lib/geo.ts`, `lib/betting-availability.ts`, and every *product* behavior — no new flow, no new endpoint, no changed outcome of any user action. If a change to one of those seems necessary, it is out of scope and the spec is wrong; stop and amend it.

**What does change internally**, and therefore binds under Art. VII rather than riding the styling exemption: `MarketList` is restructured into rows (its debounced query, race guard, stale flag and error mapping move with it), and a mobile sheet introduces open/dismiss/viewport-conditional state that does not exist today. Saying "only the look changes" would exempt both; it does not.

## The verified palette (VR-5)

The approved mockups were checked against WCAG AA before this plan was written, and **one value failed**:

| Role | Mockup | On `#0B0E14` | On `#10141C` | Action |
|---|---|---|---|---|
| Body text | `#E8ECF3` | 16.30 | — | keep |
| Muted | `#9AA3B2` | 7.59 | 7.25 | keep |
| **Dim** | `#6B7484` | **4.10 FAIL** | **3.91 FAIL** | **→ `#79828F`** (4.97 / 4.74) |
| Outcome up | `#3DDC97` | 10.93 | 10.43 | keep |
| Outcome down | `#F0616D` | 6.10 | 5.83 | keep |
| Demo | `#FFC53D` | 12.24 | — | keep, reserved |
| Button text on green | `#06251A` | 9.23 | — | keep |

The mockups use dim for body-size text (volumes, dates, balance hints), so `#6B7484` cannot ship. This is the spec's "where a mockup and this spec disagree, this spec wins" clause doing its job.

## Data flow (per story)

- **VR-1** — the list renders the same normalized `Market[]` from `/api/markets`. Row content is unchanged, both volume fields included. The outcome bar derives segment widths from the same `outcome.price` already displayed; it adds no fetch.
- **VR-2** — one confirmation component, as today. The mobile sheet is a *presentation* of the existing bet panel, not a second panel: it renders `BetPanel`, which owns the single `onPlace` call site.
- **VR-3** — DEMO and geo surfaces keep their current text and accessible names; only their styling changes. The demo colour token is used by nothing else, enforced by a check.
- **VR-4/VR-6** — Playwright drives the built app at 1280 and 390 and asserts the guarantees.

## Verification mechanism (VR-6)

Three tiers, each able to fail:

1. **Unit (existing `npm test`, jsdom)** — behavior, unchanged. The 135 existing tests are the behavior gate and must pass untouched.
2. **Visual (`npm run test:visual`, Playwright, new)** — against `next build && next start`:
   - the five confirmation fields are each `toBeVisible()`, **and** have a bounding box larger than a token size (Playwright counts a 1×1 clipped `sr-only` element as visible, so `toBeVisible()` alone would not catch the spec's own "visually hidden" failure mode), **and** sit inside the viewport rect at 1280 and 390 without scrolling;
   - the disclaimer is visible together with a suggestion at both widths;
   - the DEMO signal is visible on control, result, balance, confirmation and position;
   - the geo explanation is visible alongside the disabled control;
   - every interactive element's `boundingBox().height >= 44` at 390;
   - axe's `color-contrast` rule reports no violations on each surface;
   - a token check: the demo colour appears in no non-demo element's computed styles.
3. **Manual (documented, not pretended)** — anything the above cannot judge is listed in `specs/002-widget-visual-redesign/manual-checks.md` with steps, per VR-6's last criterion.

Each visual check is written to fail first against the current UI where the guarantee is not yet met, so it is proven to fail before it is made to pass.

## Environment and deployment

- No new environment variables. No change to `.env.example`.
- CI: the existing `sdd-lint` workflow is unchanged. A visual job needs `npx playwright install --with-deps chromium`; it runs on push, and is allowed to be the slower of the two jobs.
- Vercel deployment is unaffected — Playwright is a devDependency and never enters the bundle.

## Risks and open items

1. **The row's queryable contract.** Six assertions in `geo-degrade`/`demo-flow` plus the new `market-list` tests select a market by heading role inside `role="button"`. Dense rows may change that. Per spec, any change is replaced with an equivalent accessible role in the same change and reviewed — never deleted. Mitigation: keep the heading and the button role on the row; only the visual arrangement changes.
2. **Playwright in CI.** Browsers are cached on this machine but not in CI; the install step adds ~1–2 minutes. If CI time becomes a problem, run the visual job on pull requests only — never delete it.
3. **Font metric change.** Swapping the faces shifts text width; a dense table is where that shows. The 44px and no-horizontal-scroll checks are what catch it.
4. **Contrast on hover/active states.** The audit checked resting colours only; hover and disabled variants are checked by axe per state during implementation.
5. **The mockups contain elements 001 does not ship** (quick-amount chips, a shares row, a live indicator, a "refreshed" line). Spec puts them out of scope; they are not implemented here.

## Constitution check

- **Art. I** — implements approved spec 002 only; no code until tasks.md is approved. **Pass.**
- **Art. II** — the mobile sheet renders the existing `BetPanel`, preserving its single `onPlace` call site; VR-2's visibility checks are added on top of the existing bypass tests. No new bet-entry path. **Pass.**
- **Art. III** — no wallet, signing or fund-handling code is touched. **N/A.**
- **Art. IV** — no secret, env var or server route involved; Playwright is a devDependency. **N/A.**
- **Art. V** — disclaimer and geo placement become *measured* guarantees rather than restated prose; the demo colour's exclusivity is enforced by a check. **Pass.**
- **Art. VI** — two additions, both for VR-6, which no existing tool can satisfy; alternatives named and rejected in the Stack table. **Pass.**
- **Art. VII** — binding work (the outcome-bar math, the list's state handling, the mobile sheet state machine, the VR-2/VR-3 visibility guarantees) is split RED/GREEN in tasks.md; colour, type, spacing and radii are exempt as aesthetics, but colour *carrying meaning* binds. **Pass.**

## Approval

- [x] Plan approved by user (required before `/tasks`) — 2026-08-31
