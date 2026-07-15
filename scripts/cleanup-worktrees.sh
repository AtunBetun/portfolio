#!/usr/bin/env bash
#
# cleanup-worktrees.sh — Remove worktrees for merged/closed work
#
# Fully deterministic — no Claude session needed. Just shell + git + bd.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

export PATH="$HOME/.toolbox/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

WORKTREE_DIR="$REPO_ROOT/.worktrees"

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "[cleanup] No .worktrees/ directory. Nothing to do."
  exit 0
fi

CLEANED=0

# Get the list of merged branches once (more efficient than per-worktree)
MERGED_BRANCHES=$(git branch --merged main 2>/dev/null || true)

for wt in "$WORKTREE_DIR"/*/; do
  [ -d "$wt" ] || continue

  ISSUE_ID=$(basename "$wt")
  BRANCH_NAME="implement/$ISSUE_ID"

  # Skip lockfiles and non-issue directories
  [[ "$ISSUE_ID" == .* ]] && continue

  # Check if branch has been merged into main
  # git branch --merged shows:
  #   "  branch"  for regular branches
  #   "* branch"  for current branch
  #   "+ branch"  for branches checked out in other worktrees
  # Match any prefix (two chars + space) with the exact branch name
  MERGED=false
  if echo "$MERGED_BRANCHES" | grep -qE "^[[:space:]*+]{2}${BRANCH_NAME}$"; then
    MERGED=true
  fi

  # Also check if the bead is closed
  BEAD_CLOSED=false
  BEAD_STATUS=$(bd show "$ISSUE_ID" --json 2>/dev/null | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
  if [ "$BEAD_STATUS" = "closed" ]; then
    BEAD_CLOSED=true
  fi

  if [ "$MERGED" = true ]; then
    echo "[cleanup] $ISSUE_ID — branch merged. Removing worktree."
    git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
    git worktree prune 2>/dev/null || true
    git branch -d "$BRANCH_NAME" 2>/dev/null || true
    # Close bead if still open
    if [ "$BEAD_STATUS" != "closed" ]; then
      bd close "$ISSUE_ID" --quiet 2>/dev/null || true
    fi
    CLEANED=$((CLEANED + 1))

  elif [ "$BEAD_CLOSED" = true ]; then
    echo "[cleanup] $ISSUE_ID — bead closed. Removing worktree."
    git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
    git worktree prune 2>/dev/null || true
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    CLEANED=$((CLEANED + 1))
  fi
done

# Requeue orphaned claims: beads that are claimed + spec:ready but have
# no running agent and no worktree (agent crashed after claim)
ORPHANS=$(bd query "label=spec:ready AND status=open" --json 2>/dev/null || echo "[]")
readarray -t ORPHAN_LINES < <(echo "$ORPHANS" | jq -c '.[]')
for issue in "${ORPHAN_LINES[@]}"; do
  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  ASSIGNEE=$(echo "$issue" | jq -r '.assignee // ""')

  # Skip unassigned (normal ready state)
  [ -z "$ASSIGNEE" ] && continue

  # If claimed but no worktree exists, the agent crashed — unclaim it
  if [ ! -d "$WORKTREE_DIR/$ISSUE_ID" ]; then
    echo "[cleanup] $ISSUE_ID — claimed but no worktree. Unclaiming (orphan recovery)."
    bd update "$ISSUE_ID" --assignee="" --quiet 2>/dev/null || true
  fi

  # If claimed and worktree EXISTS but no agent is running, also unclaim
  # (agent crashed mid-implementation with worktree still present)
  if [ -d "$WORKTREE_DIR/$ISSUE_ID" ]; then
    # Check if any agent is running in this worktree
    AGENT_RUNNING=$(claude agents --json --cwd "$WORKTREE_DIR/$ISSUE_ID" 2>/dev/null \
      | jq '[.[] | select(.status == "running")] | length' 2>/dev/null || echo "0")
    if [ "$AGENT_RUNNING" -eq 0 ]; then
      echo "[cleanup] $ISSUE_ID — worktree exists but no running agent. Unclaiming (stale recovery)."
      # Remove the stale worktree so the dispatcher can recreate it fresh
      git worktree remove "$WORKTREE_DIR/$ISSUE_ID" --force 2>/dev/null || rm -rf "$WORKTREE_DIR/$ISSUE_ID"
      git worktree prune 2>/dev/null || true
      git branch -D "implement/$ISSUE_ID" 2>/dev/null || true
      bd update "$ISSUE_ID" --assignee="" --quiet 2>/dev/null || true
      CLEANED=$((CLEANED + 1))
    fi
  fi
done

# Also recover stale in-review labels (reviewer crashed before posting verdict)
STALE_REVIEWS=$(bd query "label=spec:in-review AND status=open" --json 2>/dev/null || echo "[]")
readarray -t STALE_LINES < <(echo "$STALE_REVIEWS" | jq -c '.[]')
for issue in "${STALE_LINES[@]}"; do
  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  # If no reviewer agent is running, remove the in-review label
  REVIEWER_RUNNING=$(claude agents --json --cwd "$REPO_ROOT" 2>/dev/null \
    | jq --arg id "$ISSUE_ID" '[.[] | select(.status == "running")] | length' 2>/dev/null || echo "0")
  # Conservative: only remove if no agents are running for this repo at all
  # (we can't easily tell which agent is reviewing which issue)
  if [ "$REVIEWER_RUNNING" -eq 0 ]; then
    echo "[cleanup] $ISSUE_ID — stale in-review label (no running reviewer). Removing label."
    bd label remove "$ISSUE_ID" spec:in-review 2>/dev/null || true
  fi
done

# Final prune
git worktree prune 2>/dev/null || true

echo "[cleanup] Done. Cleaned $CLEANED worktree(s)."
