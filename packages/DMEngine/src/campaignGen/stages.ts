import type { CampaignHandle } from '../persistence/campaignPersistence.js'
import {
  catalogEntries,
  roleHints,
  stageText,
  toFactionInput,
  toFactionMembership,
  toNpcInput,
  toNumericSeed
} from './normalize.js'
import type {
  CampaignGenerationDeps,
  CampaignGenerationStageId,
  GenerationState,
  RegionalReader,
  StageOutput,
  WorldReader
} from './types.js'

export async function persistStage(
  stage: CampaignGenerationStageId,
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): Promise<void> {
  switch (stage) {
    case 'canon':
      state.canon = stageText(output.filled, 'CANON')
      return
    case 'pantheon':
      state.pantheon = stageText(output.filled, 'PANTHEON')
      return
    case 'world':
      persistWorld(state, deps, output)
      return
    case 'factions':
      persistFactions(state, deps, output)
      return
    case 'regions':
      persistRegions(state, deps)
      return
    case 'npcs':
      persistNpcs(state, deps, output)
      return
    case 'bestiary':
      persistBestiary(state, deps, output)
      return
    case 'story':
      state.storyPremise = stageText(output.filled, 'STORY_PREMISE')
      return
    case 'persist':
      persistCampaign(state, deps, output)
      return
  }
}

function persistWorld(
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): void {
  const seed = toNumericSeed(state.seed)
  const worldSummary = stageText(output.filled, 'WORLD_SUMMARY')
  deps.world.createWorld(state.input.dataRoot, { worldId: state.worldId, seed, width: 8, height: 8 })
  state.worldSummary = worldSummary
}

function persistFactions(
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): void {
  const faction = deps.npc.createFaction(toFactionInput(state, output.filled))
  state.factions = [faction]
}

function persistRegions(state: GenerationState, deps: CampaignGenerationDeps): void {
  if (state.input.regionCount === 0) return
  const regionalOptions = { dataRoot: state.input.dataRoot, world: worldReader(state, deps) }
  const regions = deps.regional.fillRegions(regionalOptions, state.worldId)
  state.regions = regions.slice(0, state.input.regionCount)
  state.civilizations = deps.civilization.fillCivilizations(
    { ...regionalOptions, regional: regionalReader(regionalOptions, deps) },
    state.worldId,
    { regionIds: state.regions.map((region) => region.regionId) }
  )
  state.placeholders = placeholdersForRegions(state, deps)
}

function persistNpcs(
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): void {
  state.npcs = state.placeholders.map((slot, index) => deps.npc.constructNpc(
    toNpcInput({ state, slotId: slot.slotId, npcIndex: index, filled: output.filled })
  ))
  addNpcsToFaction(state, deps)
}

function persistBestiary(
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): void {
  state.bestiaryFlavor = stageText(output.filled, 'BESTIARY_FLAVOR')
  const regionId = state.regions[0]?.regionId
  const foes = deps.enemy.listBestiary().length === 0
    ? []
    : deps.enemy.generateEncounterFoes(regionId === undefined ? { count: 1 } : { regionId, count: 1 })
  state.foes = foes
}

function persistCampaign(
  state: GenerationState,
  deps: CampaignGenerationDeps,
  output: StageOutput
): void {
  const summary = stageText(output.filled, 'PERSIST_SUMMARY')
  const entries = catalogEntries(state, summary)
  const handle = deps.campaign.createCampaign({
    campaignId: state.input.campaignId,
    filePath: state.input.campaignFilePath,
    seedCatalog: ({ catalog }) => entries.forEach((entry) => catalog.upsert(entry))
  })
  state.catalogEntries = entries
  state.campaign = closeAndSummarize(handle)
}

function placeholdersForRegions(
  state: GenerationState,
  deps: CampaignGenerationDeps
) {
  return state.regions.flatMap((region) => {
    const civilization = state.civilizations.find((entry) => entry.regionId === region.regionId)
    if (civilization === undefined || state.input.npcsPerRegion === 0) return []
    return deps.civilization.ensureNpcPlaceholders({
      worldId: state.worldId,
      civilizationId: civilization.civilizationId,
      regionId: region.regionId,
      roleHints: roleHints(state.input.npcsPerRegion)
    })
  })
}

function addNpcsToFaction(state: GenerationState, deps: CampaignGenerationDeps): void {
  const faction = state.factions[0]
  if (faction === undefined) return
  for (const npc of state.npcs) {
    deps.npc.addNpcToFaction(toFactionMembership(faction.factionId, npc.npcId))
  }
}

function worldReader(state: GenerationState, deps: CampaignGenerationDeps): WorldReader {
  return {
    getWorldMeta: (worldId) => deps.world.getWorldMeta(state.input.dataRoot, worldId),
    getWorldBounds: (worldId) => deps.world.getWorldBounds(state.input.dataRoot, worldId),
    getExpansion: (worldId, expansionId) =>
      deps.world.getExpansion(state.input.dataRoot, worldId, expansionId),
    getCell: (args) => deps.world.getCell({ ...args, dataRoot: state.input.dataRoot }),
    getWorldSpecific: (args) => deps.world.getWorldSpecific({ ...args, dataRoot: state.input.dataRoot })
  }
}

function regionalReader(
  options: { dataRoot: string; world: WorldReader },
  deps: CampaignGenerationDeps
): RegionalReader {
  return {
    getRegion: (worldId, regionId) => deps.regional.getRegion(options, worldId, regionId),
    getRegionSummary: (worldId, regionId) => deps.regional.getRegionSummary(options, worldId, regionId),
    getRegionCells: (worldId, regionId) => deps.regional.getRegionCells(options, worldId, regionId),
    listRegions: (worldId) => deps.regional.listRegions(options, worldId),
    getRegionsInBounds: (worldId, bounds) => deps.regional.getRegionsInBounds(options, worldId, bounds)
  }
}

function closeAndSummarize(handle: CampaignHandle): Omit<CampaignHandle, 'close' | 'getDb'> {
  try {
    return {
      campaignId: handle.campaignId,
      filePath: handle.filePath,
      schemaVersion: handle.schemaVersion,
      appliedMigrations: handle.appliedMigrations
    }
  } finally {
    handle.close()
  }
}
