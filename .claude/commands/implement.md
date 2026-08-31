---
description: "SDD step 4: implement approved tasks, one at a time"
---
Execute the SDD implement step for: $ARGUMENTS (if empty: the active feature's next unchecked task; a task id like T3 targets that task).

1. Read the feature's `spec.md`, `plan.md`, and `tasks.md`. Stop and ask if the task list is unapproved.
2. Implement the target task(s) in order. After each: run its "Verify:" step, then check it off in `tasks.md` in the same change.
3. If implementation contradicts the plan, stop coding, update `plan.md` (and `spec.md` if scope changed), confirm with the user, then continue.
4. When the first task scaffolds the project, replace the "Commands" section of CLAUDE.md with the real dev/build/lint/test commands in the same change.
5. Launch the `constitution-check` agent on the working-tree diff before reporting; a violation blocks the task from being checked off until resolved.
6. Report what landed, what was verified, and what task is next.
