import { PALETTE } from '../../Rendering/Palette.js'

const toHex = (color) => `#${color.toString(16).padStart(6, '0')}`

const ACCENT = toHex(PALETTE.accent)
const STONE = toHex(PALETTE.stone)

const MEDAL_COLORS = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32'
}

export default class RaceHUD {
  constructor() {
    this.onRetry = null
    this.onExit = null

    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '100',
      fontFamily: 'monospace'
    })

    this.timerEl = document.createElement('div')
    Object.assign(this.timerEl.style, {
      position: 'absolute',
      top: '16px',
      right: '24px',
      fontSize: '24px',
      color: '#ffffff',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)'
    })
    this.timerEl.textContent = '00.0'
    this.container.appendChild(this.timerEl)

    this.progressTrack = document.createElement('div')
    Object.assign(this.progressTrack.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '4px',
      background: 'rgba(255, 255, 255, 0.25)'
    })
    this.progressBar = document.createElement('div')
    Object.assign(this.progressBar.style, {
      width: '0%',
      height: '100%',
      background: ACCENT,
      transition: 'width 0.1s linear'
    })
    this.progressTrack.appendChild(this.progressBar)
    this.container.appendChild(this.progressTrack)

    this.countdownEl = document.createElement('div')
    Object.assign(this.countdownEl.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      fontSize: '72px',
      fontWeight: 'bold',
      color: '#ffffff',
      textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
      display: 'none'
    })
    this.container.appendChild(this.countdownEl)

    this.styleEl = document.createElement('style')
    this.styleEl.textContent = [
      '@keyframes race-hud-scale-in {',
      '  from { transform: translate(-50%, -50%) scale(2); opacity: 0 }',
      '  to { transform: translate(-50%, -50%) scale(1); opacity: 1 }',
      '}'
    ].join('\n')
    document.head.appendChild(this.styleEl)

    this.resultsEl = document.createElement('div')
    Object.assign(this.resultsEl.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(20, 20, 30, 0.85)',
      borderRadius: '16px',
      padding: '32px 48px',
      color: '#ffffff',
      textAlign: 'center',
      pointerEvents: 'auto',
      display: 'none'
    })
    this.container.appendChild(this.resultsEl)

    document.body.appendChild(this.container)
  }

  show() {
    this.container.style.display = 'block'
  }

  hide() {
    this.container.style.display = 'none'
  }

  updateTimer(seconds) {
    this.timerEl.textContent = seconds.toFixed(1)
  }

  updateProgress(progress) {
    this.progressBar.style.width = progress * 100 + '%'
  }

  showCountdown(number) {
    this.countdownEl.textContent = number === 0 ? 'GO!' : String(number)
    this.countdownEl.style.display = 'block'
    this.countdownEl.style.animation = 'none'
    // Force reflow so the animation restarts for each number
    void this.countdownEl.offsetWidth
    this.countdownEl.style.animation = 'race-hud-scale-in 0.3s ease-out'
  }

  hideCountdown() {
    this.countdownEl.style.display = 'none'
  }

  showResults(time, medal) {
    this.resultsEl.innerHTML = ''

    const timeEl = document.createElement('div')
    Object.assign(timeEl.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      marginBottom: '8px'
    })
    timeEl.textContent = time.toFixed(1) + 's'
    this.resultsEl.appendChild(timeEl)

    const medalEl = document.createElement('div')
    Object.assign(medalEl.style, {
      fontSize: '28px',
      marginBottom: '24px',
      color: MEDAL_COLORS[medal] || '#ffffff'
    })
    medalEl.textContent = medal ? medal.charAt(0).toUpperCase() + medal.slice(1) : 'No Medal'
    this.resultsEl.appendChild(medalEl)

    const buttonRow = document.createElement('div')
    Object.assign(buttonRow.style, {
      display: 'flex',
      gap: '16px',
      justifyContent: 'center'
    })

    const makeButton = (label, background, onClick) => {
      const button = document.createElement('button')
      Object.assign(button.style, {
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        cursor: 'pointer',
        fontSize: '16px',
        fontFamily: 'monospace',
        background,
        color: '#1a1a2a'
      })
      button.textContent = label
      button.addEventListener('click', onClick)
      return button
    }

    buttonRow.appendChild(
      makeButton('Retry', ACCENT, () => {
        if (this.onRetry) this.onRetry()
      })
    )
    buttonRow.appendChild(
      makeButton('Back to Hub', STONE, () => {
        if (this.onExit) this.onExit()
      })
    )

    this.resultsEl.appendChild(buttonRow)
    this.resultsEl.style.display = 'block'
  }

  hideResults() {
    this.resultsEl.style.display = 'none'
  }

  dispose() {
    this.container.remove()
    this.styleEl.remove()
  }
}
