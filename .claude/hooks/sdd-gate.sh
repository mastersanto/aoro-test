#!/usr/bin/env bash
# PreToolUse hook (Write|Edit|NotebookEdit): enforces the SDD gate — application
# code may not be written until some specs/*/tasks.md has its approval box checked.
# Simplification, fine for this repo: the check is repo-wide, not per-feature.
# Blocking is signaled by exit code 2; stderr is shown to Claude.

set -uo pipefail

payload="$(cat)"

file_path="$(printf '%s' "$payload" | python3 -c '
import json, sys
d = json.load(sys.stdin)
ti = d.get("tool_input", {})
print(ti.get("file_path", "") or ti.get("notebook_path", ""))
' 2>/dev/null)"

# No file path in the payload — nothing to judge.
[ -z "$file_path" ] && exit 0

repo_root="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"

case "$file_path" in
  "$repo_root"/*) rel="${file_path#"$repo_root"/}" ;;
  *) exit 0 ;; # outside the repo (scratchpad, plan files) — not our concern
esac

# Harness, spec, docs, and CI paths are always writable.
case "$rel" in
  specs/*|.claude/*|.github/*|scripts/*|docs/*|.env.example|.gitignore|LICENSE) exit 0 ;;
esac
# Root-level markdown (README.md, CLAUDE.md, ...) is documentation.
if [[ "$rel" == *.md && "$rel" != */* ]]; then exit 0; fi

# Everything else is application code: require an approved task list.
if grep -qs '^- \[x\] Task list approved' "$repo_root"/specs/*/tasks.md 2>/dev/null; then
  exit 0
fi

echo "SDD gate: refusing to write '$rel' — no approved tasks.md exists yet." >&2
echo "Finish the SDD flow first (/spec -> /plan-feature -> /tasks, each stage user-approved)." >&2
exit 2
