import type { QuestIdPools, SeedWorldQuestsInput, WorldQuest } from '@weaver/quest-engine'
import type { CampaignGenerationDeps, GenerationState } from './types.js'

export function seedCampaignQuests(
  state: GenerationState,
  deps: CampaignGenerationDeps
): WorldQuest[] {
  const pools = questPoolsFromState(state, deps)
  if (!poolsReady(pools)) {
    state.quests = []
    return state.quests
  }
  const input: SeedWorldQuestsInput = {
    campaignId: state.input.campaignId,
    worldId: state.worldId,
    seed: state.seed,
    pools
  }
  state.quests = deps.quest.seedWorldQuests(input)
  return state.quests
}

function questPoolsFromState(
  state: GenerationState,
  deps: CampaignGenerationDeps
): QuestIdPools {
  return {
    regionIds: state.regions.map((region) => region.regionId),
    placeIds: state.civilizations.map((civ) => civ.civilizationId),
    npcIds: state.npcs.map((npc) => npc.npcId),
    itemIds: deps.quest.listSeedItemIds()
  }
}

function poolsReady(pools: QuestIdPools): boolean {
  return (
    pools.regionIds.length > 0 &&
    pools.placeIds.length > 0 &&
    pools.npcIds.length > 0 &&
    pools.itemIds.length > 0
  )
}
