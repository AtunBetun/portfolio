# Feature: Cayuco Race Minigame — Ocean-to-Ocean Sprint

> Bead: `portfolio-als`
> Status: planned
> Priority: P2

## Context

The portfolio tells its story through gameplay. The cayuco Ocean-to-Ocean race is a
defining life experience — and it becomes a 30-second rhythm-paddling minigame that
portfolio visitors can play on desktop or mobile.

The player launches from a docked cayuco in the Panama City hub and sprints through
procedural waves. Core loop: tap to paddle, steer against wave drift, nail timing
windows on big event waves for speed boosts. Solo time trial with medal thresholds.

Depends on the hub rework (`portfolio-k3u`) existing first — the canal dock and CREBA
billboard live in that hub.

## Requirements

- [ ] Player can start the race by interacting with a docked cayuco in the hub
- [ ] A 3D-rendered CREBA (Club de Regatas de Balboa) billboard is visible near the dock
- [ ] Race begins with a 3-2-1 countdown after interaction
- [ ] Paddling uses alternating left/right input (mobile: tap left/right screen halves; desktop: A/D or arrow keys)
- [ ] Each paddle stroke propels the cayuco forward and nudges heading slightly (paddle left drifts right, vice versa)
- [ ] Ambient waves roll under the cayuco, creating visual motion and gentle lateral drift
- [ ] The player steers to correct drift (mobile: swipe left/right on screen; desktop: hold A/D between paddle strokes)
- [ ] Device tilt steering is NOT in scope for v1 (future enhancement)
- [ ] Event waves spawn semi-randomly (~every 4-6s, yielding 5-7 per 30s race)
- [ ] Event waves are visually distinct: larger rollers with a white foam crest
- [ ] A rhythm-game timing ring appears when an event wave approaches (ring shrinks toward a hit-zone)
- [ ] Perfect timing (ring centered) grants a speed boost with golden splash effect
- [ ] Good timing (ring close) maintains current speed, no penalty
- [ ] Bad timing (ring missed or far off) causes harsh speed loss, boat rocks, red flash on ring
- [ ] The course is ~30 seconds long at optimal play, linear with gentle curves
- [ ] Course has 3 difficulty phases: calm start (0-10s), building seas (10-20s), rough finale (20-30s)
- [ ] A progress bar shows distance to finish line
- [ ] A timer counts up from 0
- [ ] Race ends when the cayuco crosses the finish line
- [ ] Results overlay shows: time, medal earned, Retry button, Back to Hub button
- [ ] Medal thresholds: Gold <= 28s, Silver <= 32s, Bronze <= 38s, no medal > 38s
- [ ] Camera is chase-cam behind and above the cayuco, tuned low enough that waves loom
- [ ] Camera sways gently with ambient waves
- [ ] Camera transitions smoothly from hub chase-cam to race chase-cam on start
- [ ] All inputs work on both desktop (keyboard) and mobile (touch) with no degradation
- [ ] Race state resets cleanly on retry (no stale wave positions or speed values)

## Constraints

- **Must not modify:** Existing Player.js movement logic, Camera.js hub behavior, or Rendering.js pipeline (extend, don't mutate)
- **Performance budget:** < 16ms per frame on mid-range mobile (wave geometry updates must be cheap)
- **Dependencies:** Requires `portfolio-k3u` (Panama City hub with canal dock) merged first
- **Browser/runtime:** ES modules, no new dependencies beyond Three.js and Rapier (already present). Touch events via existing nipple.js pattern or raw pointer events.
- **Asset budget:** CREBA logo is a texture loaded at runtime (PNG, < 100KB). All other visuals are procedural geometry with existing PALETTE colors.

## Interface Contract

The race is a self-contained module that the hub room activates via a single entry point:

```javascript
// Start the race from the hub
import { CayucoRace } from '../Minigames/CayucoRace/RaceController.js'

// In hub room interaction handler:
const race = new CayucoRace(game)
race.start()  // countdown -> racing -> results
race.on('exit', () => { /* return to hub */ })
```

### Events emitted by RaceController

| Event | Payload | When |
|-------|---------|------|
| `'countdown'` | `{ seconds: 3|2|1 }` | Each countdown tick |
| `'start'` | `{}` | Race begins |
| `'wave-result'` | `{ quality: 'perfect'|'good'|'bad', speedDelta }` | After each timing window resolves |
| `'finish'` | `{ time, medal: 'gold'|'silver'|'bronze'|null }` | Crossed finish line |
| `'exit'` | `{}` | Player chose Back to Hub |
| `'retry'` | `{}` | Player chose Retry |

### Race config (data layer)

```javascript
// data/race-config.js
export const RACE_CONFIG = {
  duration: 30,              // target seconds at optimal play
  courseLength: 200,         // world units
  paddleBaseSpeed: 6.5,     // units/s at steady rhythm
  perfectBoost: 1.4,        // multiplier on next segment
  badPenalty: 0.5,          // multiplier on next segment
  waveInterval: [4, 6],     // seconds between event waves (random in range)
  timingWindow: {
    perfect: 0.08,          // seconds tolerance (center +/-)
    good: 0.2,              // seconds tolerance
  },
  medals: {
    gold: 28,
    silver: 32,
    bronze: 38,
  },
  drift: {
    ambient: 0.3,           // lateral push per second from ambient waves
    event: 1.2,             // lateral push from missed event wave
  },
}
```

## Design Decisions

**Rhythm-game timing ring over in-world-only cues.** The 30-second race is too short
for players to learn purely by observation. An explicit timing indicator lowers the
learning curve while remaining satisfying to master. The ring is rendered as an HTML
overlay (not 3D geometry) so it stays crisp at any resolution and doesn't fight the
wave shader for draw calls. The overlay is positioned in screen-space relative to the
boat's projected position, so it tracks with the cayuco visually.

**Alternating left/right paddle as core input.** Mapping propulsion to alternating
taps (rather than a single button) creates natural rhythm and allows subtle steering
as a byproduct. On mobile, the two screen halves are large, forgiving touch targets.

**Linear course with no branching.** A 30-second sprint doesn't benefit from player
choice about direction. Fixed gentle curves keep the player centered while the camera
shows off wave visuals. Course variety comes from wave timing, not path complexity.

**Chase cam tuned low.** The camera sits closer to water level than the hub chase-cam.
This makes event waves visually imposing (they fill the top third of the screen as they
approach) and sells the "being on the boat" feeling without obscuring the timing ring.

**Separate WaveSystem from existing Water.js.** The hub ocean (Water.js) is a simple
sine deformation for aesthetics. The race needs gameplay-significant waves with spawn
timing, collision with the boat, and crest detection. Rather than overloading Water.js,
WaveSystem owns race wave behavior and renders its own geometry within the race scene.

**State machine in RaceController.** Clean transitions between idle/countdown/racing/results
prevent input leaking between states and make retry/exit trivial (reset state, re-enter
countdown).

## Test Plan

- **Unit (`tests/unit/race-config.test.js`):**
  - Medal thresholds are ordered (gold < silver < bronze)
  - Timing window values are positive and perfect < good
  - Wave interval range is valid (min > 0, max > min)
  - RACE_CONFIG exports all required keys

- **Unit (`tests/unit/timing-judge.test.js`):**
  - Input within perfect window returns 'perfect'
  - Input within good window returns 'good'
  - Input outside good window returns 'bad'
  - Edge cases: exactly on boundary, negative delta

- **Unit (`tests/unit/race-state.test.js`):**
  - State machine transitions: idle -> countdown -> racing -> results
  - Cannot paddle during countdown
  - Cannot skip countdown
  - Retry resets all state (position, speed, time, wave queue)

- **Integration (`tests/unit/race-course.test.js`):**
  - Course progress reaches 1.0 when position equals courseLength
  - Speed boost from perfect timing increases position delta
  - Bad timing reduces position delta
  - Finish event fires when progress >= 1.0

- **E2e (`tests/cayuco-race.spec.js`):**
  - Interacting with cayuco starts the race (countdown visible)
  - Completing the race shows results overlay with time and medal
  - Retry button restarts the race
  - Back to Hub returns player to hub position
  - Mobile: left/right tap halves register as paddle input

- **Visual/manual:**
  - Waves visually roll toward the camera, crests are white
  - Timing ring shrinks smoothly, color feedback on hit/miss
  - Camera is lower than hub, sways with water
  - Billboard is readable from player spawn distance
  - No frame drops on mobile during event waves

## Files to Create/Modify

- `sources/Game/Minigames/CayucoRace/RaceController.js` (new) — state machine, orchestrates all race subsystems, registered on Ticker
- `sources/Game/Minigames/CayucoRace/Boat.js` (new) — cayuco mesh, paddle animation, wave-riding position logic
- `sources/Game/Minigames/CayucoRace/WaveSystem.js` (new) — procedural wave geometry, event wave spawning, ambient drift calculation
- `sources/Game/Minigames/CayucoRace/TimingRing.js` (new) — HTML overlay rhythm indicator (shrinking ring + hit-zone)
- `sources/Game/Minigames/CayucoRace/RaceCourse.js` (new) — spline path, progress tracking, finish-line detection
- `sources/Game/Minigames/CayucoRace/RaceHUD.js` (new) — timer, progress bar, results overlay (HTML)
- `sources/Game/Minigames/CayucoRace/RaceCamera.js` (new) — chase-cam override with wave sway and lower angle
- `data/race-config.js` (new) — all tuning constants
- `sources/Game/World/Rooms/HubRoom.js` (modify) — add CREBA billboard and docked cayuco with interaction trigger
- `sources/Game/World/World.js` (modify) — wire up minigame entry from hub interaction
- `tests/unit/race-config.test.js` (new)
- `tests/unit/timing-judge.test.js` (new)
- `tests/unit/race-state.test.js` (new)
- `tests/unit/race-course.test.js` (new)
- `tests/cayuco-race.spec.js` (new) — Playwright e2e

## Out of Scope

- AI opponent boats (tracked: `portfolio-rz1`)
- AAA art pass / final visual polish (tracked: `portfolio-63c`)
- Narrative content unlock after race (tracked: `portfolio-6db`)
- Leaderboard / personal-best persistence (future)
- Sound effects and music (future)
- Multiple course variants or difficulty levels (future)
- Network multiplayer
