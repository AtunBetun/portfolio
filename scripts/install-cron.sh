#!/usr/bin/env bash
#
# install-cron.sh — Install/remove the pipeline cron jobs
#
# Usage:
#   ./scripts/install-cron.sh          # install
#   ./scripts/install-cron.sh --remove # remove
#
set -euo pipefail

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
SCRIPTS_DIR="$REPO_ROOT/scripts"
LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

CRON_MARKER="# portfolio-agent-pipeline"

if [ "${1:-}" = "--remove" ]; then
  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" | crontab -
  echo "Cron jobs removed."
  exit 0
fi

# Cron schedule:
#   Dispatcher: every 10 minutes
#   Reviewer:   every 15 minutes (offset by 5 min)
#   Cleanup:    every 6 hours
DISPATCH_CRON="*/10 * * * * cd $REPO_ROOT && $SCRIPTS_DIR/dispatch-ready-specs.sh >> $LOG_DIR/dispatch.log 2>&1 $CRON_MARKER"
REVIEW_CRON="5,20,35,50 * * * * cd $REPO_ROOT && $SCRIPTS_DIR/review-open-prs.sh >> $LOG_DIR/review.log 2>&1 $CRON_MARKER"
CLEANUP_CRON="0 */6 * * * cd $REPO_ROOT && $SCRIPTS_DIR/cleanup-worktrees.sh >> $LOG_DIR/cleanup.log 2>&1 $CRON_MARKER"

# Remove old entries, add fresh ones
EXISTING=$(crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true)

echo "$EXISTING
$DISPATCH_CRON
$REVIEW_CRON
$CLEANUP_CRON" | crontab -

echo "Cron jobs installed:"
echo "  Dispatcher: every 10 min"
echo "  Reviewer:   offset 5 min from dispatcher"
echo "  Cleanup:    every 6 hours"
echo ""
echo "Logs: $LOG_DIR/{dispatch,review,cleanup}.log"
echo "Remove: $SCRIPTS_DIR/install-cron.sh --remove"
echo "Watch:  claude agents"
