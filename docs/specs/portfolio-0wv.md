# Physics Overhaul Spec: portfolio-0wv

> **Status:** `spec:planned` (awaiting human Gate 1 approval)
> **Bead:** portfolio-0wv — Physics: correct collisions and grounded character
> **Priority:** P1

## Summary

Rebuild the physics feel of the island hub around the existing Rapier kinematic character controller — no engine swap, no new subsystem architecture. The balanced-pragmatic four-phase plan (~18 h), upgraded with precise collider/tuning numbers from a surgical analysis and two achievable ideas from a full-rewrite proposal: a lightweight movement state enum exposed for testing, and event-driven feel hooks (`player:land` / `player:jump`).

**Result:** A solidly grounded character, tight collisions with every prop, real edge-falls with respawn (no invisible walls), and Odyssey/Wind-Waker-grade movement feel.

## Requirements (from bead)

1. Character must be solidly on the ground (no floating/clipping)
2. Collisions with world geometry must feel tight and responsive
3. If the player runs off the edge of the map they should fall (no invisible walls at boundaries)
4. Should feel AAA-quality, inspired by Bruno Simon's portfolio

## Design Principles

1. **One source of truth per number.** Every tunable lives in one exported constant (`GRAVITY` in Physics.js, `TUNING` in Player.js). The duplicated `-15` gravity dies.
2. **Body translation = feet position.** The collider is offset upward locally so physics position and mesh origin agree exactly. No mesh fudge offsets anywhere.
3. **Velocity, not displacement.** Horizontal movement is an accelerated velocity moved toward a target; vertical is semi-implicit Euler with asymmetric gravity.
4. **Edges are real.** The ground collider footprint equals the visual floor exactly; walls are deleted; falling is handled by a kill plane + respawn, for the player AND props.
5. **Spectacle over realism for props.** Player "mass" 3 vs crate 0.5 (6:1) with low damping — pushes feel powerful (Bruno Simon's mass-ratio trick, scaled for walking).
6. **Friction 0 on vertical obstacles, 0.8 on walkable surfaces.** The KCC slides around trunks and never sticks; standing anywhere feels identical.
7. **Framerate independence via `1 - exp(-k*dt)` and clamped delta** — no fixed-timestep accumulator refactor (deliberate cut; clamp `delta = min(delta, 1/30)`).

## Constants & Configuration

| Constant | Value | Justification |
|---|---|---|
| `GRAVITY` (world) | 22 | Exported from Physics.js; snappy prop settling at ~1.2-unit character scale |
| `gravityUp` (player ascent) | 22 | Same as world — jump apex = v²/2g |
| `gravityDown` (player descent) | 38 | ~1.7x ascent — Odyssey asymmetric arc; kills floatiness |
| `apexHangMult` | 0.55 when \|vy\| < 1.5 | ~4 frames of hang time at apex (Wind Waker signature) |
| `terminalVelocity` | -25 | Falls read clearly; consistent kill-plane entry |
| `jumpSpeed` | 8.2 | Apex = 8.2^2/(2*22) ~ 1.53 u — clears 0.8-crate + 0.45-rock stacks |
| `jumpCutMultiplier` | 0.45 | One-shot on release edge (variable jump height) |
| `coyoteTime` | 0.12 s | 7-frame forgiveness |
| `jumpBuffer` | 0.12 s | Press early, still fires on landing |
| `groundStick` | -1.5 | Downward bias while grounded; keeps snap-to-ground engaged on slopes/steps |
| `speed` | 8 | Current top speed (validated by all three proposals) |
| `accel` / `decel` | 55 / 80 u/s^2 | 0-8 in ~0.15 s; stop in ~0.10 s. Decel > accel = crisp stops, never icy |
| `airControl` | 0.3 | Scales accel, not speed; no air decel with no input (momentum preserved) |
| `turnSpeed` | 12 rad/s | Exponential shortest-angle yaw ~690 deg/s — visible WW arcs, no snap |
| Capsule | `capsule(0.35, 0.25)`, local offset `(0, 0.6, 0)` | 1.2 u total; body translation = feet |
| KCC offset | 0.03 | ~2.5% of capsule scale; avoids wall jitter at speed 8 |
| Max slope climb / min slide | 50 deg / 55 deg | Standard, with 5 deg hysteresis band |
| Autostep | `(0.3, 0.12, false)` | 25% of height; `false` = crates are pushable, not walk-climbable |
| Snap-to-ground | 0.4 | Covers tan(50 deg)*8*(1/60) ~ 0.16 with margin |
| `setCharacterMass` | 3.0 | vs crate 0.5 = 6:1 push ratio |
| Ground collider | `cuboid(25, 0.5, 25)` at y=-0.5, friction 0.8, restitution 0 | Footprint = visual 50x50 floor exactly; 1.0-thick slab; top at y=0 |
| Crate | mass 0.5, friction 0.3, restitution 0.25, linDamp 1.2, angDamp 1.5 | Slides ~1 m and eases out (was syrupy at damping 3.0) |
| Tree trunk | fixed `cylinder(0.75, 0.3)`, friction 0 | Fatter than visual so ink outline never clips; slides, never sticks |
| Rock | fixed `ball(0.45)`, friction 0.8 | 0.4 clips the outline shader; friction matches ground |
| Center platform | fixed `cylinder(0.1, 4.15)` at y=0.1 | 0.2 tall - autostep walks up it |
| Bush slowdown | x0.55 within `r + 0.3`, distance check | No sensor needed; cheaper |
| `killPlaneY` | -10 (in `data/rooms.js`) | Shared by player respawn and prop reset |
| `playerSpawn` | `{ x: 0, y: 2, z: 5 }` (in `data/rooms.js`) | Field finally consumed |
| Squash gate / scale | impact > 6, `squash = min(impact/20, 0.35)` | No noise on 1-step drops; scales with fall height |
| Camera exp-lerp k | pos 4 (moving) / 2.5 (idle), look 6, dir 3 | Matches current 60 fps feel, framerate-independent |
| Camera occlusion pull | `toi * 0.9`, recover 2 u/s | Instant in, slow out — never clips, never pops |
| Delta clamp | `min(delta, 1/30)` | Tab-switch/hitch protection |

**Key contradiction resolutions:**
- Gravity 22/38 over surgical's 25/45 (two proposals converge; 45 down-gravity overshoots at this jump height)
- Speed 8 over 6.5 (majority + verified feel)
- Capsule foot-offset via collider `setTranslation` over mesh fudge — one representation, no fallback-mode duplication
- Character mass 3 over rewrite's 55 (ratio is what matters, not absolute kg)
- Distance-check bushes over sensors (cheaper, indistinguishable)
- Delta clamp over fixed-timestep accumulator (biggest cost for least visible gain)

## Architecture Changes

| File | Change | Rationale |
|---|---|---|
| `sources/Game/Physics.js` | Export `GRAVITY`; retune controller; trim ground to 50x1x50; **delete `createWall()`**; extend `castRay` with excludeCollider param | Single gravity source; edge-falls; camera occlusion |
| `sources/Game/Player.js` | New capsule + foot offset; `TUNING` block; velocity movement; jump state machine; turn damping; kill-plane respawn; state enum; squash; event emit; bush slowdown | The core of the overhaul |
| `sources/Game/World/World.js` | **Delete `buildBoundaryWalls()`**; add dynamic-prop sync loop + prop kill-plane reset | No invisible walls; fixes frozen-crate-mesh bug |
| `sources/Game/World/Rooms/HubRoom.js` | Trunk/platform colliders; rock retune; crate retune + spawn stash; export `{ dynamicProps, bushes }` | Tight world collisions |
| `sources/Game/World/PhysicsLetters.js` | Add kill-plane reset to existing sync loop | Letters can now fall off the edge |
| `sources/Game/Camera.js` | Occlusion raycast, exp lerps, fall framing | Support the new verticality |
| `data/rooms.js` | Add `playerSpawn.y: 2`, `killPlaneY: -10` | Data layer stays Three-free |
| **NEW** `sources/Game/World/DustPuff.js` (~60 loc) | Pooled landing VFX subscribing to `player:land` | Proves the event-hook surface |
| **Deleted** | `Physics.createWall()`, `World.buildBoundaryWalls()` | The requirement |

## Implementation Phases

### Phase 1: Foundation (Ground Truth) — ~4 hours

**Goal:** Fix the physical truth of the world — correct capsule, correct ground, correct colliders, no invisible walls, fall-and-respawn works.

**Physics.js:**
```js
export const GRAVITY = 22
this.world = new RAPIER.World({ x: 0, y: -GRAVITY, z: 0 })

buildGround() {
  const half = WORLD_LAYOUT.floorSize / 2  // 25
  const bodyDesc = RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)
  const colliderDesc = ColliderDesc.cuboid(half, 0.5, half)
    .setFriction(0.8).setRestitution(0)
}
// DELETE createWall()

this.characterController = this.world.createCharacterController(0.03)
this.characterController.setMaxSlopeClimbAngle(50 * Math.PI / 180)
this.characterController.setMinSlopeSlideAngle(55 * Math.PI / 180)
this.characterController.enableAutostep(0.3, 0.12, false)
this.characterController.enableSnapToGround(0.4)
this.characterController.setApplyImpulsesToDynamicBodies(true)
this.characterController.setCharacterMass(3.0)
this.characterController.setSlideEnabled(true)
```

**Player.js — foot-anchored capsule:**
```js
const colliderDesc = RAPIER.ColliderDesc.capsule(0.35, 0.25)
  .setTranslation(0, 0.6, 0)   // spans y 0.0-1.2 in body space; body = feet
  .setFriction(0).setRestitution(0)
```

Kill plane (after movement):
```js
if (newPos.y < WORLD_LAYOUT.killPlaneY) this.teleport(spawn.x, spawn.y, spawn.z)
```

`teleport()` must use `body.setTranslation` (NOT `setNextKinematicTranslation` — that would sweep a 12-unit move), set mesh position immediately, and zero all velocities and timers.

**World.js:** Delete `buildBoundaryWalls()`.

**HubRoom.js:** Add trunk colliders (fixed, `cylinder(0.75, 0.3)`, friction 0), platform (`cylinder(0.1, 4.15)` at y=0.1), retune rocks to `ball(0.45)`.

**data/rooms.js:** Add `playerSpawn: { x: 0, y: 2, z: 5 }`, `killPlaneY: -10`.

**Acceptance criteria:**
- Run off any edge, fall, respawn within ~1.5 s
- No invisible walls anywhere
- Capsule edge agrees with grass edge within 0.1 u
- Collides with all 8 trunks and slides at grazing angles
- Walks onto platform without jumping
- Feet visually touch ground
- `bun run verify` green

**Risk:** Collider Y-offset might break `computedGrounded()`/snap-to-ground. Fallback: centered capsule + mesh y-0.6 offset applied in `update`, `teleport`, and no-physics fallback.

---

### Phase 2: Movement Feel — ~5 hours

**Goal:** Make movement feel AAA — acceleration curves, asymmetric gravity, variable jump height, coyote time, jump buffering, smooth turning.

All in Player.js. `TUNING` block with all constants from the table.

```js
// Horizontal — velocity-based
targetVel = inputDir * TUNING.speed * bushSpeedMul
rate = (inputActive ? accel : decel) * (grounded ? 1 : airControl)
if (!grounded && !inputActive) rate = 0  // air momentum preserved
horizVel.moveTowards(targetVel, rate * delta)

// Timers (jump edge-detected)
coyoteTimer = grounded ? coyoteTime : coyoteTimer - delta
bufferTimer = jumpJustPressed ? jumpBuffer : bufferTimer - delta

// Jump + variable height
if (bufferTimer > 0 && coyoteTimer > 0) {
  verticalVelocity = jumpSpeed
  bufferTimer = 0; coyoteTimer = 0
  emit('player:jump')
}
if (jumpReleasedThisFrame && verticalVelocity > 0)
  verticalVelocity *= jumpCutMultiplier

// Asymmetric gravity
g = verticalVelocity > 0 ? gravityUp : gravityDown
if (abs(verticalVelocity) < 1.5) g = gravityUp * apexHangMult
verticalVelocity = max(verticalVelocity - g * delta, terminalVelocity)
if (grounded && verticalVelocity < 0) verticalVelocity = groundStick

// Rotation — shortest-angle exponential damping
targetAngle = atan2(direction.x, direction.z)
mesh.rotation.y = dampAngle(current, targetAngle, 1 - exp(-turnSpeed * delta))
```

Grounded upgrade: `grounded = controller.computedGrounded() || (verticalVelocity <= 0 && physics.castRay(feet, down, 0.15, playerCollider))` — kills flicker frames that break coyote.

**State enum** (`idle | run | jump | apex | fall | land`) derived each frame; exposed at `window.__game.debug.playerState`. Pure bookkeeping (~15 lines), enables e2e state-sequence assertions.

**Acceptance criteria:**
- Tap-jump ~half the height of held-jump
- Buffer and coyote each fire within 0.12 s windows
- Visible run arcs (no 180 deg mesh snap)
- Walking down platform/rock edges stays glued (no ballistic pop)
- Descent visibly faster than ascent
- Held jump key does not bunny-hop
- e2e ramp assertion: 0.5 s forward moves between 0.8*speed*t and speed*t

**Risk:** `groundStick` jitter on flat ground — apply only when `computedGrounded()` was false last frame if visible. Budget one 30-min play-tune loop.

---

### Phase 3: World Interactions — ~3 hours

**Goal:** Props react to the player satisfyingly — crate sync works, physics feel solid, bushes slow you down.

1. **Crate sync fix** (the actual bug — bodies settle, meshes frozen). `buildHubProps` returns `{ dynamicProps: [{ body, mesh }], bushes: [{ x, z, r }] }`. In `World.update()`:
```js
for (const { body, mesh } of this.dynamicProps) {
  const p = body.translation(), q = body.rotation()
  mesh.position.set(p.x, p.y, p.z)
  mesh.quaternion.set(q.x, q.y, q.z, q.w)
  if (p.y < WORLD_LAYOUT.killPlaneY) {
    body.setTranslation(mesh.userData.spawn, true)
    body.setLinvel({x:0,y:0,z:0}, true)
    body.setAngvel({x:0,y:0,z:0}, true)
  }
}
```

2. **Crate retune:** mass 0.5, friction 0.3, restitution 0.25, linDamp 1.2, angDamp 1.5. With characterMass 3 and autostep `includeDynamic: false`, walking pushes shove crates instead of climbing them.

3. **Bush slowdown** — distance check in Player before applying horizVel:
```js
let mul = 1
for (const b of world.bushes)
  if ((px-b.x)**2 + (pz-b.z)**2 < (b.r + 0.3)**2) { mul = 0.55; break }
```

4. **PhysicsLetters kill-plane reset** — same pattern in existing sync loop.

**Acceptance criteria:**
- Pushed crate mesh follows body 1:1, slides ~1 m, settles, sleeps
- Crate pushed off edge respawns at spawn
- Bushes slow to 55% inside, instant recovery outside
- Letters knocked off respawn
- No blob-shadow regressions

**Risk:** 6:1 ratio at speed 8 can launch crates — raise linDamp to 1.8 if they fly.

---

### Phase 4: Polish & Edge Cases — ~4 hours

**Goal:** Camera polish, landing juice, edge feel, dust VFX.

1. **Landing squash + events.** On `!wasGrounded && grounded` with `impactSpeed > 6`: `squash = min(impactSpeed/20, 0.35)`, emit `player:land { speed, position }`. Per frame: `squash = damp(squash, 0, 12, delta)`; `mesh.scale.set(1 + squash*0.6, 1 - squash, 1 + squash*0.6)`.

2. **DustPuff.js** — pool of 6 flat rings (`toonFlat('stone')` — PALETTE discipline), subscribes to `player:land`, scale 0.3-1.2 fade over 0.35 s.

3. **Camera occlusion** — ray from look-target toward desired position, excluding player collider; on hit, pull to `origin + dir * toi * 0.9`; recover outward at 2 u/s, pull in instantly.

4. **Camera framerate-independent lerps** (`1 - exp(-k*delta)`) + **fall framing**: when `verticalVelocity < -8`, increase position k toward 8 so player stays in frame to the kill plane.

5. **Edge lean** (~10 lines): grounded, idle, down-ray at `feet + facing*0.35` misses within 0.5 — tilt `rotation.x` toward 0.08 rad with 2 Hz wobble.

**Acceptance criteria:**
- Small drops: no squash. Tall falls: squash + dust puff, recovery < 0.3 s
- Camera never inside a trunk, no popping
- Player in frame during full edge-fall
- Idle edge-facing lean visible
- 60 fps on the mobile Playwright project

---

### Test updates (~2 hours across all phases)

**Unit (bun, no WASM):**
- `rooms.js` exports `killPlaneY < 0`, `playerSpawn.y > 0`, `floorSize === 50`
- Constants sanity: jump apex `8.2^2/44` within [1.3, 1.7]; `snapToGround (0.4) > tan(50 deg)*8/60`; capsule radius > 2x KCC offset

**E2e (Playwright, desktop + mobile):**
- Phase 1: script walk off edge, assert y drops below -5 then respawn at spawn
- Phase 2: ramp-distance assertion + state sequence `fall -> land -> idle` on spawn drop
- Phase 3: crate mesh y changes after world settles (sync proof)
- Phase 4: camera-to-player distance never < 0.5 through a trunk-occluded orbit

**Delete:** existing wall-blocking assertions (they'll fail once walls are removed).

**Fallback mode:** manual smoke that no-WASM mode still runs (kill plane and squash must not throw when `this.body` is null).

## Character Controller State Machine

| State | Condition | Behavior |
|---|---|---|
| `idle` | grounded, \|horizVel\| < 0.1 | decel to 0; camera settles (k 2.5) |
| `run` | grounded, input active | accel 55 toward target; yaw damping 12 rad/s; bush mul applies |
| `jump` | vy > 1.5 after jump fire | gravity 22; jump-cut eligible; mesh stretch optional |
| `apex` | \|vy\| < 1.5 airborne | gravity x0.55 (hang) |
| `fall` | vy < -1.5 | gravity 38, clamp -25; coyote runs only from `run` (walked off), not from `jump`; camera fall-framing at vy < -8 |
| `land` | grounded transition | squash if impact > 6; `player:land`; buffer honored for instant re-jump |

**Transitions:** `idle <-> run` (input); `run/idle -> jump` (buffer AND coyote); `jump -> apex -> fall` (vy thresholds); `fall -> land -> idle/run` (grounded); any -> respawn at `killPlaneY`.

## Collision Shape Catalog

| Prop | Shape | Body | Properties |
|---|---|---|---|
| Player | `capsule(0.35, 0.25)`, offset (0, 0.6, 0) | kinematic (KCC) | friction 0, restitution 0 |
| Ground | `cuboid(25, 0.5, 25)` at (0, -0.5, 0) | fixed | friction 0.8, restitution 0 |
| Tree x8 | `cylinder(0.75, 0.3)` at (x, 0.75, z) | fixed | friction 0 |
| Center platform | `cylinder(0.1, 4.15)` at (0, 0.1, 0) | fixed | friction 0.8 |
| Rock x8 | `ball(0.45)` | fixed | friction 0.8 |
| Crate x5 | `cuboid(0.4, 0.4, 0.4)` | dynamic | mass 0.5, fric 0.3, rest 0.25, linDamp 1.2, angDamp 1.5 |
| Physics letters | existing | dynamic | unchanged + kill-plane reset |
| Bush x8 | **none** (distance zone) | - | speed x0.55 within r + 0.3 |
| Boundary walls | **deleted** | - | - |

## Camera Improvements

- Occlusion raycast pull-in (excluding player collider, `toi * 0.9`, asymmetric recovery)
- Exponential framerate-independent lerps (pos k 4/2.5, look k 6, direction-lag k 3)
- Fall framing (k -> 8 when vy < -8)
- **Deliberately cut** from full rewrite: shape-cast volume, trauma shake, FOV speed-coupling (candidates for follow-up bead)

## Risks & Mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | Collider Y-offset breaks `computedGrounded()`/snap-to-ground | Test on flat ground first commit; fallback: centered capsule + mesh y-0.6 offset |
| 2 | Teleport swept as movement by KCC | Use `setTranslation`, never `setNextKinematicTranslation`; add e2e respawn-position assertion |
| 3 | Walls removed before prop kill-plane exists (Phase 1-3 gap) | Acceptable interim; props near edges rarely pushed off; Phase 3 closes it |
| 4 | Feel constants are taste-dependent | All in one `TUNING` object for hot-editing; budget 30-min play-tune loops in Phases 2 and 3 |
| 5 | Camera ray hits dynamic bodies causing pull-in pops | Lerp the pulled distance; filter occluders to fixed bodies only if still noisy |

## Estimated Effort

| Phase | Hours |
|---|---|
| Phase 1: Foundation | 4 |
| Phase 2: Movement feel | 5 |
| Phase 3: World interactions | 3 |
| Phase 4: Polish | 4 |
| Test updates | 2 |
| **Total** | **~18 h** |

Each phase is independently shippable. Dependencies: Phase 2 requires Phase 1, Phase 3 requires Phase 1, Phase 4 requires Phase 2.

---

## Phase 5: Heightfield Island Terrain — ~12 hours

> **Decision:** Human approved heightfield island (Gate 1 Q1). This phase replaces the flat `cuboid(25,0.5,25)` ground with a shaped island driven by one analytic height function feeding both the Rapier collider and the Three.js mesh.

### Summary

Replace the flat 50x50 slab with "Anchor Isle" — a Wind Waker-style island with a flat central plateau (hub content unchanged), rolling hills in a ring around it, sandy beach sloping to water, and one dramatic NW headland bluff. Single deterministic `terrainHeight(x, z)` function drives everything: physics collider, visual mesh, and prop Y-snapping. Player runs off the beach into the sea and falls to the kill plane — no invisible walls, no skirts.

### Island Profile

```
Cross-section along +x (no headland):

  summit 2.87 ╮
              │ headland (NW only)
    y=0 ──────┤─────────────── plateau (r < 10) ──────────────┤
              │                                                │
              │         ±0.4 rolling hills (r 10–16.5)        │
              │                                                ├── beach start r=16.5
              │                                                │    slope 5–15°
  waterline   │                                    ┄┄┄┄┄┄┄┄┄┄┤── r≈18.6, y=−0.45
  y=−0.45     │                                                │
              │                                   wading shelf │── r 18.6–22.5, y=−0.9
              │                                                │
              │                                     rim plunge ├── r 22.5–25
              │                                                │    drops to −12
  killPlane   │                                                │
  y=−10  ─────┴────────────────────────────────────────────────┘
```

**Headline numbers:**
- Plateau: flat (exactly y=0) inside r=10
- Hills band: r=10–16.5, amplitude ±0.4u, three sine octaves
- Beach: starts r=16.5, drops 0.9u over 5u (5–15 degrees)
- Waterline: r≈18.6 where terrain crosses y=−0.45
- Wading shelf: r=18.6–22.5, depth 0.35–0.45u (knee height)
- Rim plunge: r=22.5–25, drops from −0.9 to −12 (sea floor)
- Headland summit: y=2.87 at (−12.5, −12.5), approach slope 34 degrees, sea face 82 degrees
- Max walkable slope: 35.7 degrees (well under 50 degree climb limit)
- Kill plane: y=−10 (unchanged from Phase 1)

### Height Function

Lives in `data/terrain.js` (Three-free data layer, importable by both Physics.js and World.js):

```js
export const TERRAIN = {
  size: 50,
  res: 64,            // cells per side (65x65 samples)
  heightScale: 1,     // store world-unit heights directly
  plateauR: 10,
  hillsIn: 10, hillsInFull: 12.5, hillsOutStart: 14.5, hillsOut: 16.5,
  beachStart: 16.5, beachEnd: 21.5, beachDrop: 0.9,
  rimStart: 22.5, rimEnd: 25, seaFloorY: -12,
  waterY: -0.45,
  head: { x: -12.5, z: -12.5, R: 7, H: 3.0 },
}

const S = (a, b, x) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1)
  return t * t * (3 - 2 * t)
}

export function terrainHeight(x, z) {
  const r = Math.hypot(x, z)
  const T = TERRAIN

  // Beach ramp: plateau 0 → sand shelf −0.9
  const beach = -T.beachDrop * S(T.beachStart, T.beachEnd, r)

  // Rim plunge: shelf −0.9 → sea floor −12
  const rim = (T.seaFloorY + T.beachDrop) * S(T.rimStart, T.rimEnd, r)

  // Rolling hills, ring-banded, three octaves
  const d = Math.hypot(x - T.head.x, z - T.head.z)
  const band     = S(T.hillsIn, T.hillsInFull, r) * (1 - S(T.hillsOutStart, T.hillsOut, r))
  const corridor = S(2.5, 5, Math.abs(z))
  const headGate = S(7, 9.5, d)
  const hills = band * corridor * headGate * (
    0.30 * Math.sin(0.35 * x + 1.7) * Math.cos(0.31 * z - 0.6) +
    0.16 * Math.sin(0.71 * x - 2.1) * Math.cos(0.67 * z + 1.3) +
    0.07 * Math.sin(1.31 * x + 0.5) * Math.cos(1.23 * z))

  // Vantage headland: raised-cosine bump
  const bump = d < T.head.R
    ? T.head.H * (0.5 + 0.5 * Math.cos(Math.PI * d / T.head.R))
    : 0

  return beach + rim + hills + bump
}
```

**Design rationale:**
- `corridor` gate keeps |z| < 2.5 dead flat (letters run E–W along z=0)
- `headGate` prevents hill octaves from stacking on the headland flank (without it, max slope hit 42.7 degrees)
- Three non-integer-ratio frequencies (0.35 / 0.71 / 1.31) prevent visible tiling
- Smoothstep saturation handles square grid corners: at r >= 25 all returns −12

### Heightfield Grid + `sampleHeight`

Also in `data/terrain.js`:

```js
export function buildHeightGrid() {
  const { size, res } = TERRAIN
  const heights = new Float32Array((res + 1) * (res + 1))
  for (let col = 0; col <= res; col++) {
    for (let row = 0; row <= res; row++) {
      const x = (col / res - 0.5) * size
      const z = (row / res - 0.5) * size
      heights[col * (res + 1) + row] = terrainHeight(x, z)
    }
  }
  return heights
}

export function sampleHeight(heights, x, z) {
  const { size, res } = TERRAIN
  const fx = (x / size + 0.5) * res
  const fz = (z / size + 0.5) * res
  const cx = Math.min(Math.max(Math.floor(fx), 0), res - 1)
  const cz = Math.min(Math.max(Math.floor(fz), 0), res - 1)
  const u = fx - cx, v = fz - cz
  const H = (col, row) => heights[col * (res + 1) + row]
  const h00 = H(cx, cz), h10 = H(cx + 1, cz), h01 = H(cx, cz + 1), h11 = H(cx + 1, cz + 1)
  return (u + v <= 1)
    ? h00 + (h10 - h00) * u + (h01 - h00) * v
    : h11 + (h01 - h11) * (1 - u) + (h10 - h11) * (1 - v)
}
```

**Key facts (verified against Rapier 0.14):**
- `nrows`/`ncols` are CELL counts — `heights.length` must be `(n+1)^2`
- Layout is column-major: `heights[col * (nrows + 1) + row]`
- Columns map to X, rows to Z, values to Y
- Heightfield is centered on the body's translation
- `scale` = `{ x: 50, y: 1, z: 50 }` (full world dimensions; `scale.y = 1` since heights stored in world units)
- Triangle split matches Three.js PlaneGeometry's anti-diagonal — collider and mesh are triangle-for-triangle identical
- `HeightFieldFlags.FIX_INTERNAL_EDGES` fixes dynamic body edge-catch bumps (free, always pass it)
- Edge falling works out of the box — heightfield is a surface, not a volume; walking off the boundary means no support, gravity takes over

### File Changes

| File | Change |
|---|---|
| **NEW** `data/terrain.js` | `TERRAIN` constants, `terrainHeight(x,z)`, `buildHeightGrid()`, `sampleHeight(heights,x,z)` |
| `data/rooms.js` | Add `waterY: -0.45` (moved from hardcoded in Water.js); keep `killPlaneY: -10`, `playerSpawn` |
| `sources/Game/Physics.js` | `buildGround()` → `buildTerrain()`: import `buildHeightGrid` + `TERRAIN`, create `ColliderDesc.heightfield(64, 64, heights, {x:50, y:1, z:50}, RAPIER.HeightFieldFlags.FIX_INTERNAL_EDGES)` on a fixed body at origin. Export `this.heightGrid` for prop snapping. Delete the old cuboid ground. |
| `sources/Game/World/World.js` | Replace `PlaneGeometry(50,50)` floor with `PlaneGeometry(50, 50, 64, 64)`, `rotateX(-PI/2)`, vertex displacement from `terrainHeight`. Use `toNonIndexed()` + `computeVertexNormals()` for faceted toon look. Add vertex colors: grass (h > −0.15, normal.y > cos(22°)), grassDark (steep), sand (−0.15 to −1.2), oceanDeep (below −1.2). |
| `sources/Game/World/Rooms/HubRoom.js` | All prop placement: `y = sampleHeight(grid, x, z) + offset`. Redesign 3 tree positions onto headland shoulder; redesign 4 rock positions onto beach/slopes. Replace `Math.random()` in bush builder with deterministic hash. |
| `sources/Game/World/Water.js` | Use `TERRAIN.waterY` from data layer; extend plane to cover full 50x50 (currently might be smaller) |
| `sources/Game/Camera.js` | No additional changes needed (Phase 4 occlusion already handles terrain blocking) |

### Interaction with Phases 1–4

| Phase | Impact |
|---|---|
| Phase 1 | Ground collider changes from `cuboid(25,0.5,25)` to heightfield. KCC config stays identical (verified stable on heightfields). "Capsule edge agrees with grass edge" acceptance criterion becomes "walk off beach → fall into sea → respawn". |
| Phase 2 | `snapToGround(0.4)` already covers slope traversal at speed 8. `computedGrounded()` works correctly on heightfields (verified). Coyote time fires when walking off the beach rim (intended). |
| Phase 3 | Dynamic crates on the plateau are unaffected (y=0 there). Crates/letters pushed to the beach slide down the slope naturally (satisfying). Kill-plane reset in prop sync loop handles props that slide into the sea. Bush slowdown: add water-wading slowdown (feet-y < −0.15 → same x0.55 multiplier). |
| Phase 4 | Camera occlusion ray works against heightfield (it's just another collider). Headland provides natural occlusion test cases. Fall framing engages when running off the beach. |

### Toon Shading Strategy

- **Faceted geometry** (not smooth): `geo.toNonIndexed()` then `computeVertexNormals()` — flat per-triangle normals. Each facet snaps to one toon ramp band, giving a hand-painted low-poly look. Smooth normals would draw wobbly iso-lines across hills.
- **Vertex colors** by height + slope (one draw call, existing palette):
  - `h > -0.15, normal.y > cos(22°)` → `PALETTE.grass`
  - `h > -0.15, normal.y <= cos(22°)` → `PALETTE.grassDark` (slope darkening)
  - `-0.15 >= h > -1.2` → `PALETTE.sand`
  - `h <= -1.2` → `PALETTE.oceanDeep`
- Hard transitions at facet boundaries, no gradient — coherent with the banded toon ramp.
- Cliff face auto-shades via the slope rule.

### Water Behavior

- Water plane at y=−0.45 with existing wave animation (±0.25) making animated shoreline breathe across r≈18.3–19.2 for free.
- **Shallow wading** (r 18.6–22.5): water knee-height (0.35–0.45u on 1.2u character). Apply the bush slowdown multiplier (x0.55) when player feet-y < −0.15. No additional death mechanic (deferred to portfolio-ewu).
- **Deep water** (past r=22.5): terrain drops away, player falls through water to killPlaneY=−10, respawn fires. The fall is visually dramatic (player visibly sinks past the water surface).
- **For portfolio-ewu upgrade** (later): detect `feet-y < -2.5 && r > 22` for earlier splash/respawn.

### Performance Budget (benchmarked at 64x64)

| Metric | Value |
|---|---|
| Heights buffer | 16.5 KiB |
| Mesh (vertices + normals + vertex colors, non-indexed) | ~350 KiB (~40k triangles) |
| Collider build time | ~0.1 ms |
| Per-step + KCC cost | 0.39 ms (vs 0.34 ms for flat cuboid) |
| Visual frame cost delta | +0.2 ms draw (40k vs 2 tris) |

Well within the 60 fps mobile Playwright budget.

### Testing

**Unit (bun, pure JS — no WASM needed):**
- `terrainHeight(0, 0) === 0` (plateau center)
- `terrainHeight(x, z) === 0` for all |x|, |z| < 10 (plateau guarantee)
- `terrainHeight(25, 0) === TERRAIN.seaFloorY` (rim saturation)
- `terrainHeight(-12.5, -12.5) === TERRAIN.head.H` (summit)
- Max slope over full grid < 50 degrees (finite-difference scan at 0.1u)
- `sampleHeight` agrees with `terrainHeight` at grid sample points within 1e-5
- `buildHeightGrid().length === (65 * 65)`
- No `Math.random()` calls in `data/terrain.js`

**E2e (Playwright):**
- Player spawn at (0, 2, 5) lands on terrain and is grounded within 1s
- Walk toward +x (east): player goes from grass to beach to water to falling to respawn
- Walk up headland (NW): player reaches y > 2 without jumping
- Walk along headland sea face: player slides down (slope > 55 degrees) into the water
- Props: all tree trunk colliders are at expected heights (mesh position matches sampleHeight)
- Camera: no clip through headland when orbiting from SE

### Risks

| # | Risk | Mitigation |
|---|---|---|
| 1 | KCC ghost collisions at internal triangle edges on steep headland | `FIX_INTERNAL_EDGES` flag + KCC offset 0.03 + capsule roundness mask it (verified in research) |
| 2 | Props floating on slopes (visual gap between mesh and terrain) | Use triangle-exact `sampleHeight`, not bilinear; sink rocks 0.15 into surface |
| 3 | Toon outline artifacts on displaced faceted geometry | Faceted normals make outlines cleaner, not worse (silhouette is sharp polygonal edge) |
| 4 | 40k tri mesh too heavy for low-end mobile | Still 10x below THREE.js draw-call bottleneck; material is unlit vertex-color (cheapest possible) |
| 5 | Slope stacking from height function composition | Gates (`headGate`, `corridor`) verified to cap at 35.7 degrees |
| 6 | Beach Math.random() in bush builder breaks determinism | Replace with hash of `(x,z)` coordinates |

### Effort Estimate

| Work item | Hours |
|---|---|
| `data/terrain.js` module + unit tests | 2 |
| Physics.js `buildTerrain()` integration | 2 |
| World.js visual mesh + vertex colors + faceting | 3 |
| HubRoom.js prop re-placement + determinism fix | 2 |
| Water.js adjustments + wading slowdown | 1 |
| E2e test updates | 2 |
| **Total** | **~12 h** |

**Dependencies:** Requires Phase 1 (ground collider structure). Independent of Phases 2–4 (they work on any ground shape). Can be implemented as Phase 5 after Phases 1–4, or in parallel with Phases 2–4 after Phase 1 ships.

### Open Questions (Phase 5 specific)

1. **Faceted vs smooth normals?** Spec recommends faceted (matches WW low-poly feel, avoids toon banding artifacts on smooth surfaces). Smooth is also viable if you prefer a softer look.
2. **Water = wading slowdown only, or add splash particles now?** Plan defers splash VFX to portfolio-ewu. If you want them in Phase 5, add ~2h.
3. **Headland cliff face: grass-dark or exposed stone?** The slope-darkening rule paints it `grassDark` automatically. Could add a `stone` palette color for `h > 0.3 && normal.y < 0.5` (+30 min).

---

## Updated Effort Summary (with Phase 5)

| Phase | Hours |
|---|---|
| Phase 1: Foundation | 4 |
| Phase 2: Movement feel | 5 |
| Phase 3: World interactions | 3 |
| Phase 4: Polish | 4 |
| **Phase 5: Heightfield island** | **12** |
| Test updates | 2 |
| **Total** | **~30 h** |

---

## Remaining Open Questions for Human Review (Gate 1)

1. ~~**Island terrain**~~ — **DECIDED: heightfield island (Phase 5)**

2. **Speed 8 vs 6.5:** Plan keeps 8; surgical argued 6.5 reads more Wind Waker on a 50-unit island. Confirm during the Phase 2 tune loop?

3. **Water splash respawn:** Kill plane teleports instantly at y=-10. Want a 0.6 s splash-fade respawn instead? (+2 h, needs a splash particle — could fold into Phase 5 or defer to portfolio-ewu.)

4. **Phase granularity for beads:** One bead per phase (5 worktrees) or one bead with 5 commits? Recommendation: one bead per phase, Phases 1+2 reviewed together, Phase 5 can run in parallel with 2–4.

5. **Fixed-timestep accumulator:** Deliberately cut in favor of delta clamping. Acceptable, or is 120 Hz-display smoothness a requirement? (Accumulator + interpolation ~ +8 h.)

6. **Deferred polish:** Skid state, edge-wobble animation, breakable pots, beach ball, camera trauma shake — park as `spec:idea` beads?

7. **Phase 5: Faceted vs smooth terrain normals?** (Recommend faceted for WW feel.)

8. **Phase 5: Headland cliff material — grassDark or stone palette color?**
