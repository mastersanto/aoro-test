# Tasks 006 — The list leads on entry

**Status:** Approved 2026-08-31
**Plan:** ./plan.md

- [ ] T1. **RED** — an appearance check, at both viewports, that **two market rows
      are fully inside the viewport** on entry with nothing selected. It must fail on
      today's build at 390px (where one row sits on the fold), which is what proves
      it is not the weaker "does the row fit" check `005` shipped.
      Verify: `npm run test:visual` fails at mobile, passes at desktop.
- [ ] T2. **RED** — behaviour and appearance checks for the Article V surfaces this
      takes space from: the geo explanation still names the region and refuses real
      betting, still sits beside the mode toggle, and every category filter is still
      reachable.
      Verify: they pass on today's build (they are pre-existing guarantees) and are
      in place before the space is taken.
- [ ] T3. **GREEN** — shorten the geo explanation, scroll the category row, hide the
      page subtitle below `lg`, until T1 passes with T2 still green.
      Verify: `npm run verify` green at both viewports.
- [ ] T4. **(not binding — verification)** Mutations: restore the wrapping filter row;
      restore the long geo prose. Each must redden T1 without reddening T2.
      Verify: each mutation reddens the expected check; reverting returns to green.
- [ ] T5. **(not binding — documentation)** Update `README.md` and the `005` spec
      where 006 changes what it describes.
      Verify: `bash scripts/sdd-lint.sh` passes.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
