export const RACE_CONFIG = {
  courseLength: 1500,
  dragHalfLife: 2.2,
  maxSpeed: 14,

  stroke: {
    biteImpulse: 0.6,
    thrustPerSec: 5.8,
    rampTime: 0.15,
    stallStart: 0.6,
    stallTau: 0.25,
    cleanWindow: [0.15, 0.7],
    cleanBonus: 0.24,
    recovery: 0.12,
    maxHold: 1.5
  },

  // Tempo-matching core — the player's rolling stroke BPM against each act's zone
  rhythm: {
    windowSize: 4,
    smoothing: 0.35,
    maxInterval: 1.6,
    minInterval: 0.15,
    graceStrokes: 3,
    falloffLow: 25,
    falloffHigh: 16,
    floor: 0.35
  },

  stamina: {
    drainPerSecond: 0.12,
    overshootRef: 30,
    sameSideHit: 0.05,
    recoverPerSecond: 0.1,
    restRecoverPerSecond: 0.18,
    fatigueEnter: 0.25,
    fatigueExit: 0.45,
    minStrokeFactor: 0.45
  },

  surf: {
    telegraphDistance: 30,
    catchHalfWidth: 3.0,
    surfSpeed: 18,
    surfMaxSpeed: 18,
    surfDuration: 4.0,
    damp: 8
  },

  audio: {
    drumGain: 0.25,
    lookahead: 0.12,
    schedulerInterval: 0.025
  },

  // Five authored acts — contiguous progress ranges, each with its own tempo zone
  acts: [
    {
      id: 'launch',
      name: 'LAUNCH SPRINT',
      hint: 'Dig in — fast strokes!',
      start: 0.0,
      end: 0.15,
      bpmZone: [125, 155],
      seaPhase: 0,
      impulseMult: 1.25,
      dragMult: 1.0,
      drumBpm: 140
    },
    {
      id: 'cruise',
      name: 'OPEN WATER',
      hint: 'Settle into an easy rhythm',
      start: 0.15,
      end: 0.4,
      bpmZone: [88, 112],
      seaPhase: 0,
      impulseMult: 1.1,
      dragMult: 1.0,
      drumBpm: 100
    },
    {
      id: 'waves',
      name: 'THE SWELLS',
      hint: 'Surge to catch the waves!',
      start: 0.4,
      end: 0.65,
      bpmZone: [78, 102],
      seaPhase: 1,
      impulseMult: 1.0,
      dragMult: 1.0,
      drumBpm: 90,
      surf: {
        schedule: [0.44, 0.51, 0.58],
        surgeZone: [118, 148]
      }
    },
    {
      id: 'headwind',
      name: 'HEADWIND',
      hint: 'Slow, powerful strokes',
      start: 0.65,
      end: 0.85,
      bpmZone: [58, 82],
      seaPhase: 2,
      impulseMult: 1.05,
      dragMult: 0.8,
      drumBpm: 70
    },
    {
      id: 'sprint',
      name: 'FINAL SPRINT',
      hint: 'Empty the tank!',
      start: 0.85,
      end: 1.0,
      bpmZone: [135, 165],
      seaPhase: 2,
      impulseMult: 1.25,
      dragMult: 1.0,
      drumBpm: 150
    }
  ],

  waves: {
    ampByPhase: [1.2, 1.8, 2.6],
    sigma: 2.2,
    speed: 8
  },

  medals: {
    gold: 120,
    silver: 138,
    bronze: 156
  },

  drift: {
    ambient: 0.3
  },

  phases: [
    {
      swellAmp: 0.18,
      chopAmp: 0.05,
      crestPower: 1.6,
      swellFreq: 0.1,
      swellSpeed: 1.2,
      wind: 0.25,
      foamThreshold: 0.85,
      tintToDeep: 0
    },
    {
      swellAmp: 0.45,
      chopAmp: 0.14,
      crestPower: 2.4,
      swellFreq: 0.16,
      swellSpeed: 1.8,
      wind: 0.6,
      foamThreshold: 0.75,
      tintToDeep: 0
    },
    {
      swellAmp: 0.8,
      chopAmp: 0.22,
      crestPower: 3.2,
      swellFreq: 0.22,
      swellSpeed: 2.6,
      wind: 1.0,
      foamThreshold: 0.55,
      tintToDeep: 0.35
    }
  ],

  camera: {
    baseFov: 55,
    speedFovRange: 9,
    strokeKick: 0.6,
    perfectKick: 6,
    badKick: -4,
    surfKick: 7,
    surfLift: 0.8,
    shakeDuration: 0.6,
    shakeIntensity: 0.35,
    phaseOffsets: [
      { distance: 8.5, height: 3.2, lookAhead: 4, swayMult: 1.0 },
      { distance: 8, height: 2.6, lookAhead: 4.5, swayMult: 1.4 },
      { distance: 7.2, height: 2.1, lookAhead: 5, swayMult: 2.0 }
    ]
  }
}
