import { describe, expect, it } from 'vitest'
import { buildVnBeatPlaceholders, type VnCharacterIdentitySeed } from '../index.js'

describe('buildVnBeatPlaceholders', () => {
  it('returns MC, NPC, and background placeholders with labels and full prompts', () => {
    const placeholders = buildVnBeatPlaceholders({
      mc: {
        identity: character('mc-david', 'David', 'silver-haired swordsman'),
        stance: 'Standing',
        expression: 'Angry'
      },
      npc: {
        identity: character('npc-mira', 'Mira', 'green-cloaked elven scout'),
        stance: 'Kneeling',
        expression: 'Sad'
      },
      background: {
        kind: 'preset',
        presetId: 'forest_path'
      }
    })

    expect(placeholders.map((placeholder) => placeholder.slot)).toEqual(['mc', 'npc', 'background'])
    expect(placeholders[0]).toMatchObject({
      slot: 'mc',
      label: "David's character, Standing, Angry"
    })
    expect(placeholders[1]).toMatchObject({
      slot: 'npc',
      label: "Mira's character, Kneeling, Sad"
    })
    expect(placeholders[2]).toMatchObject({
      slot: 'background',
      label: 'Forest path background'
    })
    expect(placeholders.every((placeholder) => placeholder.fullPrompt.length > 0)).toBe(true)
  })

  it('omits the NPC slot when a beat has no NPC', () => {
    const placeholders = buildVnBeatPlaceholders({
      mc: {
        identity: character('mc-david', 'David', 'silver-haired swordsman'),
        stance: 'Sitting',
        expression: 'Neutral'
      },
      background: {
        kind: 'adaptive',
        locationLabel: 'Old Bridge',
        sceneDescriptors: ['mossy stone arch', 'fog over shallow water']
      }
    })

    expect(placeholders.map((placeholder) => placeholder.slot)).toEqual(['mc', 'background'])
    expect(placeholders[1]?.fullPrompt).toContain('mossy stone arch')
  })
})

function character(
  characterKey: string,
  displayName: string,
  appearance: string
): VnCharacterIdentitySeed {
  return { characterKey, displayName, appearance }
}
