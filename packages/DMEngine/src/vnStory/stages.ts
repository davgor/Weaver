import type { CampaignHandle } from '../persistence/campaignPersistence.js'
import {
  upsertCampaignMeta,
  type CampaignMetaWriter
} from '../persistence/campaignMeta.js'
import {
  buildOverview,
  catalogEntries,
  castRoleHints,
  parseActs,
  stageText,
  toCastMember,
  toNpcInput,
  toNpcMemory
} from './normalize.js'
import type {
  VnGenerationState,
  VnStageOutput,
  VnStoryGenerationDeps,
  VnStoryGenerationStageId
} from './types.js'

export async function persistVnStage(
  stage: VnStoryGenerationStageId,
  state: VnGenerationState,
  deps: VnStoryGenerationDeps,
  output: VnStageOutput
): Promise<void> {
  switch (stage) {
    case 'premise':
      state.premiseSummary = stageText(output.filled, 'PREMISE_SUMMARY')
      return
    case 'acts':
      state.acts = parseActs(output.filled, state.actCount)
      return
    case 'cast':
      persistCast(state, deps, output)
      return
    case 'opening':
      state.openingBeat = stageText(output.filled, 'OPENING_BEAT')
      return
    case 'overview':
      state.overviewProse = stageText(output.filled, 'OVERVIEW_PROSE')
      return
    case 'persist':
      persistDraft(state, deps, output)
      return
  }
}

function persistCast(
  state: VnGenerationState,
  deps: VnStoryGenerationDeps,
  output: VnStageOutput
): void {
  ensureRaceRoster(state, deps)
  state.placeholders = deps.civilization.ensureNpcPlaceholders({
    worldId: state.worldId,
    civilizationId: state.civilizationId,
    regionId: state.regionId,
    roleHints: castRoleHints(state.actCount)
  })
  state.npcs = []
  state.cast = []
  for (const [index, slot] of state.placeholders.entries()) {
    constructCastNpc({ state, deps, output, slotId: slot.slotId, index })
  }
}

function constructCastNpc(args: {
  state: VnGenerationState
  deps: VnStoryGenerationDeps
  output: VnStageOutput
  slotId: string
  index: number
}): void {
  const input = toNpcInput({
    state: args.state,
    slotId: args.slotId,
    castIndex: args.index,
    filled: args.output.filled
  })
  const npc = args.deps.npc.constructNpc(input)
  args.deps.npc.appendNpcMemory(toNpcMemory(npc.npcId, args.state.seed, args.index))
  args.state.npcs.push(npc)
  const filledText = stageText(args.output.filled, `CAST_${args.index + 1}`)
  args.state.cast.push(toCastMember(npc.npcId, npc.displayName, filledText))
}

function ensureRaceRoster(state: VnGenerationState, deps: VnStoryGenerationDeps): void {
  deps.character.setCampaignRaceRoster(state.input.campaignId, [
    { raceId: 'human', name: 'Human' }
  ])
}

function persistDraft(
  state: VnGenerationState,
  deps: VnStoryGenerationDeps,
  output: VnStageOutput
): void {
  const summary = stageText(output.filled, 'PERSIST_SUMMARY')
  const entries = catalogEntries(state, summary)
  const handle = deps.campaign.createCampaign({
    campaignId: state.input.campaignId,
    filePath: state.input.campaignFilePath,
    seedCatalog: ({ catalog }) => {
      for (const entry of entries) catalog.upsert(entry)
    }
  })
  writeDraftMeta(handle, state.actCount)
  state.catalogEntries = entries
  state.campaign = closeAndSummarize(handle)
  // Ensure overview fields are complete before finalize.
  buildOverview(state)
}

function writeDraftMeta(handle: CampaignMetaWriter, actCount: number): void {
  upsertCampaignMeta(handle, 'lifecycle', 'draft')
  upsertCampaignMeta(handle, 'kind', 'vn_story')
  upsertCampaignMeta(handle, 'act_count', String(actCount))
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
