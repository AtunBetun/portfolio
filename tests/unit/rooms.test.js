import { describe, it, expect } from 'bun:test'
import { ROOM_GRAPH } from '../../data/rooms.js'

describe('room graph', () => {
  it('all rooms have required fields', () => {
    for (const [id, room] of Object.entries(ROOM_GRAPH)) {
      expect(room.id).toBe(id)
      expect(room.name).toBeDefined()
      expect(room.doors).toBeInstanceOf(Array)
      expect(room.spawn).toBeDefined()
      expect(room.size).toBeDefined()
    }
  })

  it('no orphan rooms — every room is reachable from hub', () => {
    const visited = new Set()
    const queue = ['hub']

    while (queue.length > 0) {
      const current = queue.shift()
      if (visited.has(current)) continue
      visited.add(current)

      const room = ROOM_GRAPH[current]
      for (const door of room.doors) {
        if (door.target && !visited.has(door.target)) {
          queue.push(door.target)
        }
      }
    }

    const allRooms = Object.keys(ROOM_GRAPH)
    for (const roomId of allRooms) {
      expect(visited.has(roomId)).toBe(true)
    }
  })

  it('all door targets point to existing rooms or null', () => {
    for (const room of Object.values(ROOM_GRAPH)) {
      for (const door of room.doors) {
        if (door.target !== null) {
          expect(ROOM_GRAPH[door.target]).toBeDefined()
        }
      }
    }
  })

  it('hub has exactly 3 doors', () => {
    expect(ROOM_GRAPH.hub.doors).toHaveLength(3)
  })
})
