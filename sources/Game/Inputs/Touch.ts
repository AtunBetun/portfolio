import Game from '../Game.js'

export default class Touch {
  game: Game
  active: boolean = false
  direction: { x: number; z: number } = { x: 0, z: 0 }
  jumpPressed: boolean = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  joystick: any = null

  constructor() {
    this.game = Game.getInstance()

    const isTouchDevice =
      'ontouchstart' in window && (navigator.maxTouchPoints > 0 || 'ontouchend' in document)
    if (isTouchDevice) {
      this.init()
    }
  }

  async init(): Promise<void> {
    try {
      const nipplejs = (await import('nipplejs')).default
      this.active = true

      const zone = document.createElement('div')
      zone.style.cssText =
        'position:absolute;bottom:0;left:0;width:40%;height:50%;z-index:50;touch-action:none;'
      document.querySelector('.game')!.appendChild(zone)

      this.joystick = nipplejs.create({
        zone,
        mode: 'semi',
        catchDistance: 80,
        color: 'rgba(255, 215, 0, 0.4)',
        size: 100
      })

      this.joystick.on(
        'move',
        (_evt: unknown, data: { force: number; angle: { radian: number } }) => {
          const force = Math.min(data.force, 1)
          const angle = data.angle.radian
          this.direction.x = Math.cos(angle) * force
          this.direction.z = -Math.sin(angle) * force
        }
      )

      this.joystick.on('end', () => {
        this.direction.x = 0
        this.direction.z = 0
      })

      const jumpZone = document.createElement('div')
      jumpZone.style.cssText =
        'position:absolute;bottom:0;right:0;width:30%;height:40%;z-index:50;touch-action:none;'
      document.querySelector('.game')!.appendChild(jumpZone)
      jumpZone.addEventListener('touchstart', () => {
        this.jumpPressed = true
      })
      jumpZone.addEventListener('touchend', () => {
        this.jumpPressed = false
      })
    } catch (err) {
      console.warn('Touch controls failed to initialize:', (err as Error).message)
    }
  }
}
