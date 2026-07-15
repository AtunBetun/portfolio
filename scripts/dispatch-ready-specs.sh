#!/usr/bin/env bash
#
# dispatch-ready-specs.sh — Cron launcher for the dispatcher agent
#
# Spawns a Claude background session that checks beads for ready specs
# and dispatches one implementer agent per spec in its own git worktree.
# Everything stays local — no GitHub, no PRs.
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

claude --bg -p "You are the dispatcher for the spec-driven agent pipeline.
All work is LOCAL — no GitHub, no PRs.

1. Query beads for implementation-ready work:
   Run: bd query \"label=spec:ready AND status=open AND assignee=none\"
2. If there are none, say so and stop.
3. Check how many Claude agents are already running (claude agents --json).
   If 4 or more, stop — wait for slots to free.
4. For each ready issue (up to the free slots):
   a. Claim it: bd update <id> --claim
   b. Create git worktree: git worktree add .worktrees/<issue-id> -b implement/<issue-id> main
      (If branch exists from a stale run, remove it first.)
   c. Spawn a background implementer: claude --bg --add-dir .worktrees/<issue-id> with a prompt telling it:
      - You are in worktree .worktrees/<issue-id> on branch implement/<issue-id>
      - Read the spec at docs/specs/<issue-id>.md
      - Implement everything in the spec
      - Write and run tests from the spec's Test Plan
      - Commit with a message referencing <issue-id>
      - When done, relabel the bead: remove spec:ready, add spec:implemented
      - Do NOT push, do NOT open a PR — all local
5. Report what you dispatched."
