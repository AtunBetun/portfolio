#!/usr/bin/env bash
#
# promote-spec.sh — Move a bead through the spec lifecycle
#
# This one stays as a shell script (no Claude session needed) because
# it's a quick label swap you run interactively.
#
# Usage:
#   ./scripts/promote-spec.sh <bead-id> planned   # idea → planned
#   ./scripts/promote-spec.sh <bead-id> ready     # planned → ready (agents pick it up)
#   ./scripts/promote-spec.sh <bead-id> idea      # reset to idea
#
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <bead-id> <idea|planned|ready>"
  exit 1
fi

BEAD_ID="$1"
TARGET="$2"

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
SPEC_FILE="$REPO_ROOT/docs/specs/${BEAD_ID}.md"

# Remove all spec lifecycle labels
for label in spec:idea spec:planned spec:ready spec:implemented spec:reviewed spec:changes-requested; do
  bd label remove "$BEAD_ID" "$label" 2>/dev/null || true
done

case "$TARGET" in
  idea)
    bd label add "$BEAD_ID" spec:idea
    echo "[$BEAD_ID] → spec:idea"
    ;;
  planned)
    if [ ! -f "$SPEC_FILE" ]; then
      echo "WARNING: No spec file at $SPEC_FILE"
      echo "Copy the template: cp docs/specs/TEMPLATE.md $SPEC_FILE"
    fi
    bd label add "$BEAD_ID" spec:planned
    echo "[$BEAD_ID] → spec:planned"
    ;;
  ready)
    if [ ! -f "$SPEC_FILE" ]; then
      echo "ERROR: Cannot promote to ready without a spec at $SPEC_FILE"
      exit 1
    fi
    bd label add "$BEAD_ID" spec:ready
    echo "[$BEAD_ID] → spec:ready (dispatcher will pick this up within 10 min)"
    ;;
  *)
    echo "Unknown target: $TARGET (use: idea, planned, ready)"
    exit 1
    ;;
esac
