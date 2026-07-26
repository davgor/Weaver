import { assertText } from './errors.js'
import { requireNpc } from './store.js'
import type { NpcOpinion, UpsertNpcOpinionInput } from './types.js'

const opinions = new Map<string, NpcOpinion>()

export function clearOpinionStore(): void {
  opinions.clear()
}

export function upsertNpcOpinion(input: UpsertNpcOpinionInput): NpcOpinion {
  requireNpc(input.holderNpcId)
  assertText(input.subjectId, 'subjectId')
  const opinion = copyOpinion(buildOpinion(input))
  opinions.set(opinionKey(input.holderNpcId, input.subjectId), opinion)
  return copyOpinion(opinion)
}

export function listNpcOpinionsHeldBy(holderNpcId: string): NpcOpinion[] {
  requireNpc(holderNpcId)
  return [...opinions.values()]
    .filter((opinion) => opinion.holderNpcId === holderNpcId)
    .map(copyOpinion)
}

export function listNpcOpinionsAbout(subjectId: string): NpcOpinion[] {
  assertText(subjectId, 'subjectId')
  return [...opinions.values()]
    .filter((opinion) => opinion.subjectId === subjectId)
    .map(copyOpinion)
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

function opinionKey(holderNpcId: string, subjectId: string): string {
  return `${holderNpcId}->${subjectId}`
}

function copyOpinion(opinion: NpcOpinion): NpcOpinion {
  return {
    ...opinion,
    ...(opinion.provenance === undefined ? {} : { provenance: { ...opinion.provenance } })
  }
}
