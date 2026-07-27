import {
  importCharacterCampaignSlice,
  type CharacterCampaignSlice
} from '@weaver/character-engine'
import {
  importCivilizationCampaignSlice,
  type CivilizationCampaignSlice
} from '@weaver/civilization-engine'
import {
  importEnemyCampaignSlice,
  type EnemyCampaignSlice
} from '@weaver/enemy-engine'
import {
  importItemCampaignSlice,
  type ItemCampaignSlice
} from '@weaver/item-engine'
import {
  importNpcCampaignSlice,
  type NpcCampaignSlice
} from '@weaver/npc-engine'
import {
  importQuestCampaignSlice,
  QUEST_SLICE_VERSION,
  type QuestCampaignSlice
} from '@weaver/quest-engine'
import {
  importRegionalCampaignSlice,
  type RegionalCampaignSlice
} from '@weaver/regional-engine'
import {
  importWorldCampaignSlice,
  type WorldCampaignSlice
} from '@weaver/world-engine'
import type { CampaignPortabilityDeps } from './exportCampaign.js'
import { createDefaultCampaignPortabilityDeps } from './exportCampaign.js'
import { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'
import {
  PortabilitySchemaError,
  type CampaignPortablePackage,
  type CampaignPortablePackageInput,
  type CampaignPortablePackageV1,
  type CampaignPortabilityContext
} from './types.js'

export type ImportCampaignPackageInput = {
  dataRoot: string
  package: CampaignPortablePackageInput
}

export type CampaignImportDeps = CampaignPortabilityDeps & {
  world: CampaignPortabilityDeps['world'] & {
    importCampaignSlice: (
      ctx: CampaignPortabilityContext,
      slice: WorldCampaignSlice
    ) => void
  }
  regional: CampaignPortabilityDeps['regional'] & {
    importCampaignSlice: (
      ctx: CampaignPortabilityContext,
      slice: RegionalCampaignSlice
    ) => void
  }
  civilization: CampaignPortabilityDeps['civilization'] & {
    importCampaignSlice: (
      ctx: CampaignPortabilityContext,
      slice: CivilizationCampaignSlice
    ) => void
  }
  npc: CampaignPortabilityDeps['npc'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: NpcCampaignSlice) => void
  }
  enemy: CampaignPortabilityDeps['enemy'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: EnemyCampaignSlice) => void
  }
  character: CampaignPortabilityDeps['character'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: CharacterCampaignSlice) => void
  }
  item: CampaignPortabilityDeps['item'] & {
    importCampaignSlice: (
      ctx: { campaignId: string; characterIds: readonly string[] },
      slice: ItemCampaignSlice
    ) => void
  }
  quest: CampaignPortabilityDeps['quest'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: QuestCampaignSlice) => void
  }
}

export function importCampaignPackage(
  deps: CampaignImportDeps,
  input: ImportCampaignPackageInput
): void {
  const pkg = normalizePackage(input.package)
  assertCampaignIdMatch(pkg.campaignId, pkg)

  const worldId = deps.resolveWorldId(pkg.campaignId)
  const worldCtx: CampaignPortabilityContext = {
    dataRoot: input.dataRoot,
    campaignId: pkg.campaignId,
    worldId
  }
  const campaignCtx = { campaignId: pkg.campaignId }

  deps.world.importCampaignSlice(worldCtx, pkg.slices.world)
  deps.regional.importCampaignSlice(worldCtx, pkg.slices.regional)
  deps.civilization.importCampaignSlice(worldCtx, pkg.slices.civilization)
  deps.npc.importCampaignSlice(campaignCtx, pkg.slices.npc)
  deps.enemy.importCampaignSlice(campaignCtx, pkg.slices.enemy)
  deps.character.importCampaignSlice(campaignCtx, pkg.slices.character)
  deps.item.importCampaignSlice(
    {
      campaignId: pkg.campaignId,
      characterIds: pkg.slices.character.characterIds
    },
    pkg.slices.item
  )
  deps.quest.importCampaignSlice(campaignCtx, pkg.slices.quest)
}

export function createDefaultCampaignImportDeps(
  overrides: Partial<CampaignImportDeps> = {}
): CampaignImportDeps {
  const base = createDefaultCampaignPortabilityDeps(overrides)
  return {
    ...base,
    world: withImport(base.world, overrides.world, importWorldCampaignSlice),
    regional: withImport(base.regional, overrides.regional, importRegionalCampaignSlice),
    civilization: withImport(
      base.civilization,
      overrides.civilization,
      importCivilizationCampaignSlice
    ),
    npc: withImport(base.npc, overrides.npc, importNpcCampaignSlice),
    enemy: withImport(base.enemy, overrides.enemy, importEnemyCampaignSlice),
    character: withImport(base.character, overrides.character, importCharacterCampaignSlice),
    item: withImport(base.item, overrides.item, importItemCampaignSlice),
    quest: withImport(base.quest, overrides.quest, importQuestCampaignSlice)
  }
}

function withImport<TExport, TImport>(
  base: { exportCampaignSlice: TExport },
  override:
    | {
        exportCampaignSlice?: TExport
        importCampaignSlice?: TImport
      }
    | undefined,
  defaultImport: TImport
): { exportCampaignSlice: TExport; importCampaignSlice: TImport } {
  return {
    exportCampaignSlice: override?.exportCampaignSlice ?? base.exportCampaignSlice,
    importCampaignSlice: override?.importCampaignSlice ?? defaultImport
  }
}

function normalizePackage(pkg: CampaignPortablePackageInput): CampaignPortablePackage {
  if (pkg.version === PORTABLE_PACKAGE_VERSION) {
    return pkg as CampaignPortablePackage
  }
  if (pkg.version === 1) {
    return adaptV1ToCurrent(pkg as CampaignPortablePackageV1)
  }
  throw new PortabilitySchemaError(
    `Unsupported portable package version ${String(pkg.version)}; expected ${PORTABLE_PACKAGE_VERSION}`
  )
}

function adaptV1ToCurrent(pkg: CampaignPortablePackageV1): CampaignPortablePackage {
  return {
    version: PORTABLE_PACKAGE_VERSION,
    campaignId: pkg.campaignId,
    exportedAt: pkg.exportedAt,
    slices: {
      ...pkg.slices,
      quest: {
        sliceVersion: QUEST_SLICE_VERSION,
        campaignId: pkg.campaignId,
        worldQuests: []
      }
    }
  }
}

function assertCampaignIdMatch(expectedCampaignId: string, pkg: CampaignPortablePackage): void {
  const slices = [
    pkg.slices.world.campaignId,
    pkg.slices.regional.campaignId,
    pkg.slices.civilization.campaignId,
    pkg.slices.npc.campaignId,
    pkg.slices.enemy.campaignId,
    pkg.slices.character.campaignId,
    pkg.slices.item.campaignId,
    pkg.slices.quest.campaignId
  ]
  for (const campaignId of slices) {
    if (campaignId !== expectedCampaignId) {
      throw new PortabilitySchemaError(
        `Portable package campaignId mismatch: expected ${expectedCampaignId}, found ${campaignId}`
      )
    }
  }
}
