# Spec-Driven Agent Pipeline

A plan-first, auto-dispatch workflow: you write specs, agents implement, PRs appear.

## How It Works

```
You write spec ──→ bd label "spec:ready" ──→ cron dispatches agent ──→ PR opened
                                                                          │
                                              reviewer cron ◄─────────────┘
                                                   │
                                              comments on PR
```

## Lifecycle

| Label | Meaning | Who |
|-------|---------|-----|
| `spec:idea` | Issue exists, no spec yet | You |
| `spec:planned` | Spec file written in `docs/specs/<bead-id>.md` | You |
| `spec:ready` | Spec reviewed, agent can claim it | You (promote) |
| `spec:in-review` | Agent finished, PR open | Agent |

## Your Workflow

### 1. Create the issue

```bash
bd create --title="Particle effects for portals" --type=feature --labels="spec:idea" --priority=2
# → portfolio-abc123
```

### 2. Write the spec

Copy the template and fill it in:

```bash
cp docs/specs/TEMPLATE.md docs/specs/portfolio-abc123.md
# Edit docs/specs/portfolio-abc123.md with your full requirements
```

### 3. Promote to ready

```bash
./scripts/promote-spec.sh portfolio-abc123 ready
```

### 4. Wait (or watch)

```bash
claude agents          # see running agents
tail -f ~/.claude/logs/dispatch.log  # watch dispatcher
gh pr list             # see opened PRs
```

### 5. Review the PR

The reviewer cron will post comments automatically, or review yourself.

## Setup

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Install cron jobs
./scripts/install-cron.sh

# Verify
crontab -l
```

### Permission Mode

The dispatch script spawns `claude --bg` agents. For unattended operation
(cron), the agents need permission to run tools without prompting. Options:

1. **Recommended for sandboxed environments:**
   Edit `scripts/dispatch-ready-specs.sh` and add `--dangerously-skip-permissions`
   to the `claude --bg` invocation.

2. **For your dev box:**
   Add broad allowlist rules to `.claude/settings.json` so common operations
   (git, gh, bd) don't prompt. The agents inherit project settings.

3. **Semi-automated:**
   Don't use cron — run `./scripts/dispatch-ready-specs.sh` manually when you're
   at your desk. The spawned agents will prompt once for permission, then proceed.

## Querying

```bash
# What's ready for agents?
bd query "label=spec:ready AND status=open AND assignee=none"

# What's being worked on?
bd query "label=spec:ready AND status=in_progress"

# What's awaiting review?
bd query "label=spec:in-review"

# All open specs
bd query "label=spec:idea OR label=spec:planned OR label=spec:ready"
```

## With Codex

If Codex is implementing instead of Claude:

1. Query ready specs: `bd query "label=spec:ready AND status=open AND assignee=none" --json`
2. For each, feed the spec file as the Codex prompt
3. Include in the prompt: "Open a draft PR. Reference `<bead-id>` in the body."
4. The review cron still works — Claude reviews Codex's PRs automatically.

## Scripts

| Script | Purpose |
|--------|---------|
| `dispatch-ready-specs.sh` | Finds spec:ready issues, spawns implementer agents |
| `review-open-prs.sh` | Finds unreviewed PRs, spawns reviewer agents |
| `promote-spec.sh` | Move a bead through idea → planned → ready |
| `install-cron.sh` | Install/remove the cron jobs |
