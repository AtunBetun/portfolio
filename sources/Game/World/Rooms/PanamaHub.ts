import * as THREE from 'three'
import type Physics from '../../Physics.js'
import { buildBridge } from './districts/Bridge.js'
import { buildCareerBank } from './districts/CareerBank.js'
import { buildLandmark } from './districts/Landmark.js'

export function buildPanamaHub(group: THREE.Group, physics: Physics | null): THREE.Group {
  const hub = new THREE.Group()
  hub.name = 'panama-hub'

  const grid = physics ? physics.heightGrid : null

  buildBridge(hub, physics, grid)
  buildCareerBank(hub, physics, grid)
  buildLandmark(hub, physics, grid)

  group.add(hub)
  return hub
}
