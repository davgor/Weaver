import { describe, expect, it } from 'vitest'
import { buildPlayPlaceholders } from './buildPlayPlaceholders.js'

describe('buildPlayPlaceholders', () => {
  it('renders MC and background prompt labels from the VN contract', () => {
    const placeholders = buildPlayPlaceholders({
      campaignId: 'vn-1',
      mainCharacter: {
        name: 'David',
        personality: 'stubborn',
        appearance: 'coat'
      },
      beatText: 'Fog rolls over the dock.',
      mode: 'scene',
      speakerId: null,
      cast: [],
      mcStance: 'Standing',
      mcExpression: 'Angry'
    })
    expect(placeholders.map((row) => row.slot)).toEqual(['mc', 'background'])
    expect(placeholders[0]?.label).toBe("David's character, Standing, Angry")
    expect(placeholders[1]?.label.length).toBeGreaterThan(0)
  })

  it('includes NPC placeholder when a speaker is present', () => {
    const placeholders = buildPlayPlaceholders({
      campaignId: 'vn-1',
      mainCharacter: {
        name: 'David',
        personality: 'stubborn',
        appearance: 'coat'
      },
      beatText: 'The warden glares.',
      mode: 'npc',
      speakerId: 'npc-1',
      cast: [{ npcId: 'npc-1', displayName: 'Harbor Warden', role: 'mentor' }],
      npcExpression: 'Angry'
    })
    expect(placeholders.some((row) => row.slot === 'npc')).toBe(true)
    expect(placeholders.find((row) => row.slot === 'npc')?.label).toContain('Harbor Warden')
  })
})
