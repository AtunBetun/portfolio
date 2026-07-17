// Progress → act lookup and act-change detection. Pure logic — no three.js/DOM.

export function validateActs(acts) {
  if (!Array.isArray(acts) || acts.length === 0) {
    throw new Error('acts must be a non-empty array')
  }
  if (acts[0].start !== 0) {
    throw new Error(`acts must start at 0, got ${acts[0].start}`)
  }
  if (acts[acts.length - 1].end !== 1) {
    throw new Error(`acts must end at 1, got ${acts[acts.length - 1].end}`)
  }
  for (let i = 0; i < acts.length; i++) {
    const act = acts[i]
    if (act.start >= act.end) {
      throw new Error(`act "${act.id}" has start >= end`)
    }
    if (i > 0 && acts[i - 1].end !== act.start) {
      throw new Error(`gap or overlap between "${acts[i - 1].id}" and "${act.id}"`)
    }
    const [lo, hi] = act.bpmZone
    if (!(lo < hi)) {
      throw new Error(`act "${act.id}" has inverted bpmZone`)
    }
    if (act.surf) {
      for (const mark of act.surf.schedule) {
        if (mark < act.start || mark >= act.end) {
          throw new Error(`act "${act.id}" surf mark ${mark} outside [${act.start}, ${act.end})`)
        }
      }
      const [slo, shi] = act.surf.surgeZone
      if (!(slo < shi)) {
        throw new Error(`act "${act.id}" has inverted surgeZone`)
      }
    }
  }
  return true
}

export default class ActTrack {
  constructor(acts) {
    validateActs(acts)
    this.acts = acts
    this.index = 0
  }

  getActAt(progress) {
    for (let i = this.acts.length - 1; i >= 0; i--) {
      if (progress >= this.acts[i].start) return this.acts[i]
    }
    return this.acts[0]
  }

  get current() {
    return this.acts[this.index]
  }

  // Returns { changed, act, index }; changed is true the frame progress crosses
  // into a new act.
  update(progress) {
    const act = this.getActAt(progress)
    const index = this.acts.indexOf(act)
    const changed = index !== this.index
    this.index = index
    return { changed, act, index }
  }

  reset() {
    this.index = 0
  }
}
