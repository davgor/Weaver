import { assertText, NpcEngineError } from './errors.js'
import { listWorldFactsMentioningNpc } from './memory.js'
import { getNpcCampaignStore, requireNpc } from './store.js'
import type {
  GetNpcDossierInput,
  NpcDossier,
  NpcDossierTraits,
  UpsertDmNpcOpinionInput
} from './types.js'

export function clearDmOpinionStore(): void {
  getNpcCampaignStore().clearDmNpcOpinions()
}

export function upsertDmNpcOpinion(input: UpsertDmNpcOpinionInput): string {
  assertText(input.campaignId, 'campaignId')
  assertText(input.npcId, 'npcId')
  assertText(input.text, 'text')
  const npc = requireNpc(input.npcId)
  assertCampaignMatch(npc.campaignId, input.campaignId)
  return getNpcCampaignStore().setDmNpcOpinion(input.campaignId, input.npcId, input.text)
}

export function getNpcDossier(input: GetNpcDossierInput): NpcDossier {
  assertText(input.campaignId, 'campaignId')
  const npc = requireNpc(input.npcId)
  assertCampaignMatch(npc.campaignId, input.campaignId)
  return {
    npcId: npc.npcId,
    campaignId: npc.campaignId,
    ...(npc.displayName === undefined ? {} : { displayName: npc.displayName }),
    regionId: npc.regionId,
    civilizationId: npc.civilizationId,
    traits: buildTraits(npc),
    facts: listWorldFactsMentioningNpc(npc.npcId),
    dmOpinion: readDmOpinion(npc.campaignId, npc.npcId),
    disposition: npc.defeatDisposition ?? null
  }
}

function buildTraits(npc: ReturnType<typeof requireNpc>): NpcDossierTraits {
  return {
    race: { ...npc.identity.race },
    ...(npc.identity.background === undefined
      ? {}
      : { background: { ...npc.identity.background } }),
    alignment: npc.identity.alignment,
    temperament: npc.identity.temperament,
    nonSpeaking: npc.identity.nonSpeaking,
    speciesKind: npc.speciesKind
  }
}

function readDmOpinion(campaignId: string, npcId: string): string | null {
  return getNpcCampaignStore().getDmNpcOpinion(campaignId, npcId) ?? null
}

function assertCampaignMatch(npcCampaignId: string, requestedCampaignId: string): void {
  if (npcCampaignId !== requestedCampaignId) {
    throw new NpcEngineError(
      'CAMPAIGN_MISMATCH',
      `NPC campaign ${npcCampaignId} does not match requested campaign ${requestedCampaignId}`
    )
  }
}
