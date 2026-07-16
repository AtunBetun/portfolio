export const RACE_CONFIG = {
  courseLength: 200,
  strokeImpulse: 1.15,
  dragHalfLife: 1.4,
  paddleCooldown: 0.22,
  inputBuffer: 0.08,
  maxSpeed: 11,

  flow: {
    band: [0.26, 0.44],
    gain: 0.125,
    loss: 0.35,
    maxBonus: 0.35
  },

  waves: {
    progressMarks: [0.18, 0.4, 0.52, 0.7, 0.8, 0.9],
    ampByPhase: [1.2, 1.8, 2.6],
    sigma: 2.2,
    speed: 8,
    triggerDistance: 12,
    rideImpulse: 3.2,
    comboStep: 0.4,
    comboCap: 5,
    swampFactor: 0.45
  },

  timingWindow: {
    perfect: 0.08,
    good: 0.2
  },

  medals: {
    gold: 28,
    silver: 32,
    bronze: 38
  },

  drift: {
    ambient: 0.3,
    event: 1.2
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
    shakeDuration: 0.6,
    shakeIntensity: 0.35,
    phaseOffsets: [
      { distance: 8.5, height: 3.2, lookAhead: 4, swayMult: 1.0 },
      { distance: 8, height: 2.6, lookAhead: 4.5, swayMult: 1.4 },
      { distance: 7.2, height: 2.1, lookAhead: 5, swayMult: 2.0 }
    ]
  }
}
