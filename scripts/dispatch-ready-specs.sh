#!/usr/bin/env bash
#
# dispatch-ready-specs.sh — Find spec:ready issues, create worktrees, spawn implementers
#
# This script does all deterministic work (query, claim, worktree creation) in shell,
# then spawns Claude only for the actual implementation (the part needing judgment).
#
# Usage:
#   ./scripts/dispatch-ready-specs.sh          # normal run
#   ./scripts/dispatch-ready-specs.sh --dry-run
#
set -euo pipefail

# Resolve paths — always run from repo root
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# Ensure tools are on PATH (cron has minimal PATH)
export PATH="$HOME/.toolbox/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

DRY_RUN=false
MAX_IMPLEMENTERS=4
LOCK_FILE="$REPO_ROOT/.worktrees/.dispatch.lock"

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --max=*) MAX_IMPLEMENTERS="${arg#--max=}" ;;
  esac
done

# Ensure worktrees directory exists (for lockfile)
mkdir -p "$REPO_ROOT/.worktrees"

# Prevent overlapping dispatcher runs
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[dispatch] Another dispatcher is already running. Exiting."
  exit 0
fi

# Query for ready specs — deterministic shell, no LLM needed
READY_ISSUES=$(bd query "label=spec:ready AND status=open AND assignee=none" --json 2>/dev/null || echo "[]")
ISSUE_COUNT=$(echo "$READY_ISSUES" | jq 'length')

if [ "$ISSUE_COUNT" -eq 0 ]; then
  echo "[dispatch] No spec:ready issues available. Nothing to do."
  exit 0
fi

echo "[dispatch] Found $ISSUE_COUNT ready issue(s)."

# Count running agents for this repo
RUNNING=$(claude agents --json --cwd "$REPO_ROOT" 2>/dev/null \
  | jq '[.[] | select(.status == "running")] | length' 2>/dev/null || echo "0")
SLOTS=$((MAX_IMPLEMENTERS - RUNNING))

if [ "$SLOTS" -le 0 ]; then
  echo "[dispatch] $RUNNING agent(s) running (max $MAX_IMPLEMENTERS). No slots free."
  exit 0
fi

echo "[dispatch] $RUNNING running, $SLOTS slot(s) available."

# Read issues into an array to avoid pipe subshell and SIGPIPE issues
readarray -t ISSUE_LINES < <(echo "$READY_ISSUES" | jq -c '.[]')

DISPATCHED=0
for issue in "${ISSUE_LINES[@]}"; do
  [ "$DISPATCHED" -ge "$SLOTS" ] && break

  ISSUE_ID=$(echo "$issue" | jq -r '.id')
  ISSUE_TITLE=$(echo "$issue" | jq -r '.title')
  SPEC_FILE="docs/specs/${ISSUE_ID}.md"
  BRANCH_NAME="implement/$ISSUE_ID"
  WORKTREE_PATH="$REPO_ROOT/.worktrees/$ISSUE_ID"

  # Verify spec file is committed to main (worktree branches from main)
  if ! git cat-file -e "main:$SPEC_FILE" 2>/dev/null; then
    echo "[dispatch] WARNING: $SPEC_FILE not committed to main. Skipping $ISSUE_ID."
    echo "           Commit the spec first: git add $SPEC_FILE && git commit"
    continue
  fi

  echo "[dispatch] Processing: $ISSUE_ID — $ISSUE_TITLE"

  if [ "$DRY_RUN" = true ]; then
    echo "           [DRY RUN] Would claim and dispatch."
    continue
  fi

  # Clean up stale worktree if it exists (from a previous failed run)
  if [ -d "$WORKTREE_PATH" ]; then
    echo "[dispatch] Removing stale worktree: $WORKTREE_PATH"
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
    git worktree prune 2>/dev/null || true
  fi

  # Clean up stale branch if it exists and isn't checked out elsewhere
  if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
    # Only delete if no worktree has it checked out (anchored match)
    if ! git worktree list --porcelain | grep -qx "branch refs/heads/$BRANCH_NAME"; then
      git branch -D "$BRANCH_NAME" 2>/dev/null || true
    else
      echo "[dispatch] WARNING: Branch $BRANCH_NAME is checked out in another worktree. Skipping."
      continue
    fi
  fi

  # Create worktree on a new branch from main
  if ! git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME" main 2>&1; then
    echo "[dispatch] ERROR: Failed to create worktree for $ISSUE_ID. Skipping."
    continue
  fi

  # Claim the issue AFTER worktree is successfully created
  # If claim fails, remove the worktree to avoid orphan state
  if ! bd update "$ISSUE_ID" --claim --quiet 2>/dev/null; then
    echo "[dispatch] ERROR: Failed to claim $ISSUE_ID. Removing worktree."
    git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || rm -rf "$WORKTREE_PATH"
    git worktree prune 2>/dev/null || true
    git branch -D "$BRANCH_NAME" 2>/dev/null || true
    continue
  fi

  echo "[dispatch] Worktree ready: $WORKTREE_PATH (branch: $BRANCH_NAME)"

  # Spawn implementer — Claude only for the judgment work (implementation)
  # Close fd 9 (flock) and redirect stdin from /dev/null to prevent pipe drain
  PROMPT="You are implementing a feature for this project.

Your working directory is already set to the correct location.
You are on branch '$BRANCH_NAME' in an isolated git worktree.

Instructions:
1. Read the spec: $SPEC_FILE
2. Implement everything described in the spec.
3. Write tests as described in the Test Plan section.
4. Run the tests and fix any failures.
5. Commit your work with message: feat($ISSUE_ID): $ISSUE_TITLE
6. When done, run these commands to update the bead (add FIRST, then remove):
   bd label add $ISSUE_ID spec:implemented
   bd label remove $ISSUE_ID spec:ready
7. If you cannot complete the work (tests won't pass, spec is ambiguous):
   bd label add $ISSUE_ID spec:blocked
   bd label remove $ISSUE_ID spec:ready
   bd comment $ISSUE_ID \"BLOCKED: <reason>\"

Do NOT push. Do NOT merge into main. Do NOT switch branches.
All work stays local on this branch."

  (cd "$WORKTREE_PATH" && claude --bg -p "$PROMPT" </dev/null 9>&-) &

  echo "[dispatch] Implementer spawned for $ISSUE_ID"
  DISPATCHED=$((DISPATCHED + 1))
  sleep 1
done

echo "[dispatch] Dispatched $DISPATCHED implementer(s). Watch with: claude agents"
