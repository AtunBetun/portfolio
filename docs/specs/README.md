# Spec-Driven Agent Pipeline

Plan features in detail, then let Claude agents auto-implement them in isolated worktrees.

Everything runs locally — no GitHub, no PRs. You merge branches when ready.

## How It Works

```
You tell Claude "plan X" ──→ spec written to docs/specs/<id>.md
                                    │
You say "that spec is ready" ──→ label becomes spec:ready
                                    │
Cron (every 10min) ──→ dispatcher sees ready spec
                                    │
                       ┌────────────┘
                       ▼
         git worktree .worktrees/<id>
         branch: implement/<id>
                       │
                       ▼
         claude --bg implements in worktree (visible in `claude agents`)
                       │
                       ▼
         commits, relabels → spec:implemented
                       │
         reviewer cron (every 15min) reads diff, posts bd comment
                       │
                       ▼
         spec:reviewed (or spec:changes-requested)
                       │
                       ▼
         You: git merge implement/<id>   ← when satisfied
```

## Labels (Lifecycle)

| Label | Meaning | Set by |
|-------|---------|--------|
| `spec:idea` | Issue exists, no spec yet | You |
| `spec:planned` | Spec file written at `docs/specs/<id>.md` | You |
| `spec:ready` | Agent can claim and implement this | You |
| `spec:implemented` | Code done, on branch, awaiting review | Agent |
| `spec:reviewed` | Review passed | Reviewer agent |
| `spec:changes-requested` | Issues found, needs rework | Reviewer agent |

## Your Workflow

### 1. Tell Claude what you want

> "Plan a particle system for portal effects"

Claude creates a bead, writes a spec to `docs/specs/<id>.md`, labels it `spec:planned`.

### 2. Review the spec, then promote

> "That spec looks good, mark it ready"

Or manually: `./scripts/promote-spec.sh <id> ready`

### 3. Wait (or watch)

```bash
claude agents         # see running implementer sessions
bd query "label=spec:implemented"  # see what's done
```

### 4. Review and merge

The reviewer agent posts comments on the bead. When satisfied:

```bash
git merge implement/<id>     # merge into main
# cleanup cron handles the rest, or:
git worktree remove .worktrees/<id>
git branch -d implement/<id>
bd close <id>
```

## Setup

```bash
chmod +x scripts/*.sh
./scripts/install-cron.sh
```

### Permission Mode

For unattended cron, agents can't wait for permission prompts. Options:

1. Add `--dangerously-skip-permissions` to the `claude --bg` calls in the scripts
   (only if this box has no internet / is sandboxed)
2. Add broad allowlist rules to `.claude/settings.json` for `bd`, `git`, file operations

## Scripts

| Script | Cron | Purpose |
|--------|------|---------|
| `dispatch-ready-specs.sh` | every 10 min | Find spec:ready issues, spawn implementer agents |
| `review-open-prs.sh` | every 15 min | Review spec:implemented branches, post comments |
| `cleanup-worktrees.sh` | every 6 hours | Remove worktrees for merged/closed work |
| `promote-spec.sh` | manual | Move bead through idea → planned → ready |
| `install-cron.sh` | one-time | Install/remove all cron jobs |

## Monitoring

```bash
claude agents                              # live agent sessions
tail -f ~/.claude/logs/dispatch.log        # dispatcher output
tail -f ~/.claude/logs/review.log          # reviewer output
bd query "status=in_progress"              # work in flight
bd query "label=spec:changes-requested"    # needs rework
```
