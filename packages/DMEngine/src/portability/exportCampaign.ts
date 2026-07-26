import {
  exportCharacterCampaignSlice,
  type CharacterCampaignSlice
} from '@weaver/character-engine'
import {
  exportCivilizationCampaignSlice,
  type CivilizationCampaignSlice
} from '@weaver/civilization-engine'
import {
  exportEnemyCampaignSlice,
  type EnemyCampaignSlice
} from '@weaver/enemy-engine'
import {
  exportItemCampaignSlice,
  type ItemCampaignSlice
} from '@weaver/item-engine'
import {
  exportNpcCampaignSlice,
  type NpcCampaignSlice
} from '@weaver/npc-engine'
import {
  exportRegionalCampaignSlice,
  type RegionalCampaignSlice
} from '@weaver/regional-engine'
import {
  exportWorldCampaignSlice,
  type WorldCampaignSlice
} from '@weaver/world-engine'
import { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'
import type { CampaignPortablePackage, CampaignPortabilityContext } from './types.js'

export type CampaignPortabilityDeps = {
  resolveWorldId: (campaignId: string) => string
  now?: () => string
  world: {
    exportCampaignSlice: (
      ctx: CampaignPortabilityContext
    ) => WorldCampaignSlice
  }
  regional: {
    exportCampaignSlice: (
      ctx: CampaignPortabilityContext
    ) => RegionalCampaignSlice
  }
  civilization: {
    exportCampaignSlice: (
      ctx: CampaignPortabilityContext
    ) => CivilizationCampaignSlice
  }
  npc: {
    exportCampaignSlice: (ctx: { campaignId: string }) => NpcCampaignSlice
  }
  enemy: {
    exportCampaignSlice: (ctx: { campaignId: string }) => EnemyCampaignSlice
  }
  character: {
    exportCampaignSlice: (ctx: { campaignId: string }) => CharacterCampaignSlice
  }
  item: {
    exportCampaignSlice: (ctx: {
      campaignId: string
      characterIds: readonly string[]
    }) => ItemCampaignSlice
  }
}

export type ExportCampaignPackageInput = {
  dataRoot: string
  campaignId: string
}

export function exportCampaignPackage(
  deps: CampaignPortabilityDeps,
  input: ExportCampaignPackageInput
): CampaignPortablePackage {
  const worldId = deps.resolveWorldId(input.campaignId)
  const worldCtx: CampaignPortabilityContext = {
    dataRoot: input.dataRoot,
    campaignId: input.campaignId,
    worldId
  }
  const characterSlice = deps.character.exportCampaignSlice({ campaignId: input.campaignId })
  return {
    version: PORTABLE_PACKAGE_VERSION,
    campaignId: input.campaignId,
    exportedAt: deps.now?.() ?? new Date().toISOString(),
    slices: {
      world: deps.world.exportCampaignSlice(worldCtx),
      regional: deps.regional.exportCampaignSlice(worldCtx),
      civilization: deps.civilization.exportCampaignSlice(worldCtx),
      npc: deps.npc.exportCampaignSlice({ campaignId: input.campaignId }),
      enemy: deps.enemy.exportCampaignSlice({ campaignId: input.campaignId }),
      character: characterSlice,
      item: deps.item.exportCampaignSlice({
        campaignId: input.campaignId,
        characterIds: characterSlice.characterIds
      })
    }
  }
}

export function createDefaultCampaignPortabilityDeps(
  overrides: Partial<CampaignPortabilityDeps> = {}
): CampaignPortabilityDeps {
  return {
    resolveWorldId: (campaignId) => campaignId,
    world: { exportCampaignSlice: exportWorldCampaignSlice },
    regional: { exportCampaignSlice: exportRegionalCampaignSlice },
    civilization: { exportCampaignSlice: exportCivilizationCampaignSlice },
    npc: { exportCampaignSlice: exportNpcCampaignSlice },
    enemy: { exportCampaignSlice: exportEnemyCampaignSlice },
    character: { exportCampaignSlice: exportCharacterCampaignSlice },
    item: { exportCampaignSlice: exportItemCampaignSlice },
    ...overrides
  }
}
