import { PALETTE } from '../../Rendering/Palette.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const toHex = (color) => `#${color.toString(16).padStart(6, '0')}`

const ACCENT = toHex(PALETTE.accent)
const STONE = toHex(PALETTE.stone)
const OCEAN_DEEP = toHex(PALETTE.oceanDeep)

const MEDAL_COLORS = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32'
}

const STYLE_ID = 'race-hud-style'

function injectStyles() {
  if (document.getElementById(STYLE_ID)) return
  const styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = `
@keyframes race-scale-in {
  from { transform: translate(-50%, -50%) scale(2); opacity: 0 }
  to { transform: translate(-50%, -50%) scale(1); opacity: 1 }
}
@keyframes race-combo-pop {
  from { transform: translateX(-50%) scale(1.6) }
  to { transform: translateX(-50%) scale(1) }
}
@keyframes race-combo-break {
  from { transform: translateX(-50%) scale(1); opacity: 1 }
  to { transform: translateX(-50%) scale(1.3); opacity: 0 }
}
@keyframes race-banner-show {
  0% { opacity: 0 }
  15% { opacity: 1 }
  70% { opacity: 1 }
  100% { opacity: 0 }
}
@keyframes race-rhythm-pulse {
  0% { transform: scale(1) }
  50% { transform: scale(1.3) }
  100% { transform: scale(1) }
}
.race-flow-glow {
  box-shadow: 0 0 8px 2px ${ACCENT}, 0 0 16px 4px rgba(255, 215, 0, 0.5);
}
.race-speedlines {
  background: repeating-linear-gradient(
    135deg,
    transparent,
    transparent 4px,
    rgba(255, 255, 255, 0.3) 4px,
    transparent 5px
  );
  -webkit-mask-image: radial-gradient(ellipse at center, transparent 35%, black 85%);
  mask-image: radial-gradient(ellipse at center, transparent 35%, black 85%);
}
.race-rhythm-icon {
  width: 8px;
  height: 24px;
  border-radius: 4px 4px 2px 2px;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
  animation: race-rhythm-pulse 0.35s ease infinite alternate;
}
.race-rhythm-icon.in-flow {
  background: ${ACCENT};
  box-shadow: 0 0 8px 2px ${ACCENT};
}
`
  document.head.appendChild(styleEl)
}

export default class RaceHUD {
  constructor() {
    this.onRetry = null
    this.onExit = null
    this.comboBreakTimeout = null

    injectStyles()

    this.container = document.createElement('div')
    Object.assign(this.container.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'none',
      zIndex: '100',
      fontFamily: 'sans-serif'
    })

    this.buildOverlays()
    this.buildProgress()
    this.buildTimer()
    this.buildCombo()
    this.buildBanner()
    this.buildCountdown()
    this.buildControls()
    this.buildRhythmIcons()
    this.buildResults()

    document.body.appendChild(this.container)
  }

  buildOverlays() {
    this.speedlinesEl = document.createElement('div')
    this.speedlinesEl.className = 'race-speedlines'
    Object.assign(this.speedlinesEl.style, {
      position: 'absolute',
      inset: '0',
      opacity: '0',
      transition: 'opacity 0.3s ease'
    })
    this.container.appendChild(this.speedlinesEl)

    this.vignetteEl = document.createElement('div')
    Object.assign(this.vignetteEl.style, {
      position: 'absolute',
      inset: '0',
      background: `radial-gradient(ellipse at center, transparent 40%, ${OCEAN_DEEP} 100%)`,
      opacity: '0'
    })
    this.container.appendChild(this.vignetteEl)

    this.flashEl = document.createElement('div')
    Object.assign(this.flashEl.style, {
      position: 'absolute',
      inset: '0',
      background: '#ffffff',
      opacity: '0'
    })
    this.container.appendChild(this.flashEl)
  }

  buildProgress() {
    this.progressTrack = document.createElement('div')
    Object.assign(this.progressTrack.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '4px',
      background: 'rgba(0, 0, 0, 0.35)'
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

    this.flowBar = document.createElement('div')
    Object.assign(this.flowBar.style, {
      position: 'absolute',
      top: '4px',
      left: '0',
      width: '0%',
      height: '3px',
      background: ACCENT,
      opacity: '0',
      transition: 'width 0.1s linear, opacity 0.2s ease'
    })
    this.container.appendChild(this.flowBar)
  }

  buildTimer() {
    this.timerEl = document.createElement('div')
    Object.assign(this.timerEl.style, {
      position: 'absolute',
      top: '16px',
      right: '24px',
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffffff',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)'
    })
    this.timerEl.textContent = '00.0'
    this.container.appendChild(this.timerEl)
  }

  buildCombo() {
    this.comboEl = document.createElement('div')
    Object.assign(this.comboEl.style, {
      position: 'absolute',
      top: '18%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '36px',
      fontWeight: 'bold',
      color: '#ffffff',
      textShadow: `0 0 12px ${ACCENT}, 0 2px 4px rgba(0, 0, 0, 0.6)`,
      display: 'none'
    })
    this.container.appendChild(this.comboEl)
  }

  buildBanner() {
    this.bannerEl = document.createElement('div')
    Object.assign(this.bannerEl.style, {
      position: 'absolute',
      top: '38%',
      left: '0',
      width: '100%',
      textAlign: 'center',
      fontSize: '48px',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      color: '#ffffff',
      textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)',
      opacity: '0'
    })
    this.container.appendChild(this.bannerEl)
  }

  buildCountdown() {
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
  }

  buildControls() {
    this.controlsEl = document.createElement('div')
    Object.assign(this.controlsEl.style, {
      position: 'absolute',
      bottom: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '14px',
      color: '#ffffff',
      opacity: '0.9',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
      whiteSpace: 'nowrap',
      transition: 'opacity 0.6s ease'
    })
    this.controlsEl.textContent = 'A = left paddle  •  D = right paddle  •  Match the beat!'
    this.container.appendChild(this.controlsEl)
  }

  hideControls() {
    if (this.controlsEl) {
      this.controlsEl.style.opacity = '0'
    }
  }

  buildRhythmIcons() {
    const row = document.createElement('div')
    Object.assign(row.style, {
      position: 'absolute',
      bottom: '32px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      gap: '24px'
    })

    this.rhythmIcons = {}
    for (const side of ['left', 'right']) {
      const wrapper = document.createElement('div')
      wrapper.style.transform = `rotate(${side === 'left' ? -15 : 15}deg)`
      const icon = document.createElement('div')
      icon.className = 'race-rhythm-icon'
      icon.style.opacity = '0.6'
      wrapper.appendChild(icon)
      row.appendChild(wrapper)
      this.rhythmIcons[side] = icon
    }
    this.container.appendChild(row)
    this.rhythmRow = row
  }

  buildResults() {
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
      display: 'none'
    })
    this.container.appendChild(this.resultsEl)
  }

  show() {
    this.container.style.display = 'block'
  }

  hide() {
    this.container.style.display = 'none'
  }

  updateTimer(seconds) {
    this.timerEl.textContent = seconds.toFixed(1).padStart(4, '0')
  }

  updateProgress(progress) {
    this.progressBar.style.width = progress * 100 + '%'
  }

  updateFlow(flow) {
    this.flowBar.style.width = flow * 100 + '%'
    this.flowBar.style.opacity = String(0.3 + flow * 0.7)
    this.flowBar.classList.toggle('race-flow-glow', flow >= 0.7)

    const inFlow = flow >= 0.7
    for (const side of ['left', 'right']) {
      this.rhythmIcons[side].classList.toggle('in-flow', inFlow)
    }
  }

  showCombo(combo) {
    if (this.comboBreakTimeout) {
      clearTimeout(this.comboBreakTimeout)
      this.comboBreakTimeout = null
    }
    if (combo === 0) {
      this.comboEl.style.display = 'none'
      return
    }
    this.comboEl.textContent = `×${combo}`
    this.comboEl.style.display = 'block'
    this.comboEl.style.opacity = '1'
    this.comboEl.style.animation = 'none'
    // Force reflow so the pop animation restarts on each combo bump
    void this.comboEl.offsetWidth
    this.comboEl.style.animation = 'race-combo-pop 0.2s ease-out'
  }

  // Alias kept for callers using the older name
  popCombo(combo) {
    this.showCombo(combo)
  }

  breakCombo() {
    if (this.comboEl.style.display === 'none') return
    this.comboEl.style.animation = 'none'
    void this.comboEl.offsetWidth
    this.comboEl.style.animation = 'race-combo-break 0.3s ease-in forwards'
    this.comboBreakTimeout = setTimeout(() => {
      this.comboEl.style.display = 'none'
      this.comboEl.style.animation = 'none'
      this.comboBreakTimeout = null
    }, 300)
  }

  showPhaseBanner(text) {
    this.bannerEl.textContent = text
    this.bannerEl.style.animation = 'none'
    void this.bannerEl.offsetWidth
    this.bannerEl.style.animation = 'race-banner-show 1.5s ease forwards'
  }

  showCountdown(number) {
    this.countdownEl.textContent = number === 0 ? 'GO!' : String(number)
    this.countdownEl.style.display = 'block'
    this.countdownEl.style.animation = 'none'
    // Force reflow so the animation restarts for each number
    void this.countdownEl.offsetWidth
    this.countdownEl.style.animation = 'race-scale-in 0.3s ease-out'
  }

  hideCountdown() {
    this.countdownEl.style.display = 'none'
  }

  showSpeedlines() {
    this.speedlinesEl.style.opacity = '0.18'
  }

  hideSpeedlines() {
    this.speedlinesEl.style.opacity = '0'
  }

  flashPerfect() {
    this.flashEl.style.transition = 'none'
    this.flashEl.style.opacity = '0.25'
    void this.flashEl.offsetWidth
    this.flashEl.style.transition = 'opacity 120ms ease-out'
    this.flashEl.style.opacity = '0'
  }

  flashBad() {
    this.vignetteEl.style.transition = 'none'
    this.vignetteEl.style.opacity = '1'
    void this.vignetteEl.offsetWidth
    this.vignetteEl.style.transition = 'opacity 500ms ease-out'
    this.vignetteEl.style.opacity = '0'
  }

  // Alias kept for callers using the older name
  showVignette() {
    this.flashBad()
  }

  pulseRhythm(side) {
    const icon = this.rhythmIcons[side]
    if (!icon) return
    icon.style.animation = 'none'
    void icon.offsetWidth
    icon.style.animation = 'race-rhythm-pulse 0.2s ease-out'
    icon.style.opacity = '1'
  }

  showResults(time, medal) {
    this.resultsEl.innerHTML = ''

    const timeEl = document.createElement('div')
    Object.assign(timeEl.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      marginBottom: '8px'
    })
    timeEl.textContent = time.toFixed(1) + 's'
    this.resultsEl.appendChild(timeEl)

    const medalEl = document.createElement('div')
    Object.assign(medalEl.style, {
      fontSize: '28px',
      fontWeight: 'bold',
      textTransform: 'capitalize',
      marginBottom: '12px',
      color: MEDAL_COLORS[medal] || '#ffffff'
    })
    medalEl.textContent = medal || '—'
    this.resultsEl.appendChild(medalEl)

    const targetsEl = document.createElement('div')
    Object.assign(targetsEl.style, {
      fontSize: '13px',
      opacity: '0.7',
      marginBottom: '24px'
    })
    const { gold, silver, bronze } = RACE_CONFIG.medals
    targetsEl.textContent = `Gold ${gold}s · Silver ${silver}s · Bronze ${bronze}s`
    this.resultsEl.appendChild(targetsEl)

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
        fontWeight: 'bold',
        fontFamily: 'sans-serif',
        pointerEvents: 'auto',
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
    if (this.comboBreakTimeout) {
      clearTimeout(this.comboBreakTimeout)
      this.comboBreakTimeout = null
    }
    this.container.remove()
    const styleEl = document.getElementById(STYLE_ID)
    if (styleEl) styleEl.remove()
  }
}
