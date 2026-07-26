import { describe, expect, it } from 'vitest'
import { segmentPersonLinks } from './personLinks'

const PEOPLE = [
  {
    npcId: 'npc-mira',
    campaignId: 'campaign-1',
    displayName: 'Captain Mira'
  },
  {
    npcId: 'npc-orren',
    campaignId: 'campaign-1',
    displayName: 'Orren'
  }
] as const

describe('segmentPersonLinks', () => {
  it('segments Scene/Social text around known NPC display names', () => {
    const segments = segmentPersonLinks('Captain Mira warned Orren at dusk.', PEOPLE)

    expect(segments).toEqual([
      { kind: 'person', text: 'Captain Mira', person: PEOPLE[0] },
      { kind: 'text', text: ' warned ' },
      { kind: 'person', text: 'Orren', person: PEOPLE[1] },
      { kind: 'text', text: ' at dusk.' }
    ])
  })

  it('does not link names embedded inside longer words', () => {
    const segments = segmentPersonLinks('The captainate ignored Miraak, but Orren listened.', PEOPLE)

    expect(segments).toEqual([
      { kind: 'text', text: 'The captainate ignored Miraak, but ' },
      { kind: 'person', text: 'Orren', person: PEOPLE[1] },
      { kind: 'text', text: ' listened.' }
    ])
  })
})
