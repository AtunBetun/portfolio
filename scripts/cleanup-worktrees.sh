#!/usr/bin/env bash
#
# cleanup-worktrees.sh — Cron launcher for worktree cleanup
#
# Removes worktrees for issues that have been merged into main or closed.
# All local.
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

claude --bg -p "Clean up stale worktrees in .worktrees/. All local — no GitHub.

For each directory in .worktrees/:
1. The directory name is a bead issue ID. The branch is implement/<issue-id>.
2. Check if that branch has been merged into main:
   git branch --merged main | grep implement/<issue-id>
3. If merged: remove the worktree (git worktree remove .worktrees/<issue-id>),
   delete the local branch (git branch -d implement/<issue-id>),
   and close the bead if still open (bd close <issue-id>).
4. Also check for closed beads whose worktree still exists — remove those too.
5. Run 'git worktree prune' at the end.
6. Report what you cleaned up."
