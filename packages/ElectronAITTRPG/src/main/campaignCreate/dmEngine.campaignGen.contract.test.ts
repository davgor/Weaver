import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import { runCampaignGeneration } from '@weaver/dm-engine'
import {
  clearCampaignGenerationStores,
  createLiveGenerationDeps,
  invokeRunCampaignGeneration,
  scriptedCampaignCompleter
} from './runGeneration.js'

const roots: string[] = []

beforeEach(() => {
  clearCampaignGenerationStores()
})

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('DMEngine campaign generation contract (069)', () => {
  it(
    'invokes the real runCampaignGeneration export through the Electron adapter',
    async () => {
      const root = tempRoot()
      const campaignId = 'electron-campaign-gen-contract'
      setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])
      setCampaignRaceRoster(`${campaignId}-adapter`, [{ raceId: 'human', name: 'Human' }])
      const paths = {
        dataRoot: join(root, 'data'),
        campaignFilePath: join(root, 'campaign.sqlite')
      }

      const direct = await runCampaignGeneration(
        {
          campaignId,
          ...paths,
          regionCount: 1,
          npcsPerRegion: 1,
          seed: 'electron-contract',
          maxSeedRetries: 1,
          maxStageRetries: 1
        },
        createLiveGenerationDeps(scriptedCampaignCompleter())
      )

      const adapted = await invokeRunCampaignGeneration(
        {
          campaignId: `${campaignId}-adapter`,
          dataRoot: join(root, 'adapter-data'),
          campaignFilePath: join(root, 'adapter.sqlite'),
          regionCount: 1,
          npcsPerRegion: 1,
          seed: 'electron-contract-adapter'
        },
        createLiveGenerationDeps(scriptedCampaignCompleter())
      )

      expect(direct.regions).toHaveLength(1)
      expect(direct.npcs).toHaveLength(1)
      expect(direct.catalogEntries.map((entry) => entry.id)).toEqual([
        'summary',
        'canon',
        'story',
        'bestiary'
      ])
      expect(existsSync(paths.campaignFilePath)).toBe(true)
      expect(adapted.campaignId).toBe(`${campaignId}-adapter`)
      expect(adapted.worldSummary).toContain('World')
    },
    30_000
  )
})

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'electron-campaign-gen-'))
  roots.push(root)
  return root
}
