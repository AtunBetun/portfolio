#!/usr/bin/env bash
#
# promote-spec.sh — Move a bead through the spec lifecycle
#
# Usage:
#   ./scripts/promote-spec.sh <bead-id> planned   # idea → planned (spec file written)
#   ./scripts/promote-spec.sh <bead-id> ready     # planned → ready (agent can pick it up)
#   ./scripts/promote-spec.sh <bead-id> idea      # reset to idea (pull back from ready)
#
set -euo pipefail

if [ $# -lt 2 ]; then
  echo "Usage: $0 <bead-id> <planned|ready|idea>"
  exit 1
fi

BEAD_ID="$1"
TARGET="$2"

REPO_ROOT="$(git -C "$(dirname "$0")/.." rev-parse --show-toplevel)"
SPEC_FILE="$REPO_ROOT/docs/specs/${BEAD_ID}.md"

# Remove all spec: labels first
for label in spec:idea spec:planned spec:ready spec:in-review; do
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
      echo "Create one from: docs/specs/TEMPLATE.md"
    fi
    bd label add "$BEAD_ID" spec:planned
    echo "[$BEAD_ID] → spec:planned"
    ;;
  ready)
    if [ ! -f "$SPEC_FILE" ]; then
      echo "ERROR: Cannot promote to ready — no spec file at $SPEC_FILE"
      echo "Write the spec first, then promote to ready."
      exit 1
    fi
    bd label add "$BEAD_ID" spec:ready
    echo "[$BEAD_ID] → spec:ready (agents will pick this up on next dispatch cycle)"
    ;;
  *)
    echo "Unknown target: $TARGET (use: idea, planned, ready)"
    exit 1
    ;;
esac
