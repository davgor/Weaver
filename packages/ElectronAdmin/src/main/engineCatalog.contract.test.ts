import { describe, expect, it } from 'vitest'
import { buildCatalog } from './engineDispatch.js'
import { adminEngines } from './engines.js'

const WAVE_FIVE_ENGINE_IDS = [
  'CharacterEngine',
  'CombatEngine',
  'ItemEngine',
  'NPCEngine',
  'EnemyEngine',
  'DMEngine',
  'NarrationEngine'
] as const

const SAMPLE_ENDPOINTS: Record<(typeof WAVE_FIVE_ENGINE_IDS)[number], string> = {
  CharacterEngine: 'resolveAbilityCheck',
  CombatEngine: 'encounter.start',
  ItemEngine: 'defineTemplate',
  NPCEngine: 'constructNpc',
  EnemyEngine: 'listBestiary',
  DMEngine: 'campaign.create',
  NarrationEngine: 'generatePortrait'
}

describe('ElectronAdmin engine catalog contract', () => {
  it('registers wave-five engines with real endpoints beyond health', () => {
    const catalog = buildCatalog(adminEngines)
    const byId = new Map(catalog.map((entry) => [entry.id, entry]))

    for (const engineId of WAVE_FIVE_ENGINE_IDS) {
      const entry = byId.get(engineId)
      expect(entry, `${engineId} missing from admin catalog`).toBeDefined()
      const endpointNames = entry?.endpoints.map((endpoint) => endpoint.name) ?? []
      expect(endpointNames).toContain('health')
      expect(endpointNames).toContain(SAMPLE_ENDPOINTS[engineId])
      expect(endpointNames.some((name) => name !== 'health')).toBe(true)
    }
  })

  it('includes LLMEngine usage and runtime review endpoints', () => {
    const catalog = buildCatalog(adminEngines)
    const llm = catalog.find((entry) => entry.id === 'LLMEngine')
    expect(llm?.endpoints.map((endpoint) => endpoint.name)).toEqual(
      expect.arrayContaining([
        'getStatus',
        'getModelSpec',
        'resolveBackend',
        'queryUsageByPurpose',
        'listUsageEvents'
      ])
    )
  })
})
