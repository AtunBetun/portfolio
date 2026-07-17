# Cayuco Race: Tempo-Matching Rhythm Rework

## Problem

The original rhythm mechanic feels disconnected: strokes add flat impulse, the
only rhythm evaluation is a loose interval band feeding a "flow" bonus that adds
just 25%, mashing has no penalty, and the wave events use a disjoint shrinking-
ring timing minigame. The user wants a race that *is* a rhythm game.

## Design Decisions

1. **Tempo-matching core.** Your rolling stroke BPM, measured from A/D input
   intervals, is the mechanic. Each course section (act) defines a target BPM
   zone; boat power peaks when your BPM sits in the zone and degrades smoothly
   if you drift too fast or too slow.

2. **Stamina + form decay.** Sustained overpacing drains a visible stamina
   meter. Below the fatigue threshold strokes are weak and splashy — half the
   paddle amplitude, more particles, duller audio. Same-side spam (broken
   alternation) also costs stamina.

3. **Five authored acts (~90 s total):**
   - Launch Sprint 140 BPM
   - Open Water Cruise 100 BPM
   - Wave Field (cruise 90, surge 130 to catch)
   - Headwind Grind 70 BPM
   - Final Sprint 150 BPM

4. **Surge-to-surf waves** (replaces TimingRing). Telegraphed swells roll in;
   if your BPM is in the surge zone when the crest arrives you catch it for
   4 seconds of surfing (free speed 18, spray, camera lift). Miss = wave rolls
   under — lost opportunity, no swamping penalty.

5. **Procedural WebAudio.** A drum pulse at the act's target BPM ("the drummer
   in the boat"), stroke splashes, in-zone shimmer, surf rumble. Synthesized
   (no asset files), mute toggle, autoplay-safe via per-input unlock.

6. **BPM HUD.** Top-right: numeric readout + 220 px horizontal track with
   fixed scale 40–180 BPM, a highlighted zone band that slides between acts,
   and a needle at the player's current BPM. Plus stamina bar, act banner with
   hint text, and wave telegraph indicator.

## Architecture

- **Pure logic modules** in `logic/`: RhythmTracker, PaddleModel, StaminaModel,
  SurfLogic, ActTrack — no three.js/DOM, unit-tested with bun.
- **Audio modules** in `audio/`: AudioEngine (context lifecycle, noise buffer,
  mute), RaceAudio (drum scheduler, splash, shimmer, rumble).
- **RaceController** retains impulse + exponential drag model; modulates
  impulse by efficiency(bpm) × stamina.strokeFactor() × act.impulseMult.
- **TimingRing deleted.**

## Verification

- 101 unit tests (11 files) including a pace-simulation harness proving the
  five-act race lands at ~90 s for a perfect player.
- Vite build passes (all imports resolve).
- Playwright e2e verifies HUD elements and BPM readout under input.
