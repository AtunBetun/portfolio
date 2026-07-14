import { describe, it, expect } from 'bun:test'
import { LIFE_FACTS, CAREER_CONTENT } from '../../data/content-map.js'

describe('content-map', () => {
  it('every life fact has required fields', () => {
    for (const fact of LIFE_FACTS) {
      expect(fact.id).toBeDefined()
      expect(fact.fact).toBeDefined()
      expect(fact.wing).toBeDefined()
    }
  })

  it('career wing facts all have a mapped room and surface', () => {
    const careerFacts = LIFE_FACTS.filter((f) => f.wing === 'career')
    for (const fact of careerFacts) {
      expect(fact.room).not.toBeNull()
      expect(fact.surface).not.toBeNull()
    }
  })

  it('career content exists for every career room referenced in facts', () => {
    const careerRooms = LIFE_FACTS.filter((f) => f.wing === 'career').map((f) => f.room)
    for (const room of careerRooms) {
      expect(CAREER_CONTENT[room]).toBeDefined()
      expect(CAREER_CONTENT[room].title).toBeDefined()
      expect(CAREER_CONTENT[room].role).toBeDefined()
      expect(CAREER_CONTENT[room].achievements.length).toBeGreaterThan(0)
    }
  })

  it('no duplicate fact IDs', () => {
    const ids = LIFE_FACTS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
