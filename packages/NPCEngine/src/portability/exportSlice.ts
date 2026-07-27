import { listNpcLocations } from '../location.js'
import { getNpcCampaignStore, listNpcsForCampaign } from '../store.js'
import { NPC_SLICE_VERSION, type NpcCampaignSlice, type NpcPortabilityContext } from './types.js'

export function exportCampaignSlice(ctx: NpcPortabilityContext): NpcCampaignSlice {
  const store = getNpcCampaignStore()
  const npcs = listNpcsForCampaign(ctx.campaignId)
  return {
    sliceVersion: NPC_SLICE_VERSION,
    campaignId: ctx.campaignId,
    npcIds: npcs.map((npc) => npc.npcId),
    npcs,
    locations: listNpcLocations(ctx.campaignId),
    memories: npcs.flatMap((npc) => store.listMemories(npc.npcId)),
    factions: store.listFactions(),
    factionRelations: store.listFactionRelations(),
    characterFactionReputations: store.listReputations(),
    npcOpinions: store.listNpcOpinions(),
    dmNpcOpinions: store.listDmNpcOpinionsForCampaign(ctx.campaignId),
    worldFacts: store.listWorldFacts()
  }
}
