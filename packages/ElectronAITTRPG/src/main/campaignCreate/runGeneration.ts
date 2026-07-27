import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { setCampaignDeathMode, setCampaignRaceRoster } from '@weaver/character-engine'
import {
  civilizationEngine,
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import { clearEnemyStore, generateEncounterFoes, listBestiary } from '@weaver/enemy-engine'
import { getItemTemplateCatalog } from '@weaver/item-engine'
import {
  runCampaignGeneration,
  createCampaign,
  type CampaignGenerationDeps,
  type CampaignGenerationInput,
  type CampaignGenerationResult
} from '@weaver/dm-engine'
import { fillAndValidate } from '@weaver/narration-engine'
import {
  addNpcToFaction,
  clearFactionStore,
  clearNpcStore,
  constructNpc,
  createFaction
} from '@weaver/npc-engine'
import { clearQuestStores, seedWorldQuests } from '@weaver/quest-engine'
import { regionalEngine } from '@weaver/regional-engine'
import { worldEngine } from '@weaver/world-engine'
import type { CampaignCreateGenerationPort } from './campaignCreateService.js'

export type RunGenerationDeps = CampaignGenerationDeps

export function createLiveGenerationDeps(
  completer: CampaignGenerationDeps['completer']
): CampaignGenerationDeps {
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

export function createLiveGenerationPort(
  campaignsRoot: string,
  deps: CampaignGenerationDeps
): CampaignCreateGenerationPort {
  return {
    generate: (input) => invokeRunCampaignGeneration(input, deps),
    resolvePaths: (campaignId) => resolveCampaignPaths(campaignsRoot, campaignId),
    createCampaignId: () => `campaign-${randomUUID()}`,
    setCampaignDeathMode
  }
}

export async function invokeRunCampaignGeneration(
  input: CampaignGenerationInput,
  deps: CampaignGenerationDeps
): Promise<CampaignGenerationResult> {
  setCampaignRaceRoster(input.campaignId, [{ raceId: 'human', name: 'Human' }])
  return runCampaignGeneration(
    {
      ...input,
      maxSeedRetries: input.maxSeedRetries ?? 1,
      maxStageRetries: input.maxStageRetries ?? 1
    },
    deps
  )
}

export function resolveCampaignPaths(
  campaignsRoot: string,
  campaignId: string
): { dataRoot: string; campaignFilePath: string } {
  const root = join(campaignsRoot, campaignId)
  return {
    dataRoot: join(root, 'data'),
    campaignFilePath: join(root, 'campaign.sqlite')
  }
}

/** Deterministic labeled-block completer for contract/unit tests only. */
export function scriptedCampaignCompleter(): CampaignGenerationDeps['completer'] {
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

export function clearCampaignGenerationStores(): void {
  clearNpcStore()
  clearFactionStore()
  clearEnemyStore()
  clearNpcPlaceholderStore()
  clearQuestStores()
}
