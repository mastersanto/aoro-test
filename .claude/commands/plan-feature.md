---
description: "SDD step 2: write the technical plan for an approved spec"
---
Execute the SDD plan step for: $ARGUMENTS (if empty, use the active feature named in CLAUDE.md).

1. Read `specs/constitution.md` and the feature's `spec.md`.
2. Stop and ask the user if the spec is unapproved or contains `[NEEDS CLARIFICATION]` markers — do not plan around them.
3. Fill the feature's `plan.md` from `specs/templates/plan-template.md`: stack, architecture, data flow, external APIs, environment/deployment, risks.
4. Every decision must trace to a spec requirement or constitution article; complete the plan's "Constitution check" section honestly and flag conflicts instead of hiding them.
5. Update `.env.example` if the plan adds or removes environment variables.
6. Present a short summary of key decisions and ask for approval before `/tasks`. Do not write application code.
