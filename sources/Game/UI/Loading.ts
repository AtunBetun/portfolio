export default class Loading {
  element: HTMLElement | null
  barEl: HTMLElement | null
  progress: number = 0

  constructor() {
    this.element = document.querySelector('.js-loading')
    this.barEl = document.querySelector('.js-loading-bar')
  }

  setProgress(value: number): void {
    this.progress = Math.min(value, 1)
    if (this.barEl) {
      this.barEl.style.width = `${this.progress * 100}%`
    }
  }

  hide(): void {
    this.setProgress(1)
    setTimeout(() => {
      if (this.element) this.element.classList.add('is-hidden')
    }, 300)
  }
}
