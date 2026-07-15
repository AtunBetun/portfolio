#!/usr/bin/env bash
#
# review-open-prs.sh — Cron-triggered PR reviewer
#
# Finds draft PRs opened by dispatch-ready-specs agents,
# spawns a Claude reviewer session for each unreviewed one.
#
# Usage:
#   ./scripts/review-open-prs.sh
#   ./scripts/review-open-prs.sh --dry-run
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
cd "$REPO_ROOT"

DRY_RUN=false
MAX_REVIEWS=3

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --max=*) MAX_REVIEWS="${arg#--max=}" ;;
  esac
done

# Find open PRs with implement/ branches that haven't been reviewed
# (no review comments yet, or still in draft)
PRS=$(gh pr list --json number,title,headRefName,isDraft,reviewDecision \
  --jq '[.[] | select(.headRefName | startswith("implement/"))]' 2>/dev/null || echo "[]")

PR_COUNT=$(echo "$PRS" | jq 'length')

if [ "$PR_COUNT" -eq 0 ]; then
  echo "[reviewer] No implement/ PRs found. Nothing to review."
  exit 0
fi

echo "[reviewer] Found $PR_COUNT implement/ PR(s)."

REVIEWED=0
echo "$PRS" | jq -c '.[]' | while read -r pr; do
  if [ "$REVIEWED" -ge "$MAX_REVIEWS" ]; then
    echo "[reviewer] Hit max reviews ($MAX_REVIEWS). Stopping."
    break
  fi

  PR_NUM=$(echo "$pr" | jq -r '.number')
  PR_TITLE=$(echo "$pr" | jq -r '.title')
  REVIEW_DECISION=$(echo "$pr" | jq -r '.reviewDecision // "NONE"')

  # Skip already-approved PRs
  if [ "$REVIEW_DECISION" = "APPROVED" ]; then
    continue
  fi

  echo "[reviewer] Reviewing PR #$PR_NUM: $PR_TITLE"

  if [ "$DRY_RUN" = true ]; then
    echo "           [DRY RUN] Would review."
    REVIEWED=$((REVIEWED + 1))
    continue
  fi

  PROMPT=$(cat <<EOF
Review PR #$PR_NUM ("$PR_TITLE") for this project.

Steps:
1. Run: gh pr diff $PR_NUM
2. Read the associated spec file (look in docs/specs/ or the PR body for the link)
3. Review for:
   - Spec compliance: does the implementation match every requirement?
   - Code quality: correctness, no dead code, good names, tests present
   - Safety: no secrets committed, no destructive operations
4. Post your review as a GitHub PR review:
   - If everything looks good: gh pr review $PR_NUM --approve --body "..."
   - If issues found: gh pr review $PR_NUM --request-changes --body "..."
   - For inline comments use: gh api repos/{owner}/{repo}/pulls/$PR_NUM/comments

Be thorough but fair. Minor style nits go in the body, not as change requests.
EOF
)

  # NOTE: Add --dangerously-skip-permissions if running in a sandboxed environment.
  claude --bg \
    --allowedTools "Bash Read" \
    -p "$PROMPT" &

  echo "[reviewer] Review agent spawned for PR #$PR_NUM"
  REVIEWED=$((REVIEWED + 1))
  sleep 2
done

echo "[reviewer] Done. Check progress with: claude agents"
