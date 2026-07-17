import { PALETTE } from '../../Rendering/Palette.js'
import { RACE_CONFIG } from '../../../../data/race-config.js'

const toHex = (color) => `#${color.toString(16).padStart(6, '0')}`

const ACCENT = toHex(PALETTE.accent)
const STONE = toHex(PALETTE.stone)
const OCEAN_DEEP = toHex(PALETTE.oceanDeep)
const FATIGUE_RED = '#e74c3c'

const MEDAL_COLORS = {
  gold: '#ffd700',
  silver: '#c0c0c0',
  bronze: '#cd7f32'
}

// Fixed BPM scale for the tempo meter — the zone band slides within it,
// which is what teaches the player each act's new pace
const BPM_MIN = 40
const BPM_MAX = 180
const BPM_RANGE = BPM_MAX - BPM_MIN

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
@keyframes race-banner-show {
  0% { opacity: 0 }
  15% { opacity: 1 }
  70% { opacity: 1 }
  100% { opacity: 0 }
}
@keyframes race-telegraph-pulse {
  0% { transform: translateX(-50%) scale(1); opacity: 0.85 }
  50% { transform: translateX(-50%) scale(1.06); opacity: 1 }
  100% { transform: translateX(-50%) scale(1); opacity: 0.85 }
}
@keyframes race-stamina-pulse {
  0% { opacity: 1 }
  50% { opacity: 0.5 }
  100% { opacity: 1 }
}
.race-tempo-inzone {
  color: ${ACCENT} !important;
  text-shadow: 0 0 10px ${ACCENT}, 0 2px 4px rgba(0, 0, 0, 0.7) !important;
}
.race-needle-inzone {
  background: ${ACCENT} !important;
  box-shadow: 0 0 8px 2px ${ACCENT};
}
.race-needle-fatigued {
  background: ${FATIGUE_RED} !important;
  box-shadow: 0 0 8px 2px ${FATIGUE_RED};
}
.race-stamina-fatigued {
  animation: race-stamina-pulse 0.5s ease infinite;
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
`
  document.head.appendChild(styleEl)
}

export default class RaceHUD {
  constructor() {
    this.onRetry = null
    this.onExit = null
    this.onMuteToggle = null

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
    this.buildTempoMeter()
    this.buildStamina()
    this.buildBanner()
    this.buildTelegraph()
    this.buildCountdown()
    this.buildControls()
    this.buildMuteButton()
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
  }

  buildTimer() {
    this.timerEl = document.createElement('div')
    this.timerEl.setAttribute('data-race-timer', '')
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

  buildTempoMeter() {
    const wrap = document.createElement('div')
    Object.assign(wrap.style, {
      position: 'absolute',
      top: '52px',
      right: '24px',
      width: '220px',
      textAlign: 'right'
    })

    this.bpmReadout = document.createElement('div')
    this.bpmReadout.setAttribute('data-race-bpm', '')
    Object.assign(this.bpmReadout.style, {
      fontFamily: 'monospace',
      fontSize: '18px',
      fontWeight: 'bold',
      color: '#ffffff',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.7)',
      marginBottom: '4px',
      transition: 'color 0.2s ease'
    })
    this.bpmReadout.textContent = '— BPM'
    wrap.appendChild(this.bpmReadout)

    this.tempoTrack = document.createElement('div')
    Object.assign(this.tempoTrack.style, {
      position: 'relative',
      width: '220px',
      height: '14px',
      borderRadius: '7px',
      background: 'rgba(0, 0, 0, 0.45)',
      overflow: 'hidden'
    })

    // Zone band — slides/resizes on act change to announce the new pace
    this.zoneBand = document.createElement('div')
    Object.assign(this.zoneBand.style, {
      position: 'absolute',
      top: '0',
      height: '100%',
      background: ACCENT,
      opacity: '0.35',
      transition: 'left 0.8s ease, width 0.8s ease'
    })
    this.tempoTrack.appendChild(this.zoneBand)

    // Needle — the player's current BPM
    this.needle = document.createElement('div')
    Object.assign(this.needle.style, {
      position: 'absolute',
      top: '0',
      width: '3px',
      height: '100%',
      background: '#ffffff',
      left: '0%',
      transition: 'left 0.12s linear'
    })
    this.tempoTrack.appendChild(this.needle)

    wrap.appendChild(this.tempoTrack)
    this.container.appendChild(wrap)
    this.tempoWrap = wrap
  }

  buildStamina() {
    const wrap = document.createElement('div')
    Object.assign(wrap.style, {
      position: 'absolute',
      top: '96px',
      right: '24px',
      width: '220px'
    })

    this.staminaTrack = document.createElement('div')
    this.staminaTrack.setAttribute('data-race-stamina', '')
    Object.assign(this.staminaTrack.style, {
      width: '220px',
      height: '8px',
      borderRadius: '4px',
      background: 'rgba(0, 0, 0, 0.45)',
      overflow: 'hidden'
    })

    this.staminaBar = document.createElement('div')
    Object.assign(this.staminaBar.style, {
      width: '100%',
      height: '100%',
      background: ACCENT,
      transition: 'width 0.15s linear, background 0.3s ease'
    })
    this.staminaTrack.appendChild(this.staminaBar)
    wrap.appendChild(this.staminaTrack)
    this.container.appendChild(wrap)
  }

  buildBanner() {
    this.bannerEl = document.createElement('div')
    Object.assign(this.bannerEl.style, {
      position: 'absolute',
      top: '34%',
      left: '0',
      width: '100%',
      textAlign: 'center',
      opacity: '0',
      pointerEvents: 'none'
    })

    this.bannerTitle = document.createElement('div')
    Object.assign(this.bannerTitle.style, {
      fontSize: '48px',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      color: '#ffffff',
      textShadow: '0 4px 12px rgba(0, 0, 0, 0.8)'
    })
    this.bannerEl.appendChild(this.bannerTitle)

    this.bannerHint = document.createElement('div')
    Object.assign(this.bannerHint.style, {
      fontSize: '18px',
      marginTop: '6px',
      color: '#ffffff',
      opacity: '0.9',
      textShadow: '0 2px 6px rgba(0, 0, 0, 0.8)'
    })
    this.bannerEl.appendChild(this.bannerHint)

    this.container.appendChild(this.bannerEl)
  }

  buildTelegraph() {
    this.telegraphEl = document.createElement('div')
    this.telegraphEl.setAttribute('data-race-telegraph', '')
    Object.assign(this.telegraphEl.style, {
      position: 'absolute',
      bottom: '25%',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '26px',
      fontWeight: 'bold',
      fontStyle: 'italic',
      textTransform: 'uppercase',
      color: '#ffffff',
      textShadow: `0 0 14px ${ACCENT}, 0 2px 6px rgba(0, 0, 0, 0.8)`,
      whiteSpace: 'nowrap',
      display: 'none'
    })
    this.container.appendChild(this.telegraphEl)
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
      bottom: '48px',
      left: '50%',
      transform: 'translateX(-50%)',
      fontSize: '14px',
      color: '#ffffff',
      opacity: '0.9',
      textShadow: '0 1px 4px rgba(0, 0, 0, 0.8)',
      whiteSpace: 'nowrap',
      transition: 'opacity 0.6s ease'
    })
    this.controlsEl.textContent = 'A / D alternate strokes  •  Match the drum'
    this.container.appendChild(this.controlsEl)
  }

  hideControls() {
    if (this.controlsEl) {
      this.controlsEl.style.opacity = '0'
    }
  }

  buildMuteButton() {
    this.muteBtn = document.createElement('button')
    Object.assign(this.muteBtn.style, {
      position: 'absolute',
      top: '14px',
      left: '16px',
      width: '36px',
      height: '36px',
      borderRadius: '8px',
      border: 'none',
      background: 'rgba(0, 0, 0, 0.4)',
      color: '#ffffff',
      fontSize: '18px',
      cursor: 'pointer',
      pointerEvents: 'auto'
    })
    this.muteBtn.textContent = '🔊'
    this.muteBtn.addEventListener('click', (event) => {
      event.stopPropagation()
      if (this.onMuteToggle) {
        this.onMuteToggle()
      }
    })
    this.container.appendChild(this.muteBtn)
  }

  setMuted(muted) {
    if (this.muteBtn) {
      this.muteBtn.textContent = muted ? '🔇' : '🔊'
    }
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

  bpmToPercent(bpm) {
    const t = (bpm - BPM_MIN) / BPM_RANGE
    return Math.min(Math.max(t, 0), 1) * 100
  }

  updateTempo(bpm, zone, inZone, fatigued = false) {
    this.bpmReadout.textContent = bpm > 0 ? `${Math.round(bpm)} BPM` : '— BPM'
    this.bpmReadout.classList.toggle('race-tempo-inzone', inZone)

    this.needle.style.left = `calc(${this.bpmToPercent(bpm)}% - 1.5px)`
    this.needle.classList.toggle('race-needle-inzone', inZone && !fatigued)
    this.needle.classList.toggle('race-needle-fatigued', fatigued)

    this.moveTempoZone(zone)
  }

  moveTempoZone([lo, hi]) {
    const left = this.bpmToPercent(lo)
    const width = this.bpmToPercent(hi) - left
    this.zoneBand.style.left = left + '%'
    this.zoneBand.style.width = width + '%'
  }

  updateStamina(value, fatigued) {
    this.staminaBar.style.width = value * 100 + '%'
    this.staminaBar.style.background = fatigued || value < 0.3 ? FATIGUE_RED : ACCENT
    this.staminaBar.classList.toggle('race-stamina-fatigued', fatigued)
  }

  showActBanner(name, hint) {
    this.bannerTitle.textContent = name
    this.bannerHint.textContent = hint || ''
    this.bannerEl.style.animation = 'none'
    void this.bannerEl.offsetWidth
    this.bannerEl.style.animation = 'race-banner-show 2.2s ease forwards'
  }

  showTelegraph(state) {
    this.telegraphEl.textContent = state === 'surfing' ? 'RIDE IT!' : 'SWELL INCOMING — SURGE!'
    this.telegraphEl.style.display = 'block'
    this.telegraphEl.style.animation =
      state === 'surfing' ? 'none' : 'race-telegraph-pulse 0.6s ease infinite'
  }

  hideTelegraph() {
    this.telegraphEl.style.display = 'none'
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
    this.container.remove()
    const styleEl = document.getElementById(STYLE_ID)
    if (styleEl) styleEl.remove()
  }
}
