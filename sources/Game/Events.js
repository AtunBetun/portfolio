export default class Events {
  constructor() {
    this.callbacks = {}
  }

  on(name, callback, order = 1) {
    if (!this.callbacks[name]) {
      this.callbacks[name] = {}
    }
    if (!this.callbacks[name][order]) {
      this.callbacks[name][order] = []
    }
    this.callbacks[name][order].push(callback)
  }

  off(name, callback) {
    if (!this.callbacks[name]) return
    for (const order in this.callbacks[name]) {
      const idx = this.callbacks[name][order].indexOf(callback)
      if (idx !== -1) {
        this.callbacks[name][order].splice(idx, 1)
        return
      }
    }
  }

  trigger(name, ...args) {
    if (!this.callbacks[name]) return
    for (const order in this.callbacks[name]) {
      for (const cb of this.callbacks[name][order]) {
        cb(...args)
      }
    }
  }
}
