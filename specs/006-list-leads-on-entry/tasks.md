# Tasks 006 — The list leads on entry

**Status:** Complete 2026-08-31 — 5/5.

**Mutation results (T4), stated honestly:** restoring the wrapping category row
reddens the two-row check. Restoring the long geo prose **does not** — and the
mutation was verified to have applied. With the other three savings in place the
check has roughly 38px of headroom at 390px, and the prose costs less than that on
its own. That is a true statement about the margin rather than a failed mutation, and
it is worth knowing: the margin is thin, so the next thing added above the list is
spending from a small budget.

**A defect this feature exposed rather than caused:** the AI section rendered 573px
wide inside a 390px viewport, scrolling the whole document sideways. Grid items
default to `min-width: auto`, so the textarea's intrinsic width blew out the
single-column grid. It had been there since `005` and no existing check caught it;
the horizontal-overflow assertion in this feature's run did.
**Plan:** ./plan.md

- [x] T1. **RED** — an appearance check, at both viewports, that **two market rows
      are fully inside the viewport** on entry with nothing selected. It must fail on
      today's build at 390px (where one row sits on the fold), which is what proves
      it is not the weaker "does the row fit" check `005` shipped.
      Verify: `npm run test:visual` fails at mobile, passes at desktop.
- [x] T2. **RED** — behaviour and appearance checks for the Article V surfaces this
      takes space from: the geo explanation still names the region and refuses real
      betting, still sits beside the mode toggle, and every category filter is still
      reachable.
      Verify: they pass on today's build (they are pre-existing guarantees) and are
      in place before the space is taken.
- [x] T3. **GREEN** — shorten the geo explanation, scroll the category row, hide the
      page subtitle below `lg`, until T1 passes with T2 still green.
      Verify: `npm run verify` green at both viewports.
- [x] T4. **(not binding — verification)** Mutations: restore the wrapping filter row;
      restore the long geo prose. Each must redden T1 without reddening T2.
      Verify: each mutation reddens the expected check; reverting returns to green.
- [x] T5. **(not binding — documentation)** Update `README.md` and the `005` spec
      where 006 changes what it describes.
      Verify: `bash scripts/sdd-lint.sh` passes.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
