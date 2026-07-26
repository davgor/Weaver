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
import { PortabilitySchemaError, type CampaignPortablePackage, type CampaignPortabilityContext } from './types.js'

export type ImportCampaignPackageInput = {
  dataRoot: string
  package: CampaignPortablePackage
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
}

export function importCampaignPackage(
  deps: CampaignImportDeps,
  input: ImportCampaignPackageInput
): void {
  assertPackageVersion(input.package)
  assertCampaignIdMatch(input.package.campaignId, input.package)

  const worldId = deps.resolveWorldId(input.package.campaignId)
  const worldCtx: CampaignPortabilityContext = {
    dataRoot: input.dataRoot,
    campaignId: input.package.campaignId,
    worldId
  }
  const campaignCtx = { campaignId: input.package.campaignId }

  deps.world.importCampaignSlice(worldCtx, input.package.slices.world)
  deps.regional.importCampaignSlice(worldCtx, input.package.slices.regional)
  deps.civilization.importCampaignSlice(worldCtx, input.package.slices.civilization)
  deps.npc.importCampaignSlice(campaignCtx, input.package.slices.npc)
  deps.enemy.importCampaignSlice(campaignCtx, input.package.slices.enemy)
  deps.character.importCampaignSlice(campaignCtx, input.package.slices.character)
  deps.item.importCampaignSlice(
    {
      campaignId: input.package.campaignId,
      characterIds: input.package.slices.character.characterIds
    },
    input.package.slices.item
  )
}

export function createDefaultCampaignImportDeps(
  overrides: Partial<CampaignImportDeps> = {}
): CampaignImportDeps {
  const base = createDefaultCampaignPortabilityDeps(overrides)
  return {
    ...base,
    world: {
      exportCampaignSlice: overrides.world?.exportCampaignSlice ?? base.world.exportCampaignSlice,
      importCampaignSlice: overrides.world?.importCampaignSlice ?? importWorldCampaignSlice
    },
    regional: {
      exportCampaignSlice: overrides.regional?.exportCampaignSlice ?? base.regional.exportCampaignSlice,
      importCampaignSlice: overrides.regional?.importCampaignSlice ?? importRegionalCampaignSlice
    },
    civilization: {
      exportCampaignSlice:
        overrides.civilization?.exportCampaignSlice ?? base.civilization.exportCampaignSlice,
      importCampaignSlice:
        overrides.civilization?.importCampaignSlice ?? importCivilizationCampaignSlice
    },
    npc: {
      exportCampaignSlice: overrides.npc?.exportCampaignSlice ?? base.npc.exportCampaignSlice,
      importCampaignSlice: overrides.npc?.importCampaignSlice ?? importNpcCampaignSlice
    },
    enemy: {
      exportCampaignSlice: overrides.enemy?.exportCampaignSlice ?? base.enemy.exportCampaignSlice,
      importCampaignSlice: overrides.enemy?.importCampaignSlice ?? importEnemyCampaignSlice
    },
    character: {
      exportCampaignSlice: overrides.character?.exportCampaignSlice ?? base.character.exportCampaignSlice,
      importCampaignSlice: overrides.character?.importCampaignSlice ?? importCharacterCampaignSlice
    },
    item: {
      exportCampaignSlice: overrides.item?.exportCampaignSlice ?? base.item.exportCampaignSlice,
      importCampaignSlice: overrides.item?.importCampaignSlice ?? importItemCampaignSlice
    }
  }
}

function assertPackageVersion(pkg: CampaignPortablePackage): void {
  if (pkg.version !== PORTABLE_PACKAGE_VERSION) {
    throw new PortabilitySchemaError(
      `Unsupported portable package version ${String(pkg.version)}; expected ${PORTABLE_PACKAGE_VERSION}`
    )
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
    pkg.slices.item.campaignId
  ]
  for (const campaignId of slices) {
    if (campaignId !== expectedCampaignId) {
      throw new PortabilitySchemaError(
        `Portable package campaignId mismatch: expected ${expectedCampaignId}, found ${campaignId}`
      )
    }
  }
}
