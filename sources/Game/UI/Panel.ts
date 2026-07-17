import Game from '../Game.js'
import type { CareerEntry } from '../../../data/content-map.js'

export default class Panel {
  game: Game
  element: HTMLElement
  contentEl: HTMLElement
  closeBtn: HTMLElement
  visible: boolean = false

  constructor() {
    this.game = Game.getInstance()
    this.element = document.querySelector('.js-panel') as HTMLElement
    this.contentEl = document.querySelector('.js-panel-content') as HTMLElement
    this.closeBtn = document.querySelector('.js-panel-close') as HTMLElement

    this.closeBtn.addEventListener('click', () => this.hide())
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide()
    })
  }

  show(content: string): void {
    this.contentEl.innerHTML = content
    this.element.style.display = ''
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.element.classList.add('is-visible')
      })
    })
    this.visible = true
    this.game.keyboard.lock()
  }

  hide(): void {
    this.element.classList.remove('is-visible')
    this.visible = false
    this.game.keyboard.unlock()
    setTimeout(() => {
      if (!this.visible) {
        this.element.style.display = 'none'
      }
    }, 300)
  }

  showRoomContent(contentData: CareerEntry | null): void {
    if (!contentData) return

    const html = `
      <h2 style="color: ${contentData.color || 'var(--color-accent)'}">${contentData.title}</h2>
      <p><strong>${contentData.role}</strong> &middot; ${contentData.period}</p>
      ${contentData.achievements.map((a: string) => `<p>&#8226; ${a}</p>`).join('')}
    `
    this.show(html)
  }
}
