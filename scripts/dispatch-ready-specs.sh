#!/usr/bin/env bash
#
# dispatch-ready-specs.sh — Cron-triggered dispatcher
#
# Queries beads for spec:ready issues that are unassigned,
# creates a git worktree per issue, then spawns a `claude --bg`
# session inside that worktree. Each session shows up in `claude agents`.
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
WORKTREE_DIR="$REPO_ROOT/.worktrees"

mkdir -p "$WORKTREE_DIR"

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

  # --- Create a git worktree for this issue ---
  BRANCH_NAME="implement/$ISSUE_ID"
  WORKTREE_PATH="$WORKTREE_DIR/$ISSUE_ID"

  # Clean up stale worktree if it exists from a previous failed run
  if [ -d "$WORKTREE_PATH" ]; then
    echo "[dispatch] Cleaning stale worktree: $WORKTREE_PATH"
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
  fi

  # Create fresh branch and worktree from current main
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" origin/main 2>/dev/null || {
    # Branch might already exist (retry from a previous attempt)
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    git worktree add -b "$BRANCH_NAME" "$WORKTREE_PATH" origin/main
  }

  echo "[dispatch] Worktree created: $WORKTREE_PATH (branch: $BRANCH_NAME)"

  # Copy the spec file path relative to repo root — it's the same in the worktree
  PROMPT=$(cat <<EOF
You are implementing a feature for this project.

You are already in a git worktree on branch "$BRANCH_NAME".
Your working directory is: $WORKTREE_PATH

Follow these steps exactly:

1. Read the spec file: $SPEC_FILE
   (This path is relative to your working directory.)
2. Implement everything described in the spec.
3. Write tests as described in the Test Plan section.
4. Run the tests and fix any failures.
5. Commit your work with a descriptive message referencing $ISSUE_ID.
6. Push the branch: git push -u origin $BRANCH_NAME
7. Open a draft PR:
   gh pr create --draft \\
     --title "feat($ISSUE_ID): $ISSUE_TITLE" \\
     --body "Implements $ISSUE_ID. See docs/specs/ for full spec."
8. Update the bead:
   bd label remove $ISSUE_ID spec:ready
   bd label add $ISSUE_ID spec:in-review
9. Report the PR URL when done.

Issue: $ISSUE_ID
Title: $ISSUE_TITLE
Spec: $SPEC_FILE

Do NOT use the EnterWorktree tool — you are already in an isolated worktree.
Do NOT switch branches — you are already on the correct branch.
EOF
)

  # Spawn the background agent inside the worktree directory.
  # It shows up in `claude agents` with full session visibility.
  # NOTE: Add --dangerously-skip-permissions for unattended cron operation.
  claude --bg \
    --allowedTools "Bash Read Write Edit" \
    --add-dir "$WORKTREE_PATH" \
    -p "$PROMPT" &

  echo "[dispatch] Agent spawned for $ISSUE_ID in $WORKTREE_PATH"
  sleep 2  # Brief pause between spawns
done

echo "[dispatch] Done. Check progress with: claude agents"
