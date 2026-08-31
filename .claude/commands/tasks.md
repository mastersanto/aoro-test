---
description: "SDD step 3: break an approved plan into verifiable tasks"
---
Execute the SDD tasks step for: $ARGUMENTS (if empty, use the active feature named in CLAUDE.md).

1. Read the feature's `spec.md` and `plan.md`. Stop and ask if the plan is unapproved.
2. Fill the feature's `tasks.md` from `specs/templates/tasks-template.md`: ordered phases of small tasks, each with an explicit "Verify:" line (a command to run or behavior to observe).
3. Sequence so value ships early and risk retires early (for this project: market data and AI assist before wallet/betting).
4. Ask for approval before `/implement`. Do not write application code.
