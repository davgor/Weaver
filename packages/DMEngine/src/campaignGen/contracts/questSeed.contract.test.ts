import { mkdtempSync, rmSync } from 'node:fs'
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
import { getItemTemplateCatalog } from '@weaver/item-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import {
  addNpcToFaction,
  clearFactionStore,
  clearNpcStore,
  constructNpc,
  createFaction
} from '@weaver/npc-engine'
import {
  clearQuestStores,
  listWorldQuests,
  seedWorldQuests
} from '@weaver/quest-engine'
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
  clearQuestStores()
})

afterEach(() => {
  while (roots.length > 0) {
    const root = roots.pop()
    if (root !== undefined) rmSync(root, { force: true, recursive: true })
  }
})

describe('DMEngine campaign-gen -> QuestEngine seed contract (102)', () => {
  it(
    'seeds world quests from peer pools via real seedWorldQuests',
    async () => {
      const root = tempRoot()
      const campaignId = 'campaign-quest-seed-contract'
      setCampaignRaceRoster(campaignId, [{ raceId: 'human', name: 'Human' }])

      const result = await runCampaignGeneration(
        {
          campaignId,
          dataRoot: join(root, 'data'),
          campaignFilePath: join(root, 'campaign.sqlite'),
          regionCount: 1,
          npcsPerRegion: 1,
          seed: 'quest-seed-contract',
          maxSeedRetries: 1
        },
        realDeps(scriptedCompleter())
      )

      const listed = listWorldQuests(campaignId)
      expect(listed.length).toBeGreaterThan(0)
      expect(result.quests).toEqual(listed)
      expect(result.quests[0]?.campaignId).toBe(campaignId)
      expect(result.quests[0]?.worldId).toBe(result.worldId)

      const npcIds = new Set(result.npcs.map((npc) => npc.npcId))
      const placeIds = new Set(result.civilizations.map((civ) => civ.civilizationId))
      const itemIds = new Set(getItemTemplateCatalog().map((template) => template.id))
      for (const quest of result.quests) {
        expect(quest.objectives.length).toBeGreaterThan(0)
        for (const objective of quest.objectives) {
          if (objective.kind === 'talk_to_npc') expect(npcIds.has(objective.targetId)).toBe(true)
          if (objective.kind === 'reach_place') expect(placeIds.has(objective.targetId)).toBe(true)
          if (objective.kind === 'obtain_item') expect(itemIds.has(objective.targetId)).toBe(true)
        }
      }
    },
    30_000
  )
})

function realDeps(completer: TextCompleter): CampaignGenerationDeps {
  return {
    narration: { fillAndValidate },
    completer,
    world: worldEngine,
    regional: regionalEngine,
    civilization: {
      fillCivilizations: civilizationEngine.fillCivilizations,
      ensureNpcPlaceholders
    },
    npc: { constructNpc, createFaction, addNpcToFaction },
    enemy: { listBestiary, generateEncounterFoes },
    campaign: { createCampaign },
    quest: {
      seedWorldQuests,
      listSeedItemIds: () => getItemTemplateCatalog().map((template) => template.id)
    }
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
  const root = mkdtempSync(join(tmpdir(), 'dm-campaign-quest-seed-'))
  roots.push(root)
  return root
}
