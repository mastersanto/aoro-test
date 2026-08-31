---
description: "SDD step 1: create or update a feature spec (WHAT/WHY only)"
---
Execute the SDD spec step for: $ARGUMENTS

1. Read `specs/constitution.md` first.
2. If $ARGUMENTS names an existing feature under `specs/`, update its `spec.md`. Otherwise create `specs/NNN-<kebab-name>/spec.md` (next unused number) from `specs/templates/spec-template.md`, plus stub `plan.md` and `tasks.md` marked "Not started".
3. Capture WHAT and WHY only — user stories with acceptance criteria, out-of-scope, reference facts. No technology choices or implementation details.
4. Mark every unresolved decision `[NEEDS CLARIFICATION: ...]`. Finish by listing those questions to the user and asking for answers — never pick answers silently.
5. Remind the user the spec needs their approval before `/plan-feature`.
