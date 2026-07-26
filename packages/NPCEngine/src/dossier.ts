import { assertText, NpcEngineError } from './errors.js'
import { listWorldFactsMentioningNpc } from './memory.js'
import { requireNpc } from './store.js'
import type {
  GetNpcDossierInput,
  NpcDossier,
  NpcDossierTraits,
  UpsertDmNpcOpinionInput
} from './types.js'

const dmOpinions = new Map<string, string>()

export function clearDmOpinionStore(): void {
  dmOpinions.clear()
}

export function upsertDmNpcOpinion(input: UpsertDmNpcOpinionInput): string {
  assertText(input.campaignId, 'campaignId')
  assertText(input.npcId, 'npcId')
  assertText(input.text, 'text')
  const npc = requireNpc(input.npcId)
  assertCampaignMatch(npc.campaignId, input.campaignId)
  const key = dmOpinionKey(input.campaignId, input.npcId)
  dmOpinions.set(key, input.text)
  return input.text
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
  return dmOpinions.get(dmOpinionKey(campaignId, npcId)) ?? null
}

function dmOpinionKey(campaignId: string, npcId: string): string {
  return `${campaignId}:${npcId}`
}

function assertCampaignMatch(npcCampaignId: string, requestedCampaignId: string): void {
  if (npcCampaignId !== requestedCampaignId) {
    throw new NpcEngineError(
      'CAMPAIGN_MISMATCH',
      `NPC campaign ${npcCampaignId} does not match requested campaign ${requestedCampaignId}`
    )
  }
}
