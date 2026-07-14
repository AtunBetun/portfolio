export default class Controls {
  constructor() {
    this.element = document.querySelector('.js-controls')
    this.dismissed = false

    window.addEventListener('keydown', () => this.dismiss(), { once: true })
  }

  dismiss() {
    if (this.dismissed) return
    this.dismissed = true
    this.element.classList.add('is-hidden')
  }
}
