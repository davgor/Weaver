import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  civilizationEngine,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import { clearEnemyStore, generateEncounterFoes, listBestiary } from '@weaver/enemy-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import {
  addNpcToFaction,
  clearFactionStore,
  clearNpcStore,
  constructNpc,
  createFaction
} from '@weaver/npc-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { worldEngine } from '@weaver/world-engine'
import { createCampaign } from '../../persistence/campaignPersistence.js'
import { runCampaignGeneration } from '../pipeline.js'
import type { CampaignGenerationDeps } from '../types.js'

const roots: string[] = []

beforeEach(() => {
  clearNpcStore()
  clearFactionStore()
  clearEnemyStore()
  clearNpcPlaceholderStore()
})

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('DMEngine campaign generation peer persistence contract', () => {
  it('persists through real World/Regional/Civilization/NPC/Enemy/Campaign APIs', async () => {
    const root = tempRoot()
    const campaignId = 'campaign-peer-contract'
    setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])

    const result = await runCampaignGeneration({
      campaignId,
      dataRoot: join(root, 'data'),
      campaignFilePath: join(root, 'campaign.sqlite'),
      regionCount: 1,
      npcsPerRegion: 1,
      seed: 'peer-contract',
      maxSeedRetries: 1
    }, realDeps(scriptedCompleter()))

    expect(worldEngine.hasWorld(join(root, 'data'), result.worldId)).toBe(true)
    expect(result.regions).toHaveLength(1)
    expect(result.civilizations.length).toBeGreaterThan(0)
    expect(result.npcs).toHaveLength(1)
    expect(result.foes).toHaveLength(1)
    expect(result.catalogEntries.map((entry) => entry.id)).toEqual([
      'summary',
      'canon',
      'story',
      'bestiary'
    ])
    expect(existsSync(join(root, 'campaign.sqlite'))).toBe(true)
  })
})

function realDeps(completer: TextCompleter): CampaignGenerationDeps {
  return {
    narration: { fillAndValidate },
    completer,
    world: worldEngine,
    regional: regionalEngine,
    civilization: { fillCivilizations: civilizationEngine.fillCivilizations, ensureNpcPlaceholders },
    npc: { constructNpc, createFaction, addNpcToFaction },
    enemy: { listBestiary, generateEncounterFoes },
    campaign: { createCampaign }
  }
}

function scriptedCompleter(): TextCompleter {
  return {
    async completeText() {
      return {
        backend: 'contract',
        text: [
          '<<<CANON>>>Canon: the road bells mark safe passage.<<</CANON>>>',
          '<<<PANTHEON>>>Pantheon: saints of lantern, river, and ash.<<</PANTHEON>>>',
          '<<<WORLD_SUMMARY>>>World: forest hills around old trade roads.<<</WORLD_SUMMARY>>>',
          '<<<FACTION_NAME>>>Lantern Cartographers<<</FACTION_NAME>>>',
          '<<<FACTION_PURPOSE>>>Map safe routes through waking roads.<<</FACTION_PURPOSE>>>',
          '<<<REGION_GUIDANCE>>>Regions should emphasize roads, forests, and crossings.<<</REGION_GUIDANCE>>>',
          '<<<NPC_STYLE>>>Name: Mira Bell\nRace: human\nAlignment: neutral\nTemperament: curious<<</NPC_STYLE>>>',
          '<<<BESTIARY_FLAVOR>>>Bestiary: road bells unsettle ambushers.<<</BESTIARY_FLAVOR>>>',
          '<<<STORY_PREMISE>>>Story: recover the first lantern before dawn.<<</STORY_PREMISE>>>',
          '<<<PERSIST_SUMMARY>>>Persist: validated campaign catalog is ready.<<</PERSIST_SUMMARY>>>'
        ].join('\n')
      }
    }
  }
}

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'dm-campaign-gen-contract-'))
  roots.push(root)
  return root
}
