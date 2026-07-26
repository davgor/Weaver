import { beforeEach, describe, expect, it } from 'vitest'
import { clearNpcPlaceholderStore, ensureNpcPlaceholders } from '@weaver/civilization-engine'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { clearNpcStore, npcEngine } from './index.js'

const EXPECTED_ENDPOINTS = [
  'constructNpc',
  'appendNpcMemory',
  'queryNpcGroundingContext',
  'createFaction',
  'upsertNpcOpinion',
  'listNpcOpinionsHeldBy',
  'listNpcOpinionsAbout',
  'selectSocialResponders',
  'requestNpcPortrait'
] as const

function resetEndpointTestState() {
  clearNpcStore()
  clearNpcPlaceholderStore()
  setCampaignRaceRoster('campaign-endpoints', [{ raceId: 'human', name: 'Human' }])
}

describe('@weaver/npc-engine', () => {
  beforeEach(resetEndpointTestState)

  it('reports healthy', () => {
    const health = npcEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/npc-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = npcEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
    expect(endpoints.map((endpoint) => endpoint.name)).toEqual(
      expect.arrayContaining([...EXPECTED_ENDPOINTS])
    )
  })

  it('invokes the health endpoint', async () => {
    const result = await npcEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/npc-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await npcEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/npc-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(npcEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('invokes construction through the endpoint call pattern', async () => {
    const result = await constructNpcViaEndpoint()
    expect(result).toMatchObject({
      npcId: 'npc-endpoint',
      identity: { race: { name: 'Human' }, alignment: 'neutral' }
    })
  })
})

async function constructNpcViaEndpoint() {
  const [slot] = ensureNpcPlaceholders({
    worldId: 'world-endpoints',
    civilizationId: 'civ-endpoints',
    regionId: 'region-endpoints',
    roleHints: ['resident']
  })

  return npcEngine.call('constructNpc', {
    campaignId: 'campaign-endpoints',
    worldId: 'world-endpoints',
    npcId: 'npc-endpoint',
    placeholderSlotId: slot.slotId,
    raceId: 'human',
    alignment: 'neutral',
    temperament: 'curious',
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 }
  })
}
