import { assertText } from './errors.js'
import { getNpcCampaignStore, requireNpc } from './store.js'
import type { NpcOpinion, UpsertNpcOpinionInput } from './types.js'

export function clearOpinionStore(): void {
  getNpcCampaignStore().clearNpcOpinions()
}

export function upsertNpcOpinion(input: UpsertNpcOpinionInput): NpcOpinion {
  requireNpc(input.holderNpcId)
  assertText(input.subjectId, 'subjectId')
  return getNpcCampaignStore().setNpcOpinion(buildOpinion(input))
}

export function listNpcOpinionsHeldBy(holderNpcId: string): NpcOpinion[] {
  requireNpc(holderNpcId)
  return getNpcCampaignStore().listNpcOpinionsHeldBy(holderNpcId)
}

export function listNpcOpinionsAbout(subjectId: string): NpcOpinion[] {
  assertText(subjectId, 'subjectId')
  return getNpcCampaignStore().listNpcOpinionsAbout(subjectId)
}

function buildOpinion(input: UpsertNpcOpinionInput): NpcOpinion {
  return {
    holderNpcId: input.holderNpcId,
    subjectId: input.subjectId,
    subjectKind: input.subjectKind,
    trust: input.trust,
    fear: input.fear,
    affection: input.affection,
    ...(input.stance === undefined ? {} : { stance: input.stance }),
    ...(input.provenance === undefined ? {} : { provenance: { ...input.provenance } })
  }
}

