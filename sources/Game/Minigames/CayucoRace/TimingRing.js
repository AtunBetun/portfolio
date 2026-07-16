import { RACE_CONFIG } from '../../../../data/race-config.js'
import { PALETTE } from '../../Rendering/Palette.js'

const RING_SIZE = 80
const START_SCALE = 3
const MISS_DISTANCE = -0.5
const FEEDBACK_DELAY = 200

const ACCENT = `#${PALETTE.accent.toString(16).padStart(6, '0')}`
const BRIGHT_GOLD = '#ffe066'
const WHITE_GOLD = '#fff3c4'
const BAD_RED = '#e74c3c'

let styleElement = null

const injectStyles = () => {
  if (styleElement) return

  styleElement = document.createElement('style')
  styleElement.dataset.timingRing = ''
  styleElement.textContent = `
    .timing-ring-container {
      position: fixed;
      bottom: 25%;
      left: 50%;
      transform: translateX(-50%);
      width: ${RING_SIZE}px;
      height: ${RING_SIZE}px;
      pointer-events: none;
      display: none;
      z-index: 200;
    }
    .timing-ring-container.is-active {
      display: block;
    }
    .timing-ring-hit-zone {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 2px solid rgba(255, 255, 255, 0.5);
    }
    .timing-ring-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid ${ACCENT};
      transition: transform 0.016s linear;
      will-change: transform;
    }
    .timing-ring-ring.feedback-perfect {
      animation: ring-perfect 0.15s ease-out forwards;
    }
    .timing-ring-ring.feedback-bad {
      animation: ring-bad-shake 0.2s ease-in-out;
    }
    @keyframes ring-perfect {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
    @keyframes ring-bad-shake {
      0% { transform: translateX(0); }
      25% { transform: translateX(-3px); }
      50% { transform: translateX(3px); }
      75% { transform: translateX(-3px); }
      100% { transform: translateX(0); }
    }
  `

  document.head.appendChild(styleElement)
}

export default class TimingRing {
  constructor() {
    injectStyles()

    this.container = document.createElement('div')
    this.container.className = 'timing-ring-container'

    this.hitZone = document.createElement('div')
    this.hitZone.className = 'timing-ring-hit-zone'
    this.container.appendChild(this.hitZone)

    this.ring = document.createElement('div')
    this.ring.className = 'timing-ring-ring'
    this.container.appendChild(this.ring)

    this.active = false
    this.onResult = null
    this.combo = 0
    this.lastDistance = 0
    this.feedbackTimeout = null

    document.body.appendChild(this.container)
  }

  show(onResult) {
    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout)
      this.feedbackTimeout = null
    }

    this.active = true
    this.onResult = onResult || null
    this.lastDistance = RACE_CONFIG.waves.triggerDistance

    this.resetRing()
    this.applyComboStyle()
    this.container.classList.add('is-active')
  }

  hide() {
    this.active = false
    this.onResult = null

    if (this.feedbackTimeout) {
      clearTimeout(this.feedbackTimeout)
      this.feedbackTimeout = null
    }

    this.container.classList.remove('is-active')
    this.resetRing()
  }

  update(waveDistance) {
    if (!this.active) return

    this.lastDistance = waveDistance

    const scale = 1 + (2 * Math.max(0, waveDistance)) / RACE_CONFIG.waves.triggerDistance
    this.ring.style.transform = `scale(${scale})`

    if (waveDistance <= MISS_DISTANCE) {
      this.finish('bad')
    }
  }

  judge() {
    if (!this.active) return

    const delta = this.lastDistance / RACE_CONFIG.waves.speed

    let quality = 'bad'
    if (Math.abs(delta) <= RACE_CONFIG.timingWindow.perfect) {
      quality = 'perfect'
    } else if (Math.abs(delta) <= RACE_CONFIG.timingWindow.good) {
      quality = 'good'
    }

    this.finish(quality)
  }

  finish(quality) {
    if (!this.active) return

    this.active = false

    this.ring.classList.remove('feedback-perfect', 'feedback-bad')
    // Force reflow so feedback animations restart on consecutive waves
    void this.ring.offsetWidth

    if (quality === 'perfect') {
      this.ring.style.borderColor = '#ffd700'
      this.ring.classList.add('feedback-perfect')
    } else if (quality === 'good') {
      this.ring.style.borderColor = '#ffffff'
      this.ring.style.boxShadow = '0 0 16px rgba(255, 255, 255, 0.9)'
    } else {
      this.ring.style.borderColor = BAD_RED
      this.ring.classList.add('feedback-bad')
    }

    const callback = this.onResult
    this.onResult = null
    if (callback) callback(quality)

    this.feedbackTimeout = setTimeout(() => {
      this.feedbackTimeout = null
      this.container.classList.remove('is-active')
      this.resetRing()
    }, FEEDBACK_DELAY)
  }

  setCombo(n) {
    this.combo = n
    this.applyComboStyle()
  }

  applyComboStyle() {
    if (this.combo >= 3) {
      this.ring.style.borderColor = WHITE_GOLD
      this.ring.style.borderWidth = '5px'
      this.ring.style.boxShadow = `0 0 14px ${BRIGHT_GOLD}`
    } else if (this.combo >= 1) {
      this.ring.style.borderColor = BRIGHT_GOLD
      this.ring.style.borderWidth = '4px'
      this.ring.style.boxShadow = 'none'
    } else {
      this.ring.style.borderColor = ACCENT
      this.ring.style.borderWidth = '3px'
      this.ring.style.boxShadow = 'none'
    }
  }

  resetRing() {
    this.ring.classList.remove('feedback-perfect', 'feedback-bad')
    this.ring.style.transform = `scale(${START_SCALE})`
    this.ring.style.opacity = '1'
    this.ring.style.boxShadow = 'none'
  }

  dispose() {
    this.hide()

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    if (styleElement && styleElement.parentNode) {
      styleElement.parentNode.removeChild(styleElement)
      styleElement = null
    }

    this.container = null
    this.ring = null
    this.hitZone = null
    this.onResult = null
  }
}
