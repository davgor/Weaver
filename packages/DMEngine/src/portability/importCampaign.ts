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
  importNarrationCampaignSlice,
  NARRATION_SLICE_VERSION,
  type NarrationCampaignSlice
} from '@weaver/narration-engine'
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
import {
  importOnboardingCampaignSlice,
  ONBOARDING_CAMPAIGN_SLICE_VERSION,
  type OnboardingCampaignSlice
} from '../persistence/repositories/sqliteOnboardingStore.js'
import type { CampaignPortabilityDeps } from './exportCampaign.js'
import { createDefaultCampaignPortabilityDeps } from './exportCampaign.js'
import { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'
import {
  PortabilitySchemaError,
  type CampaignPortablePackage,
  type CampaignPortablePackageInput,
  type CampaignPortablePackageV1,
  type CampaignPortablePackageV2,
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
  narration: CampaignPortabilityDeps['narration'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: NarrationCampaignSlice) => void
  }
  onboarding: CampaignPortabilityDeps['onboarding'] & {
    importCampaignSlice: (ctx: { campaignId: string }, slice: OnboardingCampaignSlice) => void
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
  deps.narration.importCampaignSlice(campaignCtx, pkg.slices.narration)
  deps.onboarding.importCampaignSlice(campaignCtx, pkg.slices.onboarding)
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
    quest: withImport(base.quest, overrides.quest, importQuestCampaignSlice),
    narration: withImport(base.narration, overrides.narration, importNarrationCampaignSlice),
    onboarding: withImport(base.onboarding, overrides.onboarding, importOnboardingCampaignSlice)
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
  if (pkg.version === 2) {
    return adaptV2ToCurrent(pkg as CampaignPortablePackageV2)
  }
  throw new PortabilitySchemaError(
    `Unsupported portable package version ${String(pkg.version)}; expected ${PORTABLE_PACKAGE_VERSION}`
  )
}

function adaptV1ToCurrent(pkg: CampaignPortablePackageV1): CampaignPortablePackage {
  return adaptV2ToCurrent({
    version: 2,
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
  })
}

function adaptV2ToCurrent(pkg: CampaignPortablePackageV2): CampaignPortablePackage {
  return {
    version: PORTABLE_PACKAGE_VERSION,
    campaignId: pkg.campaignId,
    exportedAt: pkg.exportedAt,
    slices: {
      ...pkg.slices,
      character: upgradeCharacterSlice(pkg.slices.character),
      item: upgradeItemSlice(pkg.slices.item),
      npc: upgradeNpcSlice(pkg.slices.npc),
      narration: emptyNarrationSlice(pkg.campaignId),
      onboarding: emptyOnboardingSlice(pkg.campaignId)
    }
  }
}

function emptyOnboardingSlice(campaignId: string): OnboardingCampaignSlice {
  return {
    sliceVersion: ONBOARDING_CAMPAIGN_SLICE_VERSION,
    campaignId,
    records: [],
    guidedCreationStates: [],
    activeCharacterId: null
  }
}

function emptyNarrationSlice(campaignId: string): NarrationCampaignSlice {
  return {
    sliceVersion: NARRATION_SLICE_VERSION,
    campaignId,
    socialLines: [],
    sceneBlocks: []
  }
}

function upgradeCharacterSlice(slice: CharacterCampaignSlice): CharacterCampaignSlice {
  const version = (slice as { sliceVersion: number }).sliceVersion
  if (version === 3) return slice
  return {
    sliceVersion: 3,
    campaignId: slice.campaignId,
    day: slice.day,
    ...(slice.deathMode === undefined ? {} : { deathMode: slice.deathMode }),
    characterIds: slice.characterIds,
    companions: slice.companions,
    locations: slice.locations,
    stats: {},
    journal: {},
    logbook: {},
    questLog: {},
    knownActionIds: {},
    autosaves: {}
  }
}

function upgradeItemSlice(slice: ItemCampaignSlice): ItemCampaignSlice {
  const version = (slice as { sliceVersion: number }).sliceVersion
  if (version === 2) return slice
  return {
    sliceVersion: 2,
    campaignId: slice.campaignId,
    balances: slice.balances,
    templates: [],
    instances: [],
    inventories: []
  }
}

function upgradeNpcSlice(slice: NpcCampaignSlice): NpcCampaignSlice {
  const version = (slice as { sliceVersion: number }).sliceVersion
  if (version === 3) return slice
  return {
    sliceVersion: 3,
    campaignId: slice.campaignId,
    npcIds: slice.npcIds,
    npcs: slice.npcs,
    locations: slice.locations,
    memories: [],
    factions: [],
    factionRelations: [],
    characterFactionReputations: [],
    npcOpinions: [],
    dmNpcOpinions: [],
    worldFacts: []
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
    pkg.slices.quest.campaignId,
    pkg.slices.narration.campaignId,
    pkg.slices.onboarding.campaignId
  ]
  for (const campaignId of slices) {
    if (campaignId !== expectedCampaignId) {
      throw new PortabilitySchemaError(
        `Portable package campaignId mismatch: expected ${expectedCampaignId}, found ${campaignId}`
      )
    }
  }
}
