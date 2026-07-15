# Agent Pipeline Rules

This project uses a spec-driven agent pipeline. Claude agents plan and implement
features in isolated git worktrees. The human stays in the loop at three gates.

## Human-in-the-Loop Gates

These are HARD gates. An agent MUST NOT proceed past them without explicit human approval.

### Gate 1: Planning

Claude proposes a plan. The human reviews, adjusts, and approves before any spec
is written. Never write a spec file without the human saying the plan is good.

### Gate 2: Spec Approval

Claude writes a detailed spec to `docs/specs/<bead-id>.md`. The human reviews it.
Only when the human says "ready" (or equivalent) does the spec get labeled
`spec:ready`. Never promote a spec to ready without human approval.

### Gate 3: Final Review

After implementation, the human reviews the work (reads the diff, checks the
tests, reads the reviewer agent's comments). Only the human merges into main.
Agents NEVER merge into main.

## What Agents CAN Do Autonomously

- Create beads issues (spec:idea, spec:planned)
- Write spec drafts for human review
- Implement code in isolated worktrees (after spec is promoted to ready)
- Commit to implement/* branches (NOT main)
- Run tests in their worktree
- Relabel beads through the implementation lifecycle
- Post review comments via `bd comment`

## What Agents CANNOT Do Without Human Approval

- Merge any branch into main
- Delete branches that haven't been merged
- Promote a spec to `spec:ready`
- Push to any remote
- Modify CLAUDE.md or .claude/rules/

## Spec Lifecycle Labels

```
spec:idea → spec:planned → [HUMAN GATE] → spec:ready → spec:implemented → spec:in-review → spec:reviewed → [HUMAN GATE: merge]
                                                                              ↘ spec:changes-requested → [HUMAN re-promotes to ready]
                                                                              ↘ spec:blocked → [HUMAN investigates]
```

## Label Ordering for Implementers

When transitioning labels, always ADD the new label BEFORE removing the old one.
This prevents a crash between the two commands from leaving a bead with no lifecycle label.

```bash
# Correct: add first, then remove
bd label add <id> spec:implemented
bd label remove <id> spec:ready

# WRONG: remove first risks leaving bead invisible if crash occurs
bd label remove <id> spec:ready    # ← crash here = bead in limbo
bd label add <id> spec:implemented
```

## Worktree Convention

- Worktrees live in `.worktrees/<bead-id>/`
- Branch naming: `implement/<bead-id>`
- One worktree per issue, one agent per worktree
- Never work directly on `main`

## Profile Override

This pipeline uses the **team-maintainer** profile for implementer agents ONLY
within their isolated worktree branches. They may commit and close beads. They
may NOT push or modify main.
