export default class Loading {
  constructor() {
    this.element = document.querySelector('.js-loading')
    this.barEl = document.querySelector('.js-loading-bar')
    this.progress = 0
  }

  setProgress(value) {
    this.progress = Math.min(value, 1)
    if (this.barEl) {
      this.barEl.style.width = `${this.progress * 100}%`
    }
  }

  hide() {
    this.setProgress(1)
    setTimeout(() => {
      if (this.element) this.element.classList.add('is-hidden')
    }, 300)
  }
}
