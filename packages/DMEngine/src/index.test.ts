import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  CAMPAIGN_GENERATION_STAGES,
  dmEngine,
  runCampaignGeneration,
  startGuidedIdentity
} from './index.js'

describe('@weaver/dm-engine core API', () => {
  it('reports healthy', () => {
    const health = dmEngine.health()
    expect(health.ok).toBe(true)
    expect(health.package).toBe('@weaver/dm-engine')
  })

  it('lists callable endpoints', () => {
    const endpoints = dmEngine.listEndpoints()
    expect(endpoints.length).toBeGreaterThan(0)
    expect(endpoints.some((e) => e.name === 'health')).toBe(true)
    expect(endpoints.some((e) => e.name === 'campaign.create')).toBe(true)
    expect(endpoints.some((e) => e.name === 'campaign.open')).toBe(true)
  })

  it('invokes the health endpoint', async () => {
    const result = await dmEngine.call('health')
    expect(result).toMatchObject({ ok: true, package: '@weaver/dm-engine' })
  })

  it('accepts an optional payload without breaking existing endpoints', async () => {
    const result = await dmEngine.call('health', { probe: true })
    expect(result).toMatchObject({ ok: true, package: '@weaver/dm-engine' })
  })

  it('rejects unknown endpoints', async () => {
    await expect(dmEngine.call('does-not-exist')).rejects.toThrow(/Unknown endpoint/)
  })

  it('exposes typed campaign create/open APIs', () => {
    expect(typeof dmEngine.createCampaign).toBe('function')
    expect(typeof dmEngine.openCampaign).toBe('function')
  })

})

describe('@weaver/dm-engine campaign endpoints', () => {
  const tempRoots: string[] = []

  afterEach(() => {
    for (const root of tempRoots) {
      rmSync(root, { force: true, recursive: true })
    }
    tempRoots.length = 0
  })

  it('creates and opens campaigns through admin endpoints without raw SQL endpoints', async () => {
    const filePath = campaignPath(tempRoots, 'admin.sqlite')
    const createResult = await dmEngine.call('campaign.create', { campaignId: 'admin', filePath })
    const openResult = await dmEngine.call('campaign.open', { campaignId: 'admin', filePath })
    const endpointText = dmEngine
      .listEndpoints()
      .map((endpoint) => `${endpoint.name} ${endpoint.description}`)
      .join('\n')

    expect(createResult).toMatchObject({ campaignId: 'admin', filePath, appliedMigrations: [1] })
    expect(openResult).toMatchObject({ campaignId: 'admin', filePath, appliedMigrations: [] })
    expect(endpointText).not.toMatch(/sql/i)
  })
})

describe('@weaver/dm-engine guided creation exports', () => {
  it('exports guided character-creation orchestration helpers', () => {
    expect(typeof startGuidedIdentity).toBe('function')
  })
})

describe('@weaver/dm-engine campaign generation exports', () => {
  it('exports campaign generation pipeline APIs', () => {
    expect(typeof runCampaignGeneration).toBe('function')
    expect(CAMPAIGN_GENERATION_STAGES).toEqual([
      'canon',
      'pantheon',
      'world',
      'factions',
      'regions',
      'npcs',
      'bestiary',
      'story',
      'persist'
    ])
  })
})

function campaignPath(roots: string[], filename: string): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-engine-api-'))
  roots.push(root)
  return join(root, filename)
}
