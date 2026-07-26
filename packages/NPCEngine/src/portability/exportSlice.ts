import { listNpcLocations } from '../location.js'
import { listNpcsForCampaign } from '../store.js'
import { NPC_SLICE_VERSION, type NpcCampaignSlice, type NpcPortabilityContext } from './types.js'

export function exportCampaignSlice(ctx: NpcPortabilityContext): NpcCampaignSlice {
  const npcs = listNpcsForCampaign(ctx.campaignId)
  return {
    sliceVersion: NPC_SLICE_VERSION,
    campaignId: ctx.campaignId,
    npcIds: npcs.map((npc) => npc.npcId),
    npcs,
    locations: listNpcLocations(ctx.campaignId)
  }
}
