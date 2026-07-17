export default class Controls {
  element: HTMLElement
  dismissed: boolean = false

  constructor() {
    this.element = document.querySelector('.js-controls') as HTMLElement

    window.addEventListener('keydown', () => this.dismiss(), { once: true })
  }

  dismiss(): void {
    if (this.dismissed) return
    this.dismissed = true
    this.element.classList.add('is-hidden')
  }
}
