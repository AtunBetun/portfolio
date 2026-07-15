import Game from '../Game.js'

export default class Touch {
  constructor() {
    this.game = Game.getInstance()
    this.active = false
    this.direction = { x: 0, z: 0 }

    const isTouchDevice =
      'ontouchstart' in window && (navigator.maxTouchPoints > 0 || 'ontouchend' in document)
    if (isTouchDevice) {
      this.init()
    }
  }

  async init() {
    try {
      const nipplejs = (await import('nipplejs')).default
      this.active = true

      const zone = document.createElement('div')
      zone.style.cssText =
        'position:absolute;bottom:0;left:0;width:40%;height:50%;z-index:50;touch-action:none;'
      document.querySelector('.game').appendChild(zone)

      this.joystick = nipplejs.create({
        zone,
        mode: 'semi',
        catchDistance: 80,
        color: 'rgba(0, 255, 65, 0.4)',
        size: 100
      })

      this.joystick.on('move', (_evt, data) => {
        const force = Math.min(data.force, 1)
        const angle = data.angle.radian
        this.direction.x = Math.cos(angle) * force
        this.direction.z = -Math.sin(angle) * force
      })

      this.joystick.on('end', () => {
        this.direction.x = 0
        this.direction.z = 0
      })
    } catch (err) {
      console.warn('Touch controls failed to initialize:', err.message)
    }
  }
}
