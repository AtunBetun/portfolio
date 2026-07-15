#!/usr/bin/env bash
#
# install-cron.sh — Install/remove the pipeline cron jobs
#
# Usage:
#   ./scripts/install-cron.sh          # install
#   ./scripts/install-cron.sh --remove # remove
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
SCRIPTS_DIR="$REPO_ROOT/scripts"
LOG_DIR="$HOME/.claude/logs"
mkdir -p "$LOG_DIR"

CRON_MARKER="# portfolio-agent-pipeline"

# Ensure scripts are executable
chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || true

if [ "${1:-}" = "--remove" ]; then
  EXISTING=$(crontab -l 2>/dev/null || true)
  FILTERED=$(echo "$EXISTING" | grep -v "$CRON_MARKER" || true)
  if [ -n "$FILTERED" ]; then
    echo "$FILTERED" | crontab -
  else
    crontab -r 2>/dev/null || true
  fi
  echo "Cron jobs removed."
  exit 0
fi

# PATH prefix for cron environment (claude and bd aren't on default cron PATH)
CRON_PATH="PATH=$HOME/.toolbox/bin:$HOME/.local/bin:/usr/local/bin:/usr/bin:/bin"

# Cron schedule:
#   Dispatcher: every 10 minutes (at :00, :10, :20, :30, :40, :50)
#   Reviewer:   every 15 minutes (at :07, :22, :37, :52) — offset to avoid collision
#   Cleanup:    every 6 hours (at :03) — offset from dispatcher
DISPATCH_CRON="*/10 * * * * $SCRIPTS_DIR/dispatch-ready-specs.sh >> $LOG_DIR/dispatch.log 2>&1 $CRON_MARKER"
REVIEW_CRON="7,22,37,52 * * * * $SCRIPTS_DIR/review-branches.sh >> $LOG_DIR/review.log 2>&1 $CRON_MARKER"
CLEANUP_CRON="3 */6 * * * $SCRIPTS_DIR/cleanup-worktrees.sh >> $LOG_DIR/cleanup.log 2>&1 $CRON_MARKER"

# Remove old pipeline entries, keep everything else
EXISTING=$(crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true)

# Build new crontab with PATH at the top
NEW_CRONTAB="$CRON_PATH $CRON_MARKER
$EXISTING
$DISPATCH_CRON
$REVIEW_CRON
$CLEANUP_CRON"

echo "$NEW_CRONTAB" | crontab -

echo "Cron jobs installed:"
echo "  Dispatcher: */10 (every 10 min)"
echo "  Reviewer:   7,22,37,52 (every 15 min, offset)"
echo "  Cleanup:    :03 every 6 hours"
echo ""
echo "Logs:   $LOG_DIR/{dispatch,review,cleanup}.log"
echo "Remove: $SCRIPTS_DIR/install-cron.sh --remove"
echo "Watch:  claude agents"
echo ""
echo "NOTE: Scripts are in $SCRIPTS_DIR"
echo "      If you move the repo, re-run this installer."
