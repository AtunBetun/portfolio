export const ROOM_GRAPH = {
  hub: {
    id: 'hub',
    name: 'Hub',
    doors: [
      { id: 'door-career', target: 'career-pg', position: { x: 0, z: -4 }, label: 'Career' },
      {
        id: 'door-story',
        target: null,
        position: { x: -4, z: 0 },
        label: 'My Story',
        locked: true
      },
      {
        id: 'door-passions',
        target: null,
        position: { x: 4, z: 0 },
        label: 'Passions',
        locked: true
      }
    ],
    spawn: { x: 0, z: 2 },
    size: { width: 10, depth: 10 }
  },
  'career-pg': {
    id: 'career-pg',
    name: 'Procter & Gamble',
    doors: [
      { id: 'door-back-hub', target: 'hub', position: { x: 0, z: 4 }, label: 'Back' },
      {
        id: 'door-to-blackstone',
        target: 'career-blackstone',
        position: { x: 0, z: -4 },
        label: 'Next'
      }
    ],
    spawn: { x: 0, z: 2 },
    size: { width: 8, depth: 10 },
    wing: 'career',
    contentKey: 'pg'
  },
  'career-blackstone': {
    id: 'career-blackstone',
    name: 'Blackstone',
    doors: [
      { id: 'door-back-pg', target: 'career-pg', position: { x: 0, z: 4 }, label: 'Back' },
      {
        id: 'door-to-amazon',
        target: 'career-amazon',
        position: { x: 0, z: -4 },
        label: 'Next'
      }
    ],
    spawn: { x: 0, z: 2 },
    size: { width: 8, depth: 10 },
    wing: 'career',
    contentKey: 'blackstone'
  },
  'career-amazon': {
    id: 'career-amazon',
    name: 'Amazon',
    doors: [
      {
        id: 'door-back-blackstone',
        target: 'career-blackstone',
        position: { x: 0, z: 4 },
        label: 'Back'
      }
    ],
    spawn: { x: 0, z: 2 },
    size: { width: 8, depth: 10 },
    wing: 'career',
    contentKey: 'amazon'
  }
}
