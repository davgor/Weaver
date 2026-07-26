import { describe, expect, it } from 'vitest'
import type { CausalEvent, CharacterSessionCursor, SessionRecapInput } from '@weaver/dm-engine'
import { createCampaignHubService, type CampaignHubDeps } from './campaignHubService.js'

describe('campaignHubService', () => {
  it('loads world preview, completed player characters, companions, and per-character recap', async () => {
    const recordedCursors: CharacterSessionCursor[] = []
    const service = createCampaignHubService(hubDeps({
      listCompletedCharacters: () => [
        { campaignId: 'camp-1', characterId: 'pc-1', characterName: 'Ilyra', phase: 'complete' }
      ],
      listCharacters: () => [
        { campaignId: 'camp-1', characterId: 'pc-1', characterName: 'Ilyra', phase: 'complete' }
      ],
      listCompanions: () => [{ characterId: 'wolf-1', name: 'Briar', archetype: 'Ranger' }],
      listCausalEvents: () => events(),
      getCharacterSessionCursor: () => ({ campaignId: 'camp-1', characterId: 'pc-1', lastSessionAt: 5 }),
      recordCharacterSessionCursor: (cursor) => {
        recordedCursors.push(cursor)
        return cursor
      },
      buildSessionRecap: (input: SessionRecapInput) => ({
        paragraphs: input.events.map((event) => `recap:${event.summary}`),
        eventIds: input.events.map((event) => event.id)
      })
    }))

    const hub = await service.loadHub('camp-1')
    expect(hub.worldPreview).toMatchObject({
      campaignName: 'Ash Road',
      summary: 'A road under ember skies.'
    })
    expect(hub.characters[0]).toMatchObject({
      characterId: 'pc-1',
      companions: [{ characterId: 'wolf-1', name: 'Briar', archetype: 'Ranger' }],
      recap: { paragraphs: ['recap:Won the bridge fight'], eventIds: ['evt-1'] }
    })
    expect(recordedCursors).toEqual([{ campaignId: 'camp-1', characterId: 'pc-1', lastSessionAt: 10 }])
  })

  it('creates the next onboarding request for adding another character', async () => {
    const service = createCampaignHubService(hubDeps({
      listCharacters: () => [
        { campaignId: 'camp-1', characterId: 'camp-1.pc1', characterName: 'Ilyra', phase: 'complete' }
      ]
    }))

    await expect(service.addCharacter('camp-1')).resolves.toEqual({
      campaignId: 'camp-1',
      characterId: 'camp-1.pc2',
      characterName: 'Adventurer 2'
    })
  })
})

function hubDeps(overrides: Partial<CampaignHubDeps> = {}): CampaignHubDeps {
  return {
    getReview: async () => review(),
    listCompletedCharacters: () => [],
    listCharacters: () => [],
    listCompanions: () => [],
    listCausalEvents: () => [],
    getCharacterSessionCursor: () => undefined,
    recordCharacterSessionCursor: (cursor) => cursor,
    buildSessionRecap: () => ({ paragraphs: [], eventIds: [] }),
    ...overrides
  }
}

function review() {
  return {
    campaignId: 'camp-1',
    campaignName: 'Ash Road',
    deathMode: 'standard' as const,
    generativeTokensEnabled: false,
    confirmed: true,
    status: 'ready' as const,
    canon: 'Canon',
    pantheon: 'Pantheon',
    worldSummary: 'A road under ember skies.',
    bestiaryFlavor: 'Ash beasts',
    storyPremise: 'Find the missing caravan.',
    regions: [{ regionId: 'r-1', displayName: 'Cinder Vale', summary: 'Black grass' }],
    npcs: [{ npcId: 'npc-1', regionId: 'r-1', displayName: 'Mira', summary: 'Guard captain' }],
    factions: []
  }
}

function events(): CausalEvent[] {
  return [
    {
      id: 'evt-1',
      campaignId: 'camp-1',
      actorCharacterId: 'pc-1',
      kind: 'combat',
      summary: 'Won the bridge fight',
      day: 2,
      seq: 1,
      at: 10
    }
  ]
}
