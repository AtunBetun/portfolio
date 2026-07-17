import * as THREE from 'three'
import { buildBridge } from './districts/Bridge.js'
import { buildCareerBank, CHIMNEY_TOP, getFlagCloth } from './districts/CareerBank.js'
import { buildLandmark } from './districts/Landmark.js'
import { buildFlora } from './districts/Flora.js'

export function buildPanamaHub(group, physics) {
  const hub = new THREE.Group()
  hub.name = 'panama-hub'

  const grid = physics ? physics.heightGrid : null

  buildBridge(hub, physics, grid)
  buildCareerBank(hub, physics, grid)
  buildLandmark(hub, physics, grid)

  const flora = buildFlora(hub, physics, grid)

  group.add(hub)

  return {
    dynamicProps: flora.dynamicProps,
    bushes: flora.bushes,
    palmFronds: flora.palmFronds,
    flagCloth: getFlagCloth(),
    chimneyTop: CHIMNEY_TOP
  }
}
