#!/usr/bin/env bash
#
# dispatch-ready-specs.sh — Cron-triggered dispatcher
#
# Queries beads for spec:ready issues that are unassigned,
# then spawns a `claude --bg` session per issue.
# Each session shows up in `claude agents` view.
#
# Usage:
#   ./scripts/dispatch-ready-specs.sh          # dispatch all ready specs
#   ./scripts/dispatch-ready-specs.sh --dry-run  # show what would dispatch
#   ./scripts/dispatch-ready-specs.sh --max=2    # cap concurrent dispatches
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

DRY_RUN=false
MAX_DISPATCH=4  # Don't overwhelm the box

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --max=*) MAX_DISPATCH="${arg#--max=}" ;;
  esac
done

# Find spec:ready issues that nobody has claimed
READY_ISSUES=$(bd query "label=spec:ready AND status=open AND assignee=none" --json 2>/dev/null || echo "[]")
ISSUE_COUNT=$(echo "$READY_ISSUES" | jq 'length')

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "[dispatch] No spec:ready issues available. Nothing to do."
  exit 0
fi

echo "[dispatch] Found $ISSUE_COUNT ready issue(s). Max dispatch: $MAX_DISPATCH"

# Check how many agents are already running for this project
RUNNING=$(claude agents --json --cwd "$REPO_ROOT" 2>/dev/null | jq '[.[] | select(.status == "running")] | length' || echo 0)
SLOTS=$((MAX_DISPATCH - RUNNING))

if [ "$SLOTS" -le 0 ]; then
  echo "[dispatch] Already $RUNNING agent(s) running (max $MAX_DISPATCH). Skipping."
  exit 0
fi

echo "[dispatch] $RUNNING agent(s) running, $SLOTS slot(s) available."

# Dispatch one agent per ready issue, up to available slots
echo "$READY_ISSUES" | jq -c '.[]' | head -n "$SLOTS" | while read -r issue; do
  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  ISSUE_TITLE=$(echo "$issue" | jq -r '.title')
  SPEC_FILE=$(echo "$issue" | jq -r '.description // ""' | grep -oP '(?<=Spec: ).*\.md' || true)

  # If no spec file path found in description, check if one exists by convention
  if [ -z "$SPEC_FILE" ]; then
    SPEC_FILE="docs/specs/${ISSUE_ID}.md"
  fi

  if [ ! -f "$SPEC_FILE" ]; then
    echo "[dispatch] WARNING: Spec file not found for $ISSUE_ID ($SPEC_FILE). Skipping."
    continue
  fi

  echo "[dispatch] Dispatching: $ISSUE_ID — $ISSUE_TITLE"
  echo "           Spec: $SPEC_FILE"

  if [ "$DRY_RUN" = true ]; then
    echo "           [DRY RUN] Would claim and dispatch."
    continue
  fi

  # Claim the issue so no other dispatcher grabs it
  bd update "$ISSUE_ID" --claim --quiet 2>/dev/null || true

  # Build the prompt for the implementing agent
  PROMPT=$(cat <<EOF
You are implementing a feature for this project. Follow these steps exactly:

1. Read the spec file: $SPEC_FILE
2. Create a new git branch named: implement/$ISSUE_ID
3. Implement everything described in the spec
4. Write tests as described in the Test Plan section
5. Run the tests and fix any failures
6. Commit your work with a descriptive message referencing $ISSUE_ID
7. Push the branch: git push -u origin implement/$ISSUE_ID
8. Open a draft PR: gh pr create --draft --title "feat($ISSUE_ID): $ISSUE_TITLE" --body "Implements $ISSUE_ID. See docs/specs/ for full spec."
9. Update the bead: bd label remove $ISSUE_ID spec:ready && bd label add $ISSUE_ID spec:in-review
10. Report the PR URL when done.

Issue: $ISSUE_ID
Title: $ISSUE_TITLE
Spec: $SPEC_FILE

IMPORTANT: Work in a git worktree to avoid conflicts with other agents.
Use EnterWorktree before making any changes.
EOF
)

  # Spawn the background agent — shows up in `claude agents`
  # NOTE: Add --dangerously-skip-permissions if running in a sandboxed environment.
  # Without it, the agent will prompt for tool permissions (which blocks in cron).
  # You must explicitly opt in — see README.
  claude --bg \
    --allowedTools "Bash Read Write Edit Agent EnterWorktree" \
    -p "$PROMPT" &

  echo "[dispatch] Agent spawned for $ISSUE_ID"
  sleep 2  # Brief pause between spawns
done

echo "[dispatch] Done. Check progress with: claude agents"
