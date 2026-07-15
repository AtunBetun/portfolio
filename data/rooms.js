export const WORLD_LAYOUT = {
  floorSize: 50,
  playerSpawn: { x: 0, z: 0 },
  zones: [
    {
      id: 'hub',
      name: 'Hub',
      position: { x: 0, z: 0 },
      radius: 5,
      contentKey: null
    },
    {
      id: 'career-pg',
      name: 'Procter & Gamble',
      position: { x: 0, z: -14 },
      radius: 4,
      contentKey: 'pg',
      wing: 'career'
    },
    {
      id: 'career-blackstone',
      name: 'Blackstone',
      position: { x: -12, z: -14 },
      radius: 4,
      contentKey: 'blackstone',
      wing: 'career'
    },
    {
      id: 'career-amazon',
      name: 'Amazon',
      position: { x: 12, z: -14 },
      radius: 4,
      contentKey: 'amazon',
      wing: 'career'
    },
    {
      id: 'story',
      name: 'My Story',
      position: { x: -14, z: 0 },
      radius: 4,
      contentKey: null,
      locked: true
    },
    {
      id: 'passions',
      name: 'Passions',
      position: { x: 14, z: 0 },
      radius: 4,
      contentKey: null,
      locked: true
    }
  ]
}

export const ROOM_GRAPH = WORLD_LAYOUT
