# portfolio-12v — Toon Sunlight & Shadows (Wind Waker Cel-Shaded Lighting)

**Status:** spec:planned
**Priority:** P3
**Type:** feature

## Summary

Add expressive cartoon sunlight and cast shadows to the island scene, plus a richer
sky gradient and reworked clouds. Inspired by Bruno Simon's dramatic directional
light but pushed toward the Wind Waker look: warm golden key light with hard shadow
edges, painted sky, and flat stylized clouds.

## Goals

- Late-morning golden-hour mood (classic Outset Island feel)
- Hard-edge stencil cast shadows from sun (crisp, no blur)
- Blob contact shadows under dynamic objects for grounding
- Four-stop painted sky gradient (horizon cream → green transition → mid blue → deep zenith)
- Wind Waker–style flat layered clouds with horizon band
- Everything works with existing ToonMaterials, OutlineEffect, and Palette system

## Non-Goals

- No sun disc geometry in the sky (future bead)
- No horizon fog / atmospheric haze (future bead)
- No dynamic time-of-day cycle
- No custom GLSL shader patching (stretch goal noted but not in scope)

## Design

### 1. Sunlight & Shadow System

#### Sunlight retuning (ToonLights.js)

- Reposition sun to late-morning angle: approximately `(10, 12, 6)` — ~50° elevation,
  slightly south-east so shadows fall visibly without being overly long.
- Change sun color from `PALETTE.skyHorizon` to new `PALETTE.sunlight` (`0xfff0a0`),
  warm gold for golden-hour feel.
- Increase sun intensity from 1.2 to 1.6.
- Bump hemisphere light intensity from 0.5 to 0.6, keeping shadow areas warm/colorful.
- Tint rim light cooler (subtle blue, `0x99ccff`) at 0.3 intensity for warm/cool contrast.

#### Hard cast shadows (Rendering.js)

- Switch `shadowMap.type` from `PCFSoftShadowMap` to `THREE.BasicShadowMap`.
  This gives crisp unfiltered stencil edges on all cast shadows.
- Raise shadow map resolution from 2048 to 4096 on the sun to reduce aliasing.
- Tighten shadow camera frustum from ±30 to ±25 (floor is 50 units wide, so ±25
  covers the full world with no clipping), improving shadow texel density.
- Add `shadow.bias = -0.001` to prevent shadow acne on flat surfaces.

#### Blob shadows (new World/BlobShadow.js)

- Flat circle mesh using dark translucent `MeshBasicMaterial` (opacity ~0.3, color
  from `PALETTE.black`).
- Placed under the player and dynamic crates.
- Scales down and fades out as the parent object rises off the ground.
- Updated each frame in the World tick (order 5, alongside other world updates).
- Does not interact with the physics system.

### 2. Sky Gradient & Clouds

#### Richer sky gradient (SkyDome.js)

Extend vertex-color gradient from 2 stops to 4 stops:

| Normalized Y | Color | Hex | Purpose |
|---|---|---|---|
| 0.0 (horizon) | Warm cream | `0xfff4d6` | Hot horizon glow |
| 0.25 | Pale gold-green | `0xd4eeaa` | WW warm-to-cool transition band |
| 0.6 | Soft blue | `0x7eccf4` | Mid-sky |
| 1.0 (zenith) | Deep blue | `0x4aa3df` | Top of dome |

Implemented by multi-stop lerp in the existing per-vertex color loop (just add
conditional segments by Y position).

#### Clouds rework (Clouds.js)

Replace current spherical puff clusters with Wind Waker flat-layered clouds:

- **Shape**: sphere geometry scaled to `(1.0, 0.3, 0.8)` — flat pancake profile with
  rounded top and flat bottom. Group 3–5 overlapping pancakes per cloud.
- **Material**: `MeshBasicMaterial` white (unlit, no shadow receive). Pops cleanly
  against the sky gradient.
- **Drift**: gentle horizontal sinusoidal motion (existing logic retuned — slower
  amplitude for lazy morning feel).
- **Horizon band**: a second ring of 8–10 larger, flatter clouds at y ≈ 10–12,
  radius ≈ 50–60. Static or very slowly drifting. Forms WW's signature puffy
  horizon strip.
- **Outlines**: OutlineEffect applies ink outlines automatically (no extra config).

### 3. Palette Additions

New keys added to `Rendering/Palette.js`:

```js
sunlight: 0xfff0a0,     // golden-hour key light color
skyMid1: 0xd4eeaa,      // warm-to-cool transition band
skyMid2: 0x7eccf4,      // mid-sky blue
skyZenith: 0x4aa3df,    // deep zenith blue
```

Existing `skyHorizon` (`0xfff4d6`) remains as the horizon stop.

## Files Changed

| File | Change |
|---|---|
| `sources/Game/Rendering/Palette.js` | Add 4 new color keys |
| `sources/Game/Rendering/ToonLights.js` | Retune sun position, color, intensity; adjust hemisphere and rim |
| `sources/Game/Rendering.js` | Switch shadow map type to BasicShadowMap, raise resolution |
| `sources/Game/Rendering/SkyDome.js` | 4-stop vertex gradient |
| `sources/Game/Rendering/Clouds.js` | Flat WW cloud shapes, horizon band ring |
| `sources/Game/World/BlobShadow.js` | New file — blob shadow helper |
| `sources/Game/World/World.js` | Instantiate BlobShadow for player and crates |

## Acceptance Criteria

- [ ] Sun casts hard-edge shadows on the floor and props (no soft blur)
- [ ] Player and crates have visible blob contact shadows that scale with height
- [ ] Sky gradient shows four distinct color bands blending smoothly
- [ ] Overhead clouds are flat/layered (WW pancake shape), not round spheres
- [ ] Horizon cloud band visible at dome edge
- [ ] All colors use PALETTE keys (no hardcoded hex in material/light code)
- [ ] Existing OutlineEffect still works on all meshes
- [ ] No performance regression on desktop or mobile Playwright projects
- [ ] Unit tests still pass, e2e smoke test still passes

## Testing Strategy

- Visual: run dev server, confirm shadow crispness and sky gradient by eye
- Unit: existing content-map and room tests unaffected (no data changes)
- E2e: smoke spec confirms game loads, player moves — rendering changes are
  purely visual and don't affect game state assertions
- Manual mobile check: confirm shadow map resolution doesn't tank FPS on
  mobile viewport (Playwright mobile project)
