# Feature: <Title>

> Bead: `<bead-id>`
> Status: idea | planned | ready
> Priority: P0-P4

## Context

Why this feature exists. What user-visible outcome it delivers.
What problem it solves.

## Requirements

- [ ] Exact, testable behavior — not vague goals
- [ ] Each requirement is one sentence, falsifiable
- [ ] Include edge cases and error states

## Constraints

- **Must not modify:** (list files/modules off-limits)
- **Performance budget:** (e.g., <16ms per frame, <100ms load)
- **Dependencies:** none / requires `<other-bead-id>` merged first
- **Browser/runtime:** (if relevant)

## Interface Contract

What other code can assume about this feature's exports/API.
Include type signatures, event names, or message formats.

```typescript
// Example:
export function createParticleSystem(opts: ParticleOpts): ParticleSystem
```

## Design Decisions

Key architectural choices and why.
Trade-offs considered.

## Test Plan

- **Unit:** (specific logic to test)
- **Integration:** (how it composes with other systems)
- **Visual/manual:** (what it should look like, if applicable)

## Files to Create/Modify

- `src/path/to/new-file.ts` (new) — purpose
- `src/path/to/existing.ts` (modify) — what changes

## Out of Scope

Explicitly list what this feature does NOT do, to prevent scope creep.
