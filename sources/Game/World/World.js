import * as THREE from 'three'
import Game from '../Game.js'
import Collectible from './Collectible.js'
import { WORLD_LAYOUT } from '../../../data/rooms.js'
import { CAREER_CONTENT } from '../../../data/content-map.js'
import { buildPGProps, getPGCollectibles } from './Rooms/PGRoom.js'
import { buildBlackstoneProps, getBlackstoneCollectibles } from './Rooms/BlackstoneRoom.js'
import { buildAmazonProps, getAmazonCollectibles } from './Rooms/AmazonRoom.js'
import { buildHubProps } from './Rooms/HubRoom.js'
import { toon, toonFlat } from '../Rendering/ToonMaterials.js'
import { PALETTE } from '../Rendering/Palette.js'

const ZONE_BUILDERS = {
  hub: { buildProps: buildHubProps },
  'career-pg': { buildProps: buildPGProps, collectibles: getPGCollectibles() },
  'career-blackstone': {
    buildProps: buildBlackstoneProps,
    collectibles: getBlackstoneCollectibles()
  },
  'career-amazon': { buildProps: buildAmazonProps, collectibles: getAmazonCollectibles() }
}

export default class World {
  constructor() {
    this.game = Game.getInstance()
    this.group = new THREE.Group()
    this.zones = []
    this.collectibles = []
    this.activeRoomId = null
    this.collectiblesCollected = 0
    this.totalCollectibles = 0
    this.lastZoneId = null

    this.buildFloor()
    this.buildZones()
    this.buildPaths()
    this.buildBoundaryWalls()
    this.countCollectibles()

    this.game.scene.add(this.group)

    if (this.game.debug.spawnRoom) {
      this.enterRoom(this.game.debug.spawnRoom)
    } else {
      this.activeRoomId = 'hub'
      this.lastZoneId = 'hub'
    }

    this.game.ticker.events.on('tick', (_delta, elapsed) => this.update(elapsed), 5)
  }

  buildFloor() {
    const size = WORLD_LAYOUT.floorSize
    const floorGeo = new THREE.PlaneGeometry(size, size, 1, 1)
    const floorMat = toonFlat('grass')
    const floor = new THREE.Mesh(floorGeo, floorMat)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -0.01
    floor.receiveShadow = true
    this.group.add(floor)

    const pathMat = toonFlat('path')
    for (let i = -20; i <= 20; i += 4) {
      const hGeo = new THREE.BoxGeometry(size, 0.01, 0.3)
      const h = new THREE.Mesh(hGeo, pathMat)
      h.position.set(0, 0.005, i)
      this.group.add(h)

      const vGeo = new THREE.BoxGeometry(0.3, 0.01, size)
      const v = new THREE.Mesh(vGeo, pathMat)
      v.position.set(i, 0.005, 0)
      this.group.add(v)
    }
  }

  buildZones() {
    for (const zone of WORLD_LAYOUT.zones) {
      const zoneGroup = new THREE.Group()
      zoneGroup.position.set(zone.position.x, 0, zone.position.z)

      this.buildZonePlatform(zoneGroup, zone)

      const builder = ZONE_BUILDERS[zone.id]
      if (builder) {
        if (builder.buildProps) builder.buildProps(zoneGroup)
        if (builder.collectibles) {
          for (const c of builder.collectibles) {
            const collectible = new Collectible({
              ...c,
              x: c.x + zone.position.x,
              z: c.z + zone.position.z
            })
            this.collectibles.push(collectible)
            this.group.add(collectible.group)
          }
        }
      }

      this.group.add(zoneGroup)
      this.zones.push({ ...zone, group: zoneGroup })
    }
  }

  buildZonePlatform(zoneGroup, zone) {
    const r = zone.radius
    const zoneColor = zone.color || PALETTE.grass
    const platformGeo = new THREE.CylinderGeometry(r, r, 0.08, zone.locked ? 6 : 16)
    const platformMat = toon(zone.locked ? PALETTE.stoneDark : zoneColor)
    const platform = new THREE.Mesh(platformGeo, platformMat)
    platform.position.y = 0.04
    platform.receiveShadow = true
    zoneGroup.add(platform)

    const ringGeo = new THREE.TorusGeometry(r + 0.1, 0.06, 8, zone.locked ? 6 : 32)
    const ringMat = toon(zone.locked ? PALETTE.stone : zoneColor)
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.rotation.x = -Math.PI / 2
    ring.position.y = 0.09
    zoneGroup.add(ring)

    if (zone.locked) {
      const lockGeo = new THREE.BoxGeometry(0.5, 0.7, 0.2)
      const lockMat = toon(PALETTE.wood)
      const lock = new THREE.Mesh(lockGeo, lockMat)
      lock.position.y = 1
      zoneGroup.add(lock)
    }
  }

  buildPaths() {
    const hub = WORLD_LAYOUT.zones.find((z) => z.id === 'hub')
    const pathMat = toon('pathDark')

    for (const zone of WORLD_LAYOUT.zones) {
      if (zone.id === 'hub') continue
      const dx = zone.position.x - hub.position.x
      const dz = zone.position.z - hub.position.z
      const length = Math.sqrt(dx * dx + dz * dz)
      const angle = Math.atan2(dx, dz)

      const stripGeo = new THREE.BoxGeometry(0.8, 0.03, length)
      const strip = new THREE.Mesh(stripGeo, pathMat)
      strip.position.set(hub.position.x + dx / 2, 0.015, hub.position.z + dz / 2)
      strip.rotation.y = angle
      this.group.add(strip)
    }
  }

  buildBoundaryWalls() {
    if (!this.game.physics) return
    const half = WORLD_LAYOUT.floorSize / 2
    const thickness = 1
    this.game.physics.createWall(0, -half - thickness / 2, WORLD_LAYOUT.floorSize, thickness)
    this.game.physics.createWall(0, half + thickness / 2, WORLD_LAYOUT.floorSize, thickness)
    this.game.physics.createWall(-half - thickness / 2, 0, thickness, WORLD_LAYOUT.floorSize)
    this.game.physics.createWall(half + thickness / 2, 0, thickness, WORLD_LAYOUT.floorSize)
  }

  countCollectibles() {
    this.totalCollectibles = this.collectibles.length
    this.game.tracker.setTotal(this.totalCollectibles)
  }

  enterRoom(roomId) {
    const zone = this.zones.find((z) => z.id === roomId)
    if (zone) {
      this.game.player.mesh.position.set(zone.position.x, 0.3, zone.position.z)
      if (this.game.player.body) {
        this.game.player.body.setTranslation(
          { x: zone.position.x, y: 0.3, z: zone.position.z },
          true
        )
        this.game.player.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      }
      this.activeRoomId = roomId
      this.lastZoneId = roomId
      if (zone.contentKey && CAREER_CONTENT[zone.contentKey]) {
        this.game.panel.showRoomContent(CAREER_CONTENT[zone.contentKey])
      }
    } else {
      this.activeRoomId = roomId
    }
  }

  update(elapsed) {
    const playerPos = this.game.player.mesh.position

    for (const c of this.collectibles) {
      c.update(elapsed)
      c.checkPickup(playerPos)
    }

    let currentZone = null
    for (const zone of this.zones) {
      const dx = playerPos.x - zone.position.x
      const dz = playerPos.z - zone.position.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < zone.radius) {
        currentZone = zone
        break
      }
    }

    if (currentZone) {
      this.activeRoomId = currentZone.id
      if (currentZone.id !== this.lastZoneId) {
        this.lastZoneId = currentZone.id
        if (currentZone.contentKey && CAREER_CONTENT[currentZone.contentKey]) {
          this.game.panel.showRoomContent(CAREER_CONTENT[currentZone.contentKey])
        } else {
          this.game.panel.hide()
        }
      }
    } else {
      if (this.lastZoneId) {
        this.lastZoneId = null
        this.activeRoomId = null
        this.game.panel.hide()
      }
    }
  }
}
