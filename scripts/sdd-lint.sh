#!/usr/bin/env bash
# Validates SDD structural invariants. Run locally (bash scripts/sdd-lint.sh) or in CI.
# Invariants:
#   1. every specs/NNN-*/ contains spec.md, plan.md, tasks.md
#   2. approvals are ordered: plan approved => spec approved; tasks approved => plan approved
#   3. an approved spec contains no [NEEDS CLARIFICATION] markers
# Keep the grepped strings in sync with specs/templates/ approval checkboxes.

set -uo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
err() { echo "sdd-lint: $1" >&2; fail=1; }

shopt -s nullglob
for dir in "$root"/specs/[0-9][0-9][0-9]-*/; do
  name="${dir#"$root"/}"
  for f in spec.md plan.md tasks.md; do
    [ -f "$dir$f" ] || err "$name is missing $f"
  done
  spec_ok=0; plan_ok=0; tasks_ok=0
  grep -qs '^- \[x\] Spec approved' "$dir/spec.md" && spec_ok=1
  grep -qs '^- \[x\] Plan approved' "$dir/plan.md" && plan_ok=1
  grep -qs '^- \[x\] Task list approved' "$dir/tasks.md" && tasks_ok=1
  [ "$plan_ok" -eq 1 ] && [ "$spec_ok" -eq 0 ] && err "$name: plan approved but spec is not"
  [ "$tasks_ok" -eq 1 ] && [ "$plan_ok" -eq 0 ] && err "$name: tasks approved but plan is not"
  if [ "$spec_ok" -eq 1 ] && grep -qs 'NEEDS CLARIFICATION' "$dir/spec.md"; then
    err "$name: approved spec still contains [NEEDS CLARIFICATION] markers"
  fi
done

if [ "$fail" -eq 0 ]; then
  echo "sdd-lint: OK"
else
  exit 1
fi
