---
description: "Report SDD gate status for every feature and name the next action"
---
Report the SDD status of this repository. Read-only — change nothing.

1. For every `specs/NNN-*/` directory, read `spec.md`, `plan.md`, and `tasks.md`, and report:
   - Gate state: which approval boxes are checked (`Spec approved`, `Plan approved`, `Task list approved`).
   - Open `[NEEDS CLARIFICATION: ...]` count in spec.md.
   - Task progress: checked vs. total task checkboxes in tasks.md (once it is filled in).
2. Flag anything inconsistent (e.g. a later stage approved atop an unapproved earlier one) — `bash scripts/sdd-lint.sh` catches these mechanically; run it and include its result.
3. End by naming the single next action (e.g. "resolve spec questions", "user approves spec, then /plan-feature", "run /implement — next task T4").

If no feature directories exist, say so and name `/spec` as the next action.
