#!/usr/bin/env bash
#
# promote-spec.sh — Move a bead through the spec lifecycle
#
# Usage:
#   ./scripts/promote-spec.sh <bead-id> planned   # idea → planned
#   ./scripts/promote-spec.sh <bead-id> ready     # planned → ready (agents pick it up)
#   ./scripts/promote-spec.sh <bead-id> idea      # reset to idea
#
set -euo pipefail

export PATH="$HOME/.toolbox/bin:$HOME/.local/bin:$PATH"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <bead-id> <idea|planned|ready>"
  exit 1
fi

BEAD_ID="$1"
TARGET="$2"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)"
cd "$REPO_ROOT"

SPEC_FILE="$REPO_ROOT/docs/specs/${BEAD_ID}.md"

# Validate target BEFORE modifying any state
case "$TARGET" in
  idea|planned|ready) ;; # valid
  *)
    echo "ERROR: Unknown target '$TARGET'. Use: idea, planned, ready"
    exit 1
    ;;
esac

# For 'ready', verify spec file exists AND is committed
if [ "$TARGET" = "ready" ]; then
  if [ ! -f "$SPEC_FILE" ]; then
    echo "ERROR: Cannot promote to ready — no spec file at $SPEC_FILE"
    echo "Create one from: cp docs/specs/TEMPLATE.md $SPEC_FILE"
    exit 1
  fi
  if ! git cat-file -e "HEAD:docs/specs/${BEAD_ID}.md" 2>/dev/null; then
    echo "ERROR: Spec file exists but is not committed to git."
    echo "Commit it first: git add $SPEC_FILE && git commit -m 'spec: $BEAD_ID'"
    exit 1
  fi
fi

# For 'planned', just warn if no spec file
if [ "$TARGET" = "planned" ] && [ ! -f "$SPEC_FILE" ]; then
  echo "WARNING: No spec file at $SPEC_FILE"
  echo "Copy the template: cp docs/specs/TEMPLATE.md $SPEC_FILE"
fi

# Now safe to modify labels — target is validated
for label in spec:idea spec:planned spec:ready spec:implemented spec:reviewed spec:changes-requested spec:blocked; do
  bd label remove "$BEAD_ID" "$label" 2>/dev/null || true
done

# Clear assignee when re-promoting (allows re-dispatch)
bd update "$BEAD_ID" --assignee="" --quiet 2>/dev/null || true

# Add the target label
bd label add "$BEAD_ID" "spec:$TARGET"
echo "[$BEAD_ID] → spec:$TARGET"

case "$TARGET" in
  ready)
    echo "Dispatcher will pick this up within 10 minutes."
    echo "Watch with: claude agents"
    ;;
esac
