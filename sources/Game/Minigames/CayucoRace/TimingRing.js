import { RACE_CONFIG } from '../../../../data/race-config.js'
import { PALETTE } from '../../Rendering/Palette.js'

const HIT_ZONE_SIZE = 80
const START_SCALE = 3
const GRACE_PERIOD = 0.3
const ACCENT = `#${PALETTE.accent.toString(16).padStart(6, '0')}`

let styleElement = null

const injectStyles = () => {
  if (styleElement) return

  styleElement = document.createElement('style')
  styleElement.dataset.timingRing = ''
  styleElement.textContent = `
    .timing-ring-container {
      position: absolute;
      top: 50%;
      left: 50%;
      width: ${HIT_ZONE_SIZE}px;
      height: ${HIT_ZONE_SIZE}px;
      margin-left: ${-HIT_ZONE_SIZE / 2}px;
      margin-top: ${-HIT_ZONE_SIZE / 2}px;
      pointer-events: none;
      display: none;
      z-index: 100;
    }
    .timing-ring-container.is-active {
      display: block;
    }
    .timing-ring-hit-zone {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 3px solid rgba(255, 255, 255, 0.75);
      box-shadow: 0 0 12px rgba(0, 0, 0, 0.25);
    }
    .timing-ring-ring {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      border: 4px solid ${ACCENT};
      box-shadow: 0 0 10px ${ACCENT}66;
      will-change: transform;
    }
    .timing-ring-ring.feedback-perfect {
      animation: timing-ring-perfect 0.3s ease-out forwards;
    }
    .timing-ring-ring.feedback-good {
      animation: timing-ring-good 0.3s ease-out forwards;
    }
    .timing-ring-ring.feedback-bad {
      animation: timing-ring-bad 0.3s ease-out forwards;
    }
    @keyframes timing-ring-perfect {
      0% {
        transform: scale(1);
        box-shadow: 0 0 24px ${ACCENT};
        opacity: 1;
      }
      50% {
        transform: scale(1.35);
        box-shadow: 0 0 36px ${ACCENT};
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        box-shadow: 0 0 12px ${ACCENT}00;
        opacity: 0;
      }
    }
    @keyframes timing-ring-good {
      0% {
        border-color: #ffffff;
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.9);
        opacity: 1;
      }
      100% {
        border-color: #ffffff;
        box-shadow: 0 0 6px rgba(255, 255, 255, 0);
        opacity: 0;
      }
    }
    @keyframes timing-ring-bad {
      0% {
        border-color: #e74c3c;
        box-shadow: 0 0 16px rgba(231, 76, 60, 0.8);
        opacity: 1;
      }
      100% {
        border-color: #e74c3c;
        box-shadow: 0 0 4px rgba(231, 76, 60, 0);
        opacity: 0;
      }
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
    this.startTime = 0
    this.elapsed = 0
    this.duration = 1.5
    this.onResult = null

    document.body.appendChild(this.container)
  }

  show(onResult) {
    this.onResult = onResult || null
    this.active = true
    this.startTime = performance.now() / 1000
    this.elapsed = 0

    this.ring.classList.remove('feedback-perfect', 'feedback-good', 'feedback-bad')
    this.ring.style.opacity = '1'
    this.ring.style.transform = `scale(${START_SCALE})`
    this.container.classList.add('is-active')
  }

  hide() {
    this.active = false
    this.onResult = null
    this.container.classList.remove('is-active')
    this.ring.classList.remove('feedback-perfect', 'feedback-good', 'feedback-bad')
    this.ring.style.transform = `scale(${START_SCALE})`
    this.ring.style.opacity = '1'
  }

  judge(inputTime) {
    if (!this.active) return null

    const elapsed = inputTime !== undefined ? inputTime - this.startTime : this.elapsed
    const offset = Math.abs(elapsed - this.duration)

    let quality = 'bad'
    if (offset <= RACE_CONFIG.timingWindow.perfect) {
      quality = 'perfect'
    } else if (offset <= RACE_CONFIG.timingWindow.good) {
      quality = 'good'
    }

    this.active = false
    this.ring.classList.remove('feedback-perfect', 'feedback-good', 'feedback-bad')
    // Force reflow so the feedback animation restarts on consecutive judges
    void this.ring.offsetWidth
    this.ring.classList.add(`feedback-${quality}`)

    if (this.onResult) this.onResult(quality)

    return quality
  }

  update(elapsed) {
    if (!this.active) return

    this.elapsed = elapsed

    const progress = Math.min(elapsed / this.duration, 1)
    const scale = START_SCALE - (START_SCALE - 1) * progress
    this.ring.style.transform = `scale(${scale})`

    if (elapsed > this.duration + GRACE_PERIOD) {
      this.judge()
    }
  }

  setScreenPosition(x, y) {
    this.container.style.left = `${x}px`
    this.container.style.top = `${y}px`
  }

  dispose() {
    this.hide()
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container)
    }
    this.container = null
    this.ring = null
    this.hitZone = null
    this.onResult = null
  }
}
