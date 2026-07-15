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

export PATH="$HOME/.toolbox/bin:$HOME/.local/bin:$PATH"

WORKTREE_DIR="$REPO_ROOT/.worktrees"

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "[cleanup] No .worktrees/ directory. Nothing to do."
  exit 0
fi

CLEANED=0

for wt in "$WORKTREE_DIR"/*/; do
  [ -d "$wt" ] || continue

  ISSUE_ID=$(basename "$wt")
  BRANCH_NAME="implement/$ISSUE_ID"

  # Skip lockfiles and non-issue directories
  [[ "$ISSUE_ID" == .* ]] && continue

  # Check if branch has been merged into main (anchored match)
  MERGED=false
  if git branch --merged main 2>/dev/null | grep -qx "  $BRANCH_NAME"; then
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
    git branch -d "$BRANCH_NAME" 2>/dev/null || true
    # Close bead if still open
    if [ "$BEAD_STATUS" != "closed" ]; then
      bd close "$ISSUE_ID" --quiet 2>/dev/null || true
    fi
    CLEANED=$((CLEANED + 1))

  elif [ "$BEAD_CLOSED" = true ]; then
    echo "[cleanup] $ISSUE_ID — bead closed. Removing worktree."
    git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    CLEANED=$((CLEANED + 1))
  fi
done

# Also requeue orphaned claims: beads that are claimed + spec:ready but have
# no running agent and no worktree (agent crashed after claim)
ORPHANS=$(bd query "label=spec:ready AND status=open" --json 2>/dev/null || echo "[]")
echo "$ORPHANS" | jq -c '.[]' | while IFS= read -r issue; do
  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  ASSIGNEE=$(echo "$issue" | jq -r '.assignee // ""')

  # Skip unassigned (normal ready state)
  [ -z "$ASSIGNEE" ] && continue

  # If claimed but no worktree exists, the agent crashed — unclaim it
  if [ ! -d "$WORKTREE_DIR/$ISSUE_ID" ]; then
    echo "[cleanup] $ISSUE_ID — claimed but no worktree. Unclaiming (orphan recovery)."
    bd update "$ISSUE_ID" --assignee="" --quiet 2>/dev/null || true
  fi
done

# Prune any dangling worktree references
git worktree prune 2>/dev/null || true

echo "[cleanup] Done. Cleaned $CLEANED worktree(s)."
