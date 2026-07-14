import Game from '../Game.js'

export default class Panel {
  constructor() {
    this.game = Game.getInstance()
    this.element = document.querySelector('.js-panel')
    this.contentEl = document.querySelector('.js-panel-content')
    this.closeBtn = document.querySelector('.js-panel-close')
    this.visible = false

    this.closeBtn.addEventListener('click', () => this.hide())
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.visible) this.hide()
    })
  }

  show(content) {
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

  hide() {
    this.element.classList.remove('is-visible')
    this.visible = false
    this.game.keyboard.unlock()
    setTimeout(() => {
      if (!this.visible) {
        this.element.style.display = 'none'
      }
    }, 300)
  }

  showRoomContent(contentData) {
    if (!contentData) return

    const html = `
      <h2 style="color: ${contentData.color || 'var(--color-accent)'}">${contentData.title}</h2>
      <p><strong>${contentData.role}</strong> &middot; ${contentData.period}</p>
      ${contentData.achievements.map((a) => `<p>&#8226; ${a}</p>`).join('')}
    `
    this.show(html)
  }
}
