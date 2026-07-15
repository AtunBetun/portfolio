# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A 3D portfolio website built as a Wind Waker–inspired game. The player character runs around a toon-shaded island hub, interacting with objects that present career and life content. Built with Three.js for rendering and Rapier3D (WASM) for physics.

## Commands

```bash
bun install               # install dependencies
bun run dev               # start Vite dev server (sources/ is the Vite root)
bun run build             # production build → dist/
bun run preview           # serve production build on :4173

bun run lint              # ESLint over sources/ and data/
bun run format            # Prettier check (no --write)
bun test tests/unit/      # bun:test unit tests
bun test tests/unit/content-map.test.js  # run a single unit test

bunx playwright test                     # all e2e specs (builds + serves first)
bunx playwright test tests/smoke.spec.js # single e2e spec

bun run verify            # full gate: lint → format → unit tests → build → e2e
```

## Architecture

### Game loop and the singleton

`sources/index.js` instantiates one `Game` (singleton via `Game.getInstance()`). Every subsystem (Camera, Physics, Player, World, Rendering, UI) grabs the instance in its constructor and registers its `update()` on the ordered **Ticker** event bus.

Ticker fires `'tick'` each frame; listeners declare a numeric **order** (lower runs first):

| Order | System |
|-------|--------|
| 3 | Physics.update (Rapier step) |
| 5 | World.update (collectibles, water) |
| 6 | Player.update (input → movement) |
| 7 | Camera.update (chase-cam lerp) |
| 998 | Rendering (OutlineEffect draw) |

### Rendering pipeline

Toon-cel shading with a Wind Waker palette. Key pieces:

- `Rendering/Palette.js` — single source of truth for all colors (hex constants)
- `Rendering/ToonMaterials.js` — `toon(colorKey)` / `toonFlat(colorKey)` factory functions; pass a key from `PALETTE`
- `Rendering/ToonLights.js`, `SkyDome.js`, `Clouds.js` — environment setup
- `Rendering.js` — WebGLRenderer + `OutlineEffect` for ink outlines

### Physics (Rapier 3D)

`Physics.js` wraps the Rapier WASM world. The player uses a **kinematic character controller** with auto-step and ground-snap. Physics is optional — if the WASM binary fails to load, the game runs in a simplified fallback mode without collision.

### Data layer

Content lives in `data/` as plain ES module exports, separate from rendering code:

- `data/content-map.js` — life facts and career entries (keyed by room ID)
- `data/rooms.js` — world layout, zone definitions, floor size

### Testing

- **Unit tests** (`tests/unit/`) use `bun:test` and validate data contracts (content-map integrity, room graph consistency).
- **E2e tests** (`tests/*.spec.js`) use Playwright against the production build. The game exposes `window.__game` (see `Debug.js`) for assertions on load state, player position, room transitions.
- Playwright runs two projects: `desktop` (1280×720) and `mobile` (375×667, touch).

### Input system

Keyboard (`Inputs/Keyboard.js`) and touch joystick via nipple.js (`Inputs/Touch.js`). Movement is camera-relative — raw input is projected onto the camera's forward/right plane in `Player.update`.

## Conventions

- **No semicolons**, single quotes, trailing comma: none (Prettier enforces; see `.prettierrc`).
- Pure ES modules (`"type": "module"`). Use `.js` extensions in all import paths.
- Colors are never hardcoded in geometry/material code — always reference `PALETTE` keys.
- All source lives under `sources/Game/`; `data/` holds content only (no Three.js imports).
- Vite root is `sources/` (not the repo root); static assets go in a top-level `static/` dir.
- WASM plugins (`vite-plugin-wasm`, `vite-plugin-top-level-await`) are required for Rapier.

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:
   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```
5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**
- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
