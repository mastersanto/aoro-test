# Tasks 007 — Open on a market

**Status:** Approved 2026-08-31
**Plan:** ./plan.md

- [x] T1. **RED** — failing tests: on load a market is selected and the bet form is
      usable with no further click; **no outcome is chosen, no amount is filled, no
      confirmation is open, and `onPlace` is not called** (Art. II); no recommendation
      is requested; no scroll is triggered; clearing stays cleared; search, filter and
      sort do not re-select; nothing is selected when the list is empty.
      Verify: `npm test` fails on those assertions.
- [x] T2. **GREEN** — add `onFirstMarket` to `MarketList` and the once-only,
      no-scroll selection in `Widget` until T1 passes.
      Verify: `npm test` passes, including the `001` T11 bypass suite unmodified.
- [x] T3. **RED then GREEN** — Article V with a default selection: a restricted region
      and a restricted market both still render no bet controls (`005 DR-1`), and the
      geo explanation is still present.
      Verify: `npm test` passes.
- [x] T4. **(exempt — styling and layout)** Re-check `006 LE-1` with a populated rail:
      two market rows still fully visible at both viewports, and no horizontal scroll.
      Verify: `npm run test:visual` passes.
- [ ] T5. **(not binding — verification)** Mutations: preselect an outcome as well as
      the market; let the automatic selection scroll; let it re-fire after a clear.
      Each must redden exactly the expected test.
      Verify: each reddens as expected; reverting returns to green.
- [ ] T6. **(not binding — documentation)** Update `README.md`, `CLAUDE.md`, and the
      `005` spec's D2 note, which recorded the empty rail as an accepted cost.
      Verify: `bash scripts/sdd-lint.sh` passes; `npm run verify` green.

## Approval

- [x] Task list approved by user (required before `/implement`) — 2026-08-31
