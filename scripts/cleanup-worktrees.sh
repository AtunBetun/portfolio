#!/usr/bin/env bash
#
# cleanup-worktrees.sh — Remove worktrees whose PRs have been merged or closed
#
# Usage:
#   ./scripts/cleanup-worktrees.sh          # clean up merged
#   ./scripts/cleanup-worktrees.sh --dry-run
#   ./scripts/cleanup-worktrees.sh --all    # remove ALL worktrees (nuclear option)
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

WORKTREE_DIR="$REPO_ROOT/.worktrees"
DRY_RUN=false
ALL=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --all) ALL=true ;;
  esac
done

if [ ! -d "$WORKTREE_DIR" ]; then
  echo "[cleanup] No worktrees directory. Nothing to do."
  exit 0
fi

# List worktrees created by the dispatcher
for wt in "$WORKTREE_DIR"/*/; do
  [ -d "$wt" ] || continue
  ISSUE_ID=$(basename "$wt")
  BRANCH_NAME="implement/$ISSUE_ID"

  if [ "$ALL" = true ]; then
    echo "[cleanup] Removing: $wt (branch: $BRANCH_NAME)"
    if [ "$DRY_RUN" = false ]; then
      git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
      git branch -D "$BRANCH_NAME" 2>/dev/null || true
    fi
    continue
  fi

  # Check if the PR for this branch is merged or closed
  PR_STATE=$(gh pr list --head "$BRANCH_NAME" --state all --json state --jq '.[0].state // "NONE"' 2>/dev/null || echo "UNKNOWN")

  case "$PR_STATE" in
    MERGED|CLOSED)
      echo "[cleanup] $ISSUE_ID — PR $PR_STATE. Removing worktree."
      if [ "$DRY_RUN" = false ]; then
        git worktree remove "$wt" --force 2>/dev/null || rm -rf "$wt"
        git branch -D "$BRANCH_NAME" 2>/dev/null || true
      fi
      ;;
    OPEN)
      echo "[cleanup] $ISSUE_ID — PR still open. Keeping."
      ;;
    *)
      echo "[cleanup] $ISSUE_ID — No PR found (state: $PR_STATE). Keeping."
      ;;
  esac
done

# Prune any dangling worktree references
git worktree prune 2>/dev/null || true

echo "[cleanup] Done."
