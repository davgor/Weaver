import { clearCampaignNpcs, saveNpc } from '../store.js'
import {
  NPC_SLICE_VERSION,
  NpcPortabilitySchemaError,
  type NpcCampaignSlice,
  type NpcPortabilityContext
} from './types.js'

export function importCampaignSlice(ctx: NpcPortabilityContext, slice: NpcCampaignSlice): void {
  assertSliceVersion(slice)
  assertCampaignMatch(ctx.campaignId, slice.campaignId)

  clearCampaignNpcs(ctx.campaignId)
  for (const npc of slice.npcs) {
    if (npc.campaignId !== ctx.campaignId) {
      throw new NpcPortabilitySchemaError(
        `NPC ${npc.npcId} belongs to campaign ${npc.campaignId}, expected ${ctx.campaignId}`
      )
    }
    saveNpc(npc)
  }
}

function assertSliceVersion(slice: NpcCampaignSlice): void {
  if (slice.sliceVersion !== NPC_SLICE_VERSION) {
    throw new NpcPortabilitySchemaError(
      `Unsupported NPC slice version ${String(slice.sliceVersion)}; expected ${NPC_SLICE_VERSION}`
    )
  }
}

function assertCampaignMatch(expected: string, actual: string): void {
  if (expected !== actual) {
    throw new NpcPortabilitySchemaError(
      `NPC slice campaignId mismatch: expected ${expected}, found ${actual}`
    )
  }
}
