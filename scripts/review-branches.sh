#!/usr/bin/env bash
#
# review-branches.sh — Find implemented branches and spawn a reviewer agent
#
# Shell does the querying and filtering; Claude does the actual code review
# (the part that requires judgment).
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

export PATH="$HOME/.toolbox/bin:$HOME/.local/bin:$PATH"

LOCK_FILE="$REPO_ROOT/.worktrees/.review.lock"
mkdir -p "$REPO_ROOT/.worktrees"

# Prevent overlapping reviewer runs
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[reviewer] Another reviewer is already running. Exiting."
  exit 0
fi

# Query for implemented issues that need review
# Exclude: already reviewed, changes-requested (awaiting human re-queue), closed
READY_FOR_REVIEW=$(bd query "label=spec:implemented AND NOT label=spec:reviewed AND NOT label=spec:changes-requested AND status=open" --json 2>/dev/null || echo "[]")
REVIEW_COUNT=$(echo "$READY_FOR_REVIEW" | jq 'length')

if [ "$REVIEW_COUNT" -eq 0 ]; then
  echo "[reviewer] No branches awaiting review. Nothing to do."
  exit 0
fi

echo "[reviewer] Found $REVIEW_COUNT branch(es) to review."

MAX_REVIEWS=2
REVIEWED=0

echo "$READY_FOR_REVIEW" | jq -c '.[]' | while IFS= read -r issue; do
  if [ "$REVIEWED" -ge "$MAX_REVIEWS" ]; then
    echo "[reviewer] Hit max reviews ($MAX_REVIEWS). Stopping."
    break
  fi

  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  ISSUE_TITLE=$(echo "$issue" | jq -r '.title')
  BRANCH_NAME="implement/$ISSUE_ID"
  SPEC_FILE="docs/specs/${ISSUE_ID}.md"

  # Verify branch exists
  if ! git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
    echo "[reviewer] WARNING: Branch $BRANCH_NAME does not exist for $ISSUE_ID. Skipping."
    continue
  fi

  # Verify the branch has commits ahead of main
  AHEAD=$(git rev-list --count "main..$BRANCH_NAME" 2>/dev/null || echo "0")
  if [ "$AHEAD" -eq 0 ]; then
    echo "[reviewer] WARNING: $BRANCH_NAME has no commits ahead of main. Skipping."
    continue
  fi

  echo "[reviewer] Reviewing: $ISSUE_ID — $ISSUE_TITLE ($AHEAD commits)"

  PROMPT="You are reviewing an implementation branch for spec compliance and code quality.

Branch: $BRANCH_NAME ($AHEAD commits ahead of main)
Spec: $SPEC_FILE
Issue: $ISSUE_ID

Steps:
1. Read the spec at $SPEC_FILE to understand what was required.
2. Run: git diff main...$BRANCH_NAME
3. Review for:
   - Spec compliance: every requirement in the spec is implemented
   - Code quality: correctness, no dead code, good names
   - Tests present and covering the spec's Test Plan
   - No secrets, no leftover debug code, no TODO/FIXME without a bead reference
4. Post your review:
   bd comment $ISSUE_ID \"REVIEW: <your detailed findings>\"
5. Verdict:
   - If APPROVED (all requirements met, code quality good):
     bd label add $ISSUE_ID spec:reviewed
   - If CHANGES NEEDED (issues found):
     bd label add $ISSUE_ID spec:changes-requested
     Include specific fix instructions in your comment.

Be thorough but fair. Focus on correctness and spec compliance over style."

  claude --bg -p "$PROMPT" &

  echo "[reviewer] Review agent spawned for $ISSUE_ID"
  REVIEWED=$((REVIEWED + 1))
  sleep 1
done

echo "[reviewer] Done. Watch with: claude agents"
