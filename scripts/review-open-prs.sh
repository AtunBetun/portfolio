#!/usr/bin/env bash
#
# review-branches.sh — Cron launcher for the branch reviewer agent
#
# Spawns a Claude session that finds implemented branches and reviews them
# by reading the diff against main and checking spec compliance.
# All local — no GitHub.
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

claude --bg -p "You are the code reviewer for the spec-driven agent pipeline.
All work is LOCAL — no GitHub, no PRs.

1. Query beads for issues labeled spec:implemented that haven't been reviewed:
   bd query \"label=spec:implemented AND NOT label=spec:reviewed\"
2. If there are none, stop.
3. For each:
   a. The branch is implement/<issue-id>, worktree at .worktrees/<issue-id>.
   b. Read the diff: git diff main...implement/<issue-id>
   c. Read the spec: docs/specs/<issue-id>.md
   d. Review for:
      - Spec compliance: every requirement implemented
      - Code quality: correctness, no dead code, tests present
      - No secrets, no leftover debug code
   e. Add your review as a beads comment: bd comment <issue-id> \"<your review>\"
   f. If approved: bd label add <issue-id> spec:reviewed
      If changes needed: bd label add <issue-id> spec:changes-requested
      and include specific instructions in the comment.
4. Report what you reviewed."
