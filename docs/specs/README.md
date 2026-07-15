# Spec-Driven Agent Pipeline

Plan features with Claude, approve specs, let agents implement in isolated worktrees.

Everything runs locally. You stay in the loop at three gates.

## Three Human Gates

| Gate | What happens | Your action |
|------|-------------|-------------|
| **1. Planning** | Claude proposes a plan for a feature | You approve or adjust |
| **2. Spec approval** | Claude writes `docs/specs/<id>.md` | You say "ready" to green-light |
| **3. Final review** | Agent implements, reviewer comments | You read diff, merge to main |

Between gates, agents work autonomously in worktrees.

## Flow

```
"Plan particle effects" ──→ Claude proposes plan
                                    │
"Looks good, write the spec" ──→ spec at docs/specs/<id>.md
                                    │
                    git add + git commit (spec must be committed!)
                                    │
"Mark it ready" ──→ label: spec:ready           ← GATE (you)
                                    │
Cron (every 10min) ──→ dispatcher claims issue
                                    │
         git worktree .worktrees/<id>
         branch: implement/<id>
                                    │
         agent implements, commits
                                    │
         relabels → spec:implemented
                                    │
         reviewer (every 15min) reads diff, posts bd comment
                                    │
         spec:reviewed (or spec:changes-requested)
                                    │
"Show me the diff" ──→ you review   ← GATE (you)
                                    │
"Merge it" ──→ git merge implement/<id>
                                    │
         cleanup (every 6h) removes worktree + branch
```

## Labels (Lifecycle)

| Label | Set by | Meaning |
|-------|--------|---------|
| `spec:idea` | Claude or you | Issue exists, no spec |
| `spec:planned` | Claude | Spec drafted, awaiting your review |
| `spec:ready` | **You only** | Approved for implementation |
| `spec:implemented` | Agent | Code on branch, awaiting review |
| `spec:reviewed` | Reviewer agent | Review passed |
| `spec:changes-requested` | Reviewer agent | Issues found |
| `spec:blocked` | Agent | Cannot complete, needs human |

## Your Day-to-Day

### Plan a feature

Just talk to Claude: "I want portal particle effects." Claude creates a bead,
proposes a plan, and writes the spec when you approve.

### Approve a spec

Read `docs/specs/<id>.md`. If it captures what you want:

```bash
# Spec MUST be committed (worktrees branch from main)
git add docs/specs/<id>.md
git commit -m "spec: <id> — <title>"

# Then promote
./scripts/promote-spec.sh <id> ready
```

### Check progress

```bash
claude agents                              # running sessions
bd query "label=spec:implemented"          # done, awaiting your review
bd query "label=spec:changes-requested"    # reviewer found issues
bd query "label=spec:blocked"              # agent got stuck
```

### Handle changes-requested

If the reviewer found issues, read the comment and re-queue:

```bash
bd comments <id>                           # read what the reviewer said
# Fix the spec if needed, then:
./scripts/promote-spec.sh <id> ready       # clears assignee, re-queues for dispatch
```

### Review and merge

```bash
git diff main...implement/<id>             # see what changed
bd comments <id>                           # read reviewer feedback
git merge implement/<id>                   # merge when happy
```

The cleanup cron removes worktrees for merged branches automatically.

## Setup

```bash
./scripts/install-cron.sh    # chmod's scripts + installs cron
```

That's it. The installer handles making scripts executable and setting PATH for cron.

## Scripts

| Script | Schedule | Purpose |
|--------|----------|---------|
| `dispatch-ready-specs.sh` | every 10 min | Query beads, create worktrees, spawn implementers |
| `review-branches.sh` | every 15 min | Review implement/* branches, post bd comments |
| `cleanup-worktrees.sh` | every 6 hours | Remove worktrees after merge, recover orphaned claims |
| `promote-spec.sh` | manual | Move bead: idea → planned → ready (clears assignee) |
| `install-cron.sh` | one-time | Install/remove cron jobs, set PATH, chmod scripts |

## Error Recovery

| Problem | What happens | Fix |
|---------|-------------|-----|
| Agent crashes mid-implement | Bead is claimed, no worktree | Cleanup (6h) unclaims it automatically |
| Reviewer requests changes | Dead-end until you act | `promote-spec.sh <id> ready` re-queues |
| Spec not committed | Dispatcher skips it with a warning | `git add + commit` the spec |
| Agent blocked | Labels spec:blocked + posts comment | Read comment, fix spec, re-promote |
| Stale worktree | From previous failed run | Dispatcher cleans it before creating new one |

## Monitoring

```bash
claude agents                              # live agent sessions
tail -f ~/.claude/logs/dispatch.log        # dispatcher output
tail -f ~/.claude/logs/review.log          # reviewer output
tail -f ~/.claude/logs/cleanup.log         # cleanup output
bd query "status=in_progress"              # work in flight
```
