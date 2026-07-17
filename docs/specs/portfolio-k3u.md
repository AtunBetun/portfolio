# Feature: Panama City Hub World

> Bead: `portfolio-k3u`
> Status: spec:planned
> Priority: P2

## Vision

Walking through this world feels like stepping into a Miyazaki film set in colonial Panama: warm golden-hour light falls through narrow streets, bougainvillea cascades from iron balconies, and the Panama Canal glints at the edge of every sightline. The art quality targets Bruno Simon's level of craft — every prop intentional, every material polished, nothing scrappy.

## Context

The current hub is a 50x50 flat green plane with generic trees, rocks, and crates. This redesign transforms it into a stylized miniature Panama City featuring the Panama Canal (Colón end) as the visual spine, Casco Viejo as the immersive hero district, and a career-row waterfront. The canal dock becomes the launching point for the future cayuco race minigame (bead `portfolio-als`).

---

## Art Direction Bible

### Color Palette Additions

| Key                  | Hex      | Category                                |
| -------------------- | -------- | --------------------------------------- |
| `cascoYellow`        | 0xf2c94c | Facade — warm Panamanian gold           |
| `cascoTerracotta`    | 0xd4704a | Facade — clay orange-red                |
| `cascoWhite`         | 0xfaf3e8 | Facade — trim, pilasters                |
| `cascoBlue`          | 0x5b9bd5 | Facade — ocean-inspired                 |
| `cascoCream`         | 0xf5e6c8 | Facade — bleached colonial              |
| `cascoMint`          | 0x8ecfb0 | Facade — rare accent (2 buildings only) |
| `cascoIron`          | 0x4a4a4a | Props — railings, lampposts             |
| `cascoCobble`        | 0x9e8e78 | Ground — street surface                 |
| `cascoCobbleDark`    | 0x7a6b58 | Ground — mortar/variation               |
| `cascoRoof`          | 0xb85c38 | Roof — terracotta tiles                 |
| `cascoRoofDark`      | 0x8a3f22 | Roof — tile shadow                      |
| `bougainvillea`      | 0xd4367b | Vegetation — magenta flower             |
| `bougainvilleaLight` | 0xf06292 | Vegetation — light pink variant         |
| `palmTrunk`          | 0x8b6914 | Vegetation — royal palm trunk           |
| `palmFrond`          | 0x3d8b37 | Vegetation — palm leaf                  |
| `ceibaGreen`         | 0x2d6b2d | Vegetation — ceiba canopy               |
| `canalTeal`          | 0x15a5b5 | Water — canal surface                   |
| `canalDeep`          | 0x0d7a8a | Water — canal depth                     |
| `foamWhite`          | 0xeef8ff | Water — foam edges                      |
| `rimWarm`            | 0xfff0d0 | Lighting — rim highlight                |
| `shadowCool`         | 0x5a6e9e | Lighting — shadow tint                  |
| `fogWarm`            | 0xffe8c8 | Atmosphere — near fog                   |
| `fogCool`            | 0xc8d8f0 | Atmosphere — far fog                    |
| `inkBlue`            | 0x1a2030 | Outline — colored ink                   |

### Material System

**Toon shading upgrade:** Extend `MeshToonMaterial` via `onBeforeCompile`:

- 4-step gradient ramp `[64, 128, 190, 255]` (shadow, dark-mid, light-mid, lit)
- Colored shadows via `shadowTint` uniform: shadows drift toward cool blue-purple instead of just darkening
- Sun-keyed rim light (fresnel, gated by `dot(normal, sunDir) > 0.3`, hard-stepped at 0.5-0.6 threshold)
- Stepped specular for water, wet cobblestone, and iron only (threshold 0.98 — tiny crisp dot)

**Outline rules:**

- Keep `OutlineEffect` (inverted hull). Color-match outlines: darkened + hue-shifted toward blue (never pure black).
- Thickness tiers: characters/hero interactables `0.005-0.007`, architecture `0.003`, foliage `0.0015` or disabled
- `toon()` factory extended to accept `outline: { thickness, color, alpha }` option

**Facade rule:** Each building gets one desaturated pastel body (value 75-85%, saturation 25-40%) + white trim + ONE saturated accent (door/shutters). Adjacent buildings differ by 40+ degrees of hue.

### Lighting

```
Sun: DirectionalLight 0xffe0b0, intensity 2.2, position (-40, 25, 30) — 25deg golden hour
Fill: DirectionalLight 0x8fa8d8, intensity 0.5, position (30, 15, -25) — no shadow
Hemisphere: sky 0xfff2dd / ground 0x6b7fae, intensity 0.45
Point lights: max 4 active (string light clusters, cafe interiors), distance 8, decay 2
Shadow map: 2048x2048, PCFSoftShadow, bias -0.0005, normalBias 0.02
```

### Atmosphere

- **Fog:** `FogExp2` density 0.008, warm near (`fogWarm`) transitioning to cool far (`fogCool`) via patched `fog_fragment` shader chunk
- **Tone mapping:** ACES at exposure 1.05 (inside `OutputPass`, not renderer)
- **Bloom:** `UnrealBloomPass` at half-res, threshold 1.0, strength 0.35 — only emissives >1.0 bloom (string lights, screens)
- **Color grade:** Custom `ShaderPass` — warm push, lifted blacks, subtle vignette
- **Paper grain:** 3-5% opacity screen-space noise overlay (unifies flat fills, removes "WebGL demo" feel)
- **AA:** SMAA (preserves hard toon band edges better than FXAA)

### The Quality Gap (indie vs AAA)

1. Colored shadows and colored outlines (not black/gray)
2. Value control: 90% of frame within 35-85% luminance range
3. Silhouette discipline: chunky exaggerated forms, detail painted not modeled
4. One unified light logic: everything obeys the same sun
5. Aerial perspective: tinted fog + outline fade with distance
6. Motion in stillness: laundry, bougainvillea sway, water scroll, cloud drift
7. Grain/grade unification pass

---

## World Layout

### Coordinate System

Ground plane is X/Z, Y is up. World spans **x: [-60, +60], z: [-40, +40]** (120x80 units). +Z = south (open ocean). Water level y=0. Main ground datum y=+2. Player spawn at Plaza Central fountain.

### Master Layout

```
        NORTH (z = -40): jungle ridge + Lock Gate A
  ┌──────────────────────────────────────────────────────────┐
  │ hills/trees   ║LOCK║   hills/trees                       │ z=-40
  │               ║ A  ║                                     │
  │  CASCO VIEJO  ║    ║      back streets / gardens         │ z=-30
  │  (dense grid) ║ C  ║                                     │
  │   x:-58..-25  ║ A  ║   PLAZA CENTRAL (spawn)             │ z=-12
  │   cathedral   ║ N  ║   x:0..24, z:-12..+12               │
  │   tower ▲     ║ A  ║   fountain @ (12, 0)                │  z=0
  │      ══BRIDGE══╬════╣  ← arch @ z=-2, apex y=+7          │
  │   mirador     ║ L  ║                                     │ z=+12
  │   steps ↓     ║    ║   avenue ↓ to Malecón               │
  │  THE DOCK     ║LOCK║  CAREER ROW (3 bldgs face ocean)    │ z=+22
  │  cayuco @     ║ B  ║  bldgs @ x=8, 26, 44 on z=+26       │
  │  (-26,+30)    ╚════╝  MALECÓN esplanade z:+30..+36       │ z=+34
  │ ~~~~~ canal mouth ~~~~~ seawall, y=+2 → water y=0 ~~~~~~ │
  └──────────────────────────────────────────────────────────┘
        SOUTH (z = +40): open ocean
```

### District Specs

| District                 | Bounds                 | Ground y | Key Landmarks                                                      |
| ------------------------ | ---------------------- | -------- | ------------------------------------------------------------------ |
| **Plaza Central**        | x:0..+24, z:-12..+12   | +2.5     | Fountain at (12,0), spawn at (12,+4)                               |
| **Career Row / Malecón** | x:-4..+56, z:+22..+36  | +2       | 3 buildings at (8,26,44 on z=+26), lighthouse at (52,+33)          |
| **The Canal**            | x:-21..-9, z:-40..+38  | water=0  | Lock A at z=-32, Lock B at z=+18, 12 wide                          |
| **The Bridge**           | x:-23..-7, z=-2        | apex +7  | Pylons reach y=+14, full orientation platform                      |
| **Casco Viejo**          | x:-58..-25, z:-30..+15 | +2 to +4 | Cathedral at (-42,-20), Plazuela at (-42,-8), Mirador at (-54,+12) |
| **The Dock**             | x:-30..-6, z:+22..+36  | +1.5     | Cayuco at (-26,+30), pier to (-24,+37)                             |

### Navigation Loop (~2 min at run speed)

1. **Spawn** (12,+4) facing south → ocean glitter + career buildings pull south
2. **Career Row** → walk Malecón past 3 buildings, lighthouse rewards east end
3. **Waterfront west** → canal mouth visible, cayuco beckons, or bridge arch upstream
4. **Bridge apex** → whole map legible, cathedral tower beckons west
5. **Casco Viejo** → dense grid, corner rewards, terraces climbing
6. **Mirador → staircase → Dock** → cayuco, race sign, canal vista
7. **Footbridge → Malecón → avenue → Plaza** → loop closed

### Landmark Hierarchy

| Tier | Landmark             | Height        | Rule                                  |
| ---- | -------------------- | ------------- | ------------------------------------- |
| 1    | Bridge pylons        | 14            | Visible from everywhere — the compass |
| 1    | Cathedral bell tower | 18+ (on y=+4) | Visible everywhere west — marks WEST  |
| 2    | Lighthouse           | 14            | Malecón, plaza, bridge — marks EAST   |
| 2    | Fountain jet         | 4 + audio     | Plaza + bridge — marks HOME           |
| 3    | Lock gates A/B       | 5             | Canal sightline ends — marks N/S      |
| 3    | Cayuco + pier        | low           | Bridge and mirador — marks RACE       |

Rule: from any walkable point, at least one Tier-1 landmark and the canal or ocean is visible.

### Elevation Map

| Location                                   | y            |
| ------------------------------------------ | ------------ |
| Ocean + canal south of Lock B              | -0.5 to 0    |
| Dock plaza & pier                          | +1.2 to +1.5 |
| Main datum (Malecón, streets, canal banks) | +2           |
| Plaza Central podium                       | +2.5         |
| Casco Viejo upper terraces                 | +3 to +4     |
| Mirador                                    | +4.5         |
| Bridge apex                                | +7           |

---

## District: Plaza Central

Spawn point and orientation hub. 24x24 units at y=+2.5 (half-step above surroundings).

- **Fountain** at (12,0): radius 3, water jet 4 tall, octagonal stone basin
- **Spawn** at (12,+4) facing south — opening shot shows: fountain foreground, Career Row mid-ground, ocean horizon, canal + bridge in left third
- **4 exits:** West to Bridge, South avenue to Career Row (8 wide, slopes 0.5), North garden lane, East ocean overlook
- **Arcaded 2-story buildings** enclose north and east edges (hide map boundary)
- **Props:** benches, signposts, 2 palm trees, potted plants at arcades

## District: Career Row & Malecón

Three career buildings facing the ocean, connected by a 60x6 waterfront esplanade.

- **Buildings:** 10x10 footprint each, 2.5 stories (~9 tall), at (8,+26), (26,+26), (44,+26)
- Each building facade matches `CAREER_CONTENT[key].color`: P&G blue, Blackstone teal, Amazon orange
- Signboard, door/awning, interaction sensor zone (triggers UI panel with role/achievements)
- **Malecón:** palm trees every 8 units, benches between buildings, seawall balustrade at z=+36
- **Lighthouse** at (52,+33): 14 tall, eastern landmark, graceful "end of map" reward
- Dead-ending west: canal mouth, visible dock and cayuco

## District: The Canal

The visual spine — 12-wide water channel from z=-40 to z=+38.

- Water at y=0, banks at y=+2 with low stone copings
- **Lock Gate A** (z=-32): twin miter gates, lock-keeper's hut, canal vanishes into misty jungle
- **Lock Gate B** (z=+18): gates half-open, 0.5 waterfall step, race start gate
- Towpaths (2 wide) on both banks, ladders every 20 units
- Between locks: dead-calm water (good reflections)
- **Water shader:** depth-based color bands, foam edge detection, fresnel sky reflection, sparkles, dual-sine vertex animation

## District: The Bridge

Orientation platform and canal crossing at z=-2.

- Deck spans x:-23 to -7 (16 long, 5 wide), ramped arch from y=+2 to apex y=+7
- Two suspension pylons rise to y=+14, painted in `accent` (Bridge-of-the-Americas silhouette)
- From apex: fountain (E), all career buildings + lighthouse (SE), cathedral tower (W), lock gates (N/S), cayuco (SW)
- Clearance under deck: 7 units (cayuco passes beneath during future race)

## District: The Dock

Canal exit and cayuco race launch point.

- Ground y=+1.5 (lowest walkable — you descend to water)
- **Staircase** from Mirador: 6 steps of 0.5 each
- **Pier:** wooden, 3 wide, from (-24,+30) to (-24,+37), deck y=+1.2 on posts over water
- **Cayuco** at (-26,+30): traditional canoe, bobbing animation, rope, paddle
- **Race hook:** `raceStartZone` sensor collider, chalkboard sign "CARRERA — PROXIMAMENTE"
- Clutter: crab pots, nets, fish stall, stacked cargo
- **Footbridge** at z=+33 closes the loop back to Malecón without backtracking

---

## District: Casco Viejo (Hero Area)

The crown jewel. A AAA-quality immersive colonial quarter that rewards every turn and makes you want to stay.

### Street Grid

3 N-S lanes x 3 E-W lanes creating 9 intersections and 12+ street segments:

| Lane          | x   | Character                                          |
| ------------- | --- | -------------------------------------------------- |
| Calle Oeste   | -52 | Residential, highest elevation, intimate           |
| Calle Central | -42 | Main boulevard, commercial, cathedral street       |
| Calle Este    | -32 | Waterfront cafes, lowest elevation, evening energy |

| Lane        | z   | Character                      |
| ----------- | --- | ------------------------------ |
| Calle Sur   | -22 | Cathedral formal approach      |
| Calle Media | -8  | Plazuela opening               |
| Calle Norte | +8  | Gateway arch, leads to Mirador |

Streets are 3-4 units wide. Buildings 2-3 stories (6-9 units tall), shoulder-to-shoulder with balconies overhanging 1 unit.

### Building Catalog (10 Archetypes)

1. **The Colonial Gentleman** — 3-story, symmetrical, iron balconies both floors, `cascoYellow` + white pilasters (6w x 7d x 9h)
2. **The Weathered Abuela** — 3-story, asymmetrical sag, chipped plaster revealing brick, shutters askew (5w x 6d x 8.8h)
3. **The Restored Jewel** — 2-story, sharp edges, rooftop terrace with railing, `cascoBlue`/`cascoMint` (7w x 7d x 6.5h)
4. **The Shopfront** — 2-story, 60% open ground floor with awning, chalkboard sign (5w x 6d x 6h)
5. **The Narrow Tower** — 3-story, only 4 units wide, vertical rhythm accent, Juliet balconies (4w x 6d x 9h)
6. **The Corner Palace** — 3-story, wraps corner with curved balcony, cupola, ornate ironwork (8w x 8d x 9h)
7. **The Courtyard House** — 2-story, iron gate reveals interior courtyard with palm tree (7w x 8d x 6h)
8. **The Balcony Cascade** — 3-story, each floor's balcony protrudes farther creating "leaning forward" silhouette (6w x 6d x 9h)
9. **The Church Annex** — 1.5-story, heavy stone, oculus window, attached to cathedral (8w x 8d x 5h)
10. **The Ruin Fragment** — 1-2 walls standing, open to sky, vegetation reclaiming (5w x 5d x 7h)

### Facade Color Distribution

- `cascoYellow`: 35% (dominant warmth)
- `cascoCream`: 20% (supporting neutral)
- `cascoTerracotta`: 20% (warm accent)
- `cascoBlue`: 10% (cool relief)
- `cascoWhite`: 10% (clean punctuation)
- `cascoMint`: 5% (rare — 2 buildings only)

Rule: NEVER same color adjacent. Pattern: warm-cool-neutral or warm-neutral-cool-warm.

### The Cathedral — "Iglesia de San Alberto"

- **Position:** (-42, -20), footprint 10w x 14d, nave runs N-S, entrance facing south
- **Bell tower:** NW corner, 4x4 base, 16 units tall (y=+20 peak). Square shaft → belfry with open arches on all 4 faces (2 golden bells visible) → octagonal cupola → iron cross finial
- **Facade:** Massive arched wooden door (3 tall, 2 wide), rose window above (flat colored segments), triangular pediment with cross
- **Side walls:** Buttresses every 4 units creating rhythmic shadows, lancet windows
- **Cathedral Plaza:** 10x8 south of entrance, mosaic floor, octagonal fountain, 4 orange trees, iron fence perimeter
- The tower is visible from EVERY street in the district

### The Plazuela — "Plaza de las Flores"

- **Position:** (-42, -8), 12w x 10d, y=+3 (2 stone steps up)
- **Gazebo (Kiosko):** Hexagonal, 3 across, 6 iron columns with vine relief, peaked roof with iron rooster weathervane
- **Ceiba tree:** at (-46, -6), trunk 1.5 diameter, canopy 6 diameter at height 8. Rope swing. Carved initials "A+P"
- **Surrounding:** Cafe (north, tables extending into plaza), residential bougainvillea wall (south), art shop (east), clock-tower building (west)
- Butterflies concentrated here (5-6 at any time), parrot on gazebo roof

### The Mirador

- **Position:** (-54, +12), platform 6x5, y=+4.5
- Semicircular stone balustrade, brass telescope, bench facing ocean
- Full golden-hour light (no shade), Panamanian flag on flagpole
- View: ocean/canal below, entire district rooftops behind, distant island silhouettes

### Vegetation Strategy

| Type          | Count | Placement Rule                                                                   |
| ------------- | ----- | -------------------------------------------------------------------------------- |
| Bougainvillea | 12-15 | Every 3rd building, cascades from 2nd+ floor, 70% magenta / 20% pink / 10% white |
| Royal palms   | 8     | Major intersections and Mirador                                                  |
| Coconut palms | 4     | Calle Este waterfront only, leaning                                              |
| Ceiba         | 1     | Plazuela — THE tree                                                              |
| Orange trees  | 4     | Cathedral plaza corners                                                          |
| Ficus         | 2     | Calle Central segments                                                           |
| Potted plants | 20+   | Variety: agave, ferns, succulents, birds-of-paradise, pothos                     |

### Atmospheric Life

**String lights:** 8 strands across the district. Only between buildings <4 units apart. Catenary sag 0.3 units. Warm-white emissive (bloom at >1.0 intensity). Never in wide spaces.

**Animated elements:**

- Laundry (3 instances): white sheets + colored items on catenary lines, vertex-shader sway
- Cafe steam (2 particle emitters): tiny white rising particles, 0.5 units height
- Bougainvillea sway: vertex-shader at amplitude 0.05, same technique as grass
- Water: cathedral plaza fountain (splash particles), wall fountain (trickle)

**Fauna:**

- Cat on windowsill (Building A3, 2nd floor): slow tail-sway, yawns when player approaches
- Dog sleeping (Calle Oeste south): breathing scale oscillation, rare stretch
- Birds on cathedral roof (3): occasional wing-flap
- Seabirds at Mirador (2): sine-wave flight circles
- Parrot on gazebo: head-bob idle
- Butterflies (8-10): figure-8 paths near flowers, yellow morpho dominant, 2 rare blue morpho

**Sound zones:**

- Cathedral Plaza: fountain splash, distant bell every 90s
- Plazuela: birdsong, cafe clatter
- Calle Oeste: faint salsa radio, gym iron clinking
- Calle Este: ocean waves, evening murmur + glass clinks
- Mirador: wind dominant, flag flap

### Interactable Content Points (7)

| ID             | Content        | Location             | Building                    | Trigger         |
| -------------- | -------------- | -------------------- | --------------------------- | --------------- |
| `powerlifting` | Gym            | (-55, -15)           | Archetype 4 "Iron Chapel"   | Barbell on rack |
| `coffee`       | Cafe           | (-35, -25)           | Archetype 4, window counter | Coffee cup      |
| `neovim`       | Tech Loft      | (-39, -14) 2nd floor | Archetype 1                 | Monitor glow    |
| `gaming`       | Arcade         | (-45, +5)            | Archetype 4                 | Arcade cabinet  |
| `fsu`          | Diploma        | (-49, +3) 2nd floor  | Archetype 1                 | Diploma frame   |
| `cayuco`       | Race heritage  | (-29, +2)            | Archetype 3 `cascoBlue`     | Cayuco on wall  |
| `panama`       | Identity mural | (-35, -18)           | Full-wall mural             | Canal section   |

Each interaction feels like discovery, not a menu. Content surfaces naturally from the environment.

### The "Never Want To Leave" Recipe

1. **3-second rule:** From any position, something interesting within a 3-second walk
2. **Layered depth:** Every view has foreground (props), midground (facades), background (tower/sky)
3. **Corner rewards:** Each of 9 intersections reveals something new (cathedral, plazuela, gym interior, bougainvillea arch, ocean view, neon sign, gateway arch)
4. **Tension/release rhythm:** narrow streets (tight) → plazas (release) → narrow → mirador (maximum release)
5. **Scale contrast:** 3-4 unit wide streets with 6-9 unit tall buildings — player feels appropriately pedestrian
6. **One hero per segment:** Each street segment has ONE standout (postcard balcony, mural, gym, cayuco)
7. **Micro-moments:** butterfly lands on player after 10s standing still, carved initials on ceiba, cat yawns on approach

---

## Rendering Pipeline (Technical)

### Changes to Existing Files

- `Palette.js` — add all new color entries (24 additions)
- `ToonMaterials.js` — 4-step ramp, `onBeforeCompile` patch (shadow tint + rim + specular), outline options in factory
- `ToonLights.js` — new lighting setup (remove rim DirectionalLight, add hemisphere, reposition sun)
- `Rendering.js` — migrate to EffectComposer, scene fog, exposure to OutputPass
- `SkyDome.js` — widen horizon band for golden-hour peach gradient
- `World.js` — call `buildPanamaHub()` instead of `buildHubProps()`, new floor dimensions
- `Water.js` — replace with custom shader (depth-based, foam, sparkle)
- `data/rooms.js` — new layout (120x80, zone definitions)
- `data/content-map.js` — assign room/surface to all life facts

### New Files

| File                                                     | Purpose                                                             |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| `sources/Game/Rendering/ToonShaderPatch.js`              | onBeforeCompile injection: shadow tint, rim, specular               |
| `sources/Game/Rendering/PostFX.js`                       | EffectComposer chain: OutlineRenderPass, bloom, grade, output, SMAA |
| `sources/Game/Rendering/CanalWater.js`                   | Custom ShaderMaterial for canal (depth, foam, reflections)          |
| `sources/Game/World/Rooms/PanamaHub.js`                  | Orchestrator — replaces buildHubProps                               |
| `sources/Game/World/Rooms/districts/PlazaCentral.js`     | Spawn area geometry + props                                         |
| `sources/Game/World/Rooms/districts/CareerRow.js`        | 3 career buildings + Malecón                                        |
| `sources/Game/World/Rooms/districts/Canal.js`            | Canal geometry, lock gates, towpaths                                |
| `sources/Game/World/Rooms/districts/Bridge.js`           | Bridge structure + pylons                                           |
| `sources/Game/World/Rooms/districts/CascoViejo.js`       | Hero district orchestrator                                          |
| `sources/Game/World/Rooms/districts/casco/Streets.js`    | Street grid + cobblestone                                           |
| `sources/Game/World/Rooms/districts/casco/Buildings.js`  | 10 archetype factories + placement                                  |
| `sources/Game/World/Rooms/districts/casco/Cathedral.js`  | Full cathedral geometry                                             |
| `sources/Game/World/Rooms/districts/casco/Plazuela.js`   | Gazebo, ceiba, plaza                                                |
| `sources/Game/World/Rooms/districts/casco/Vegetation.js` | Bougainvillea, palms, pots                                          |
| `sources/Game/World/Rooms/districts/casco/Atmosphere.js` | String lights, fauna, particles                                     |
| `sources/Game/World/Rooms/districts/Dock.js`             | Pier, cayuco, race hook                                             |
| `sources/Game/World/Rooms/districts/Waterfront.js`       | Boundary treatment, distant islands                                 |

### Performance Budget (60fps on MacBook Pro 2020)

| Slice                                | Budget |
| ------------------------------------ | ------ |
| Rapier physics                       | 1.5ms  |
| JS scene update                      | 1.0ms  |
| Depth pre-pass (half-res, for water) | 0.8ms  |
| Main render + OutlineEffect          | 5.5ms  |
| Bloom (half-res)                     | 1.0ms  |
| Grade + vignette + Output + SMAA     | 1.2ms  |
| Headroom                             | ~5ms   |

Hard limits:

- Draw calls: ≤150 (OutlineEffect roughly doubles for outlined meshes → ~280 GPU draws)
- Triangles: ≤350k visible
- Texture memory: ≤64MB
- Lights: 3 directional/hemi + ≤4 points, 1 shadow caster
- Shadow map: 2048x2048

Kill switches (Debug.js): bloom off, SMAA off, DPR 1, hatching off — mobile fallback ladder.

### Water Shader (Canal)

Custom `ShaderMaterial` on subdivided plane (64x64):

- Depth pre-pass for shore foam (thin band where depth < 0.4)
- 3 stepped color bands: shallow (`canalTeal`) → deep (`canalDeep`)
- Fresnel sky reflection (stepped at 0.6, 35% mix)
- Sparkle noise (step at 0.985, scrolling)
- Vertex displacement: dual sine (amplitude 0.06, 0.05)
- Caustics on canal walls: two tileable Voronoi textures scrolling opposite directions, `min(a,b)`, masked below waterline y

---

## Implementation Phases

### Phase 1: Core — Materials + Terrain (playable but sparse)

- ToonShaderPatch.js (4-step ramp, shadow tint, rim, specular)
- Per-material outline params (color-matched, thickness tiers)
- Palette additions
- New floor geometry (120x80) + basic terrain elevation
- Canal water plane (basic shader)
- Lighting rework
- Player spawn + boundary walls

### Phase 2: Architecture — Buildings + Structures

- Plaza Central (fountain, arcades, benches)
- Career Row (3 buildings with colored facades, Malecón, lighthouse)
- Canal (lock gates, towpaths, stone copings)
- Bridge (ramped deck, pylons)
- Casco Viejo blockout (street grid, building volumes per archetype)
- Dock (pier, basic cayuco)

### Phase 3: Details — Vegetation + Props + Life

- Bougainvillea system (alpha-card clusters with vertex sway)
- Palm trees (royal, coconut, parlor) via InstancedMesh
- Ceiba tree, orange trees, ficus
- Potted plants roster
- Street props (lampposts, benches, bollards, cafe tables)
- Cathedral full detail (tower, buttresses, rose window, plaza)
- Building facades with full archetype features (balconies, shutters, doors)

### Phase 4: Polish — Atmosphere + Interactions + Post-Processing

- PostFX composer chain (bloom, grade, SMAA)
- Height fog shader patch
- String lights (emissive + bloom)
- Fauna (butterflies, birds, cat, dog) with idle animations
- Particles (cafe steam, dust motes, fountain splash)
- Laundry vertex animation
- Content interaction zones (sensor colliders + events)
- Canal water full shader (depth, foam, caustics)
- Race start zone sensor + placeholder UI
- Sound zone hooks (events only — audio system is a separate bead)

---

## Quality Gates

### Screenshot Test

Would a single frame from this world look impressive in a portfolio? Would someone share it on Twitter? If any angle looks flat, empty, or "WebGL demo-ish" — it fails.

### Density Test

Stand at any point. Look in every direction. Is every 5-unit radius visually interesting? At least 3 layers visible (foreground/mid/background)? If you can see bare ground or empty sky filling more than 20% of the frame — it fails.

### Flow Test

A first-time player naturally discovers all 6 districts within 2 minutes. Never feels lost (landmarks always visible). Never backtracks (loop design with two canal crossings). If any player gets stuck at a dead end or walks in circles — it fails.

### Performance Test

60fps sustained on MacBook Pro 2020 (Intel Iris Plus). Run 120 frames, assert `drawCalls < 150 && avgFrameMs < 14` in e2e test. If any frame exceeds 16ms — profile and fix.

---

## Content Map Updates

```javascript
// Life facts with assigned locations
{ id: 'panama', room: 'casco-viejo', surface: 'mural' }
{ id: 'fsu', room: 'casco-viejo', surface: 'diploma' }
{ id: 'cayuco', room: 'casco-viejo', surface: 'cayuco-house' }
{ id: 'powerlifting', room: 'casco-viejo', surface: 'gym' }
{ id: 'bodybuilding', room: 'casco-viejo', surface: 'gym' }
{ id: 'neovim', room: 'casco-viejo', surface: 'tech-loft' }
{ id: 'coffee', room: 'casco-viejo', surface: 'cafe' }
{ id: 'gaming', room: 'casco-viejo', surface: 'arcade' }
```

---

## Constraints

- **Must not modify:** Player controller physics, Camera system, Input system, Ticker architecture
- **Performance budget:** <16ms per frame, <14ms target, 60fps sustained
- **Dependencies:** None (this is the blocker for `portfolio-als` cayuco race)
- **Browser/runtime:** WebGL2, Chrome/Firefox/Safari, mobile touch support maintained
- **Asset approach:** Procedural geometry for terrain/structures, GLB from Blender for high-detail props if needed (but start procedural — toon shading hides low poly)

## Out of Scope

- The cayuco race minigame itself (separate bead `portfolio-als`)
- Audio/sound engine (just hook points / events)
- Interior rooms (everything visible from outside through doors/windows)
- Day/night cycle (perpetual golden hour)
- NPC characters (people)
- Procedural generation — all placement is authored, deterministic
