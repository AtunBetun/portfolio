#!/usr/bin/env bash
#
# install-cron.sh — Install the dispatch + review cron jobs
#
# Dispatcher runs every 10 minutes, reviewer every 15 minutes (offset).
# Both log to ~/.claude/logs/ for debugging.
#
# Usage:
#   ./scripts/install-cron.sh          # install crons
#   ./scripts/install-cron.sh --remove # remove crons
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

# Build new cron entries
DISPATCH_CRON="*/10 * * * * cd $REPO_ROOT && $SCRIPTS_DIR/dispatch-ready-specs.sh >> $LOG_DIR/dispatch.log 2>&1 $CRON_MARKER"
REVIEW_CRON="5,20,35,50 * * * * cd $REPO_ROOT && $SCRIPTS_DIR/review-open-prs.sh >> $LOG_DIR/review.log 2>&1 $CRON_MARKER"

# Remove old entries if any, then add new ones
EXISTING=$(crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true)

NEW_CRONTAB=$(cat <<EOF
$EXISTING
$DISPATCH_CRON
$REVIEW_CRON
EOF
)

echo "$NEW_CRONTAB" | crontab -

echo "Cron jobs installed:"
echo "  Dispatcher: every 10 min → $LOG_DIR/dispatch.log"
echo "  Reviewer:   every 15 min (offset 5) → $LOG_DIR/review.log"
echo ""
echo "Manage:"
echo "  crontab -l                          # view"
echo "  $SCRIPTS_DIR/install-cron.sh --remove  # remove"
echo "  tail -f $LOG_DIR/dispatch.log       # watch dispatcher"
echo "  tail -f $LOG_DIR/review.log         # watch reviewer"
