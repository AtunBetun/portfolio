// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void

type CallbackMap<T extends { [K in keyof T]: EventCallback }> = {
  [K in keyof T]?: Record<number, T[K][]>
}

export default class Events<
  T extends { [K in keyof T]: EventCallback } = Record<string, EventCallback>
> {
  callbacks: CallbackMap<T> = {}

  on<K extends keyof T>(name: K, callback: T[K], order: number = 1): void {
    if (!this.callbacks[name]) {
      this.callbacks[name] = {} as Record<number, T[K][]>
    }
    const bucket = this.callbacks[name]!
    if (!bucket[order]) {
      bucket[order] = []
    }
    bucket[order].push(callback)
  }

  off<K extends keyof T>(name: K, callback: T[K]): void {
    if (!this.callbacks[name]) return
    const bucket = this.callbacks[name]!
    for (const order in bucket) {
      const idx = bucket[order].indexOf(callback)
      if (idx !== -1) {
        bucket[order].splice(idx, 1)
        return
      }
    }
  }

  trigger<K extends keyof T>(name: K, ...args: Parameters<T[K]>): void {
    if (!this.callbacks[name]) return
    const bucket = this.callbacks[name]!
    for (const order in bucket) {
      for (const cb of bucket[order]) {
        cb(...args)
      }
    }
  }
}
