export const WORLD_LAYOUT = {
  floorSize: 50,
  playerSpawn: { x: 7, y: 1, z: 5 },
  killPlaneY: -10,
  waterY: -0.45,
  zones: [
    {
      id: 'hub',
      name: 'Hub',
      position: { x: 0, z: 0 },
      radius: 4,
      contentKey: null
    },
    {
      id: 'career-bank',
      name: 'Career Bank',
      position: { x: -8, z: 2 },
      radius: 5,
      contentKey: 'career'
    },
    {
      id: 'landmark',
      name: 'Landmark Point',
      position: { x: 8, z: -5 },
      radius: 4,
      contentKey: null
    }
  ]
}

export const ROOM_GRAPH = WORLD_LAYOUT
