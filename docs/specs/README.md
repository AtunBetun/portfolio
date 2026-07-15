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

## Your Day-to-Day

### Plan a feature

Just talk to Claude: "I want portal particle effects." Claude creates a bead,
proposes a plan, and writes the spec when you approve.

### Approve a spec

Read `docs/specs/<id>.md`. If it captures what you want, say "mark it ready"
or run `./scripts/promote-spec.sh <id> ready`.

### Check progress

```bash
claude agents                              # running sessions
bd query "label=spec:implemented"          # done, awaiting your review
bd query "label=spec:changes-requested"    # reviewer found issues
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
chmod +x scripts/*.sh
./scripts/install-cron.sh
```

## Scripts

| Script | Schedule | Purpose |
|--------|----------|---------|
| `dispatch-ready-specs.sh` | every 10 min | Claim spec:ready issues, spawn agents in worktrees |
| `review-branches.sh` | every 15 min | Review implement/* branches, post bd comments |
| `cleanup-worktrees.sh` | every 6 hours | Remove worktrees after merge |
| `promote-spec.sh` | manual | Move bead: idea → planned → ready |
| `install-cron.sh` | one-time | Install/remove cron jobs |
