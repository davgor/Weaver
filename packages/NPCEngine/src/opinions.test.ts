import { beforeEach, describe, expect, it } from 'vitest'
import {
  appendWorldFact,
  clearNpcStore,
  clearOpinionStore,
  listNpcOpinionsAbout,
  listNpcOpinionsHeldBy,
  npcEngine,
  queryNpcGroundingContext,
  upsertNpcOpinion
} from './index.js'
import { seedNpc } from './testHelpers.js'

describe('NPC opinion storage', () => {
  beforeEach(() => {
    clearNpcStore()
    clearOpinionStore()
  })

  it('stores typed opinions (scores + stance) about NPCs and PCs', () => {
    seedNpc({ npcId: 'npc-holder' })
    seedNpc({ npcId: 'npc-other' })

    const aboutNpc = upsertNpcOpinion({
      holderNpcId: 'npc-holder',
      subjectId: 'npc-other',
      subjectKind: 'npc',
      trust: 4,
      fear: 1,
      affection: 2,
      stance: 'friendly',
      provenance: { eventId: 'met-at-market' }
    })
    const aboutPc = upsertNpcOpinion({
      holderNpcId: 'npc-holder',
      subjectId: 'pc-1',
      subjectKind: 'pc',
      trust: -2,
      fear: 5,
      affection: 0,
      stance: 'wary'
    })

    expect(aboutNpc).toMatchObject({
      holderNpcId: 'npc-holder',
      subjectId: 'npc-other',
      subjectKind: 'npc',
      trust: 4,
      fear: 1,
      affection: 2,
      stance: 'friendly'
    })
    expect(aboutPc.subjectKind).toBe('pc')
    expect(listNpcOpinionsHeldBy('npc-holder').map((o) => o.subjectId)).toEqual([
      'npc-other',
      'pc-1'
    ])
  })
})

describe('NPC opinion listing', () => {
  beforeEach(() => {
    clearNpcStore()
    clearOpinionStore()
  })

  it('lists who holds opinions of a subject for relationship-web UI', () => {
    seedNpc({ npcId: 'npc-a' })
    seedNpc({ npcId: 'npc-b' })
    seedNpc({ npcId: 'npc-c' })
    upsertNpcOpinion({
      holderNpcId: 'npc-a',
      subjectId: 'pc-1',
      subjectKind: 'pc',
      trust: 1,
      fear: 0,
      affection: 3,
      stance: 'friendly'
    })
    upsertNpcOpinion({
      holderNpcId: 'npc-b',
      subjectId: 'pc-1',
      subjectKind: 'pc',
      trust: -3,
      fear: 4,
      affection: 0,
      stance: 'hostile'
    })
    upsertNpcOpinion({
      holderNpcId: 'npc-c',
      subjectId: 'npc-a',
      subjectKind: 'npc',
      trust: 0,
      fear: 0,
      affection: 1,
      stance: 'neutral'
    })

    expect(listNpcOpinionsAbout('pc-1').map((o) => o.holderNpcId).sort()).toEqual([
      'npc-a',
      'npc-b'
    ])
  })
})

describe('NPC opinion grounding context', () => {
  beforeEach(() => {
    clearNpcStore()
    clearOpinionStore()
  })

  it('exposes holder opinions only via holder grounding context', () => {
    seedNpc({ npcId: 'npc-a', regionId: 'north' })
    seedNpc({ npcId: 'npc-b', regionId: 'north' })
    upsertNpcOpinion({
      holderNpcId: 'npc-a',
      subjectId: 'pc-1',
      subjectKind: 'pc',
      trust: 2,
      fear: 0,
      affection: 1,
      stance: 'friendly'
    })
    upsertNpcOpinion({
      holderNpcId: 'npc-b',
      subjectId: 'pc-1',
      subjectKind: 'pc',
      trust: -5,
      fear: 8,
      affection: 0,
      stance: 'hostile'
    })
    appendWorldFact({
      factId: 'fact-leak',
      text: 'npc-b secretly fears pc-1',
      regionIds: ['north'],
      provenance: { eventId: 'should-not-become-opinion' }
    })

    const contextA = queryNpcGroundingContext({ npcId: 'npc-a' })
    const contextB = queryNpcGroundingContext({ npcId: 'npc-b' })

    expect(contextA.opinions.map((o) => o.holderNpcId)).toEqual(['npc-a'])
    expect(contextA.opinions[0]?.stance).toBe('friendly')
    expect(contextB.opinions.map((o) => o.stance)).toEqual(['hostile'])
    expect(contextA.opinions.some((o) => o.stance === 'hostile')).toBe(false)
    expect(contextA.worldFacts.every((fact) => !('trust' in fact))).toBe(true)
  })
})

describe('NPC opinion engine endpoint', () => {
  beforeEach(() => {
    clearNpcStore()
    clearOpinionStore()
  })

  it('updates opinions only through the explicit upsert API endpoint', async () => {
    seedNpc({ npcId: 'npc-holder' })

    const result = await npcEngine.call('upsertNpcOpinion', {
      holderNpcId: 'npc-holder',
      subjectId: 'pc-2',
      subjectKind: 'pc',
      trust: 0,
      fear: 1,
      affection: 0,
      stance: 'neutral'
    })

    expect(result).toMatchObject({ holderNpcId: 'npc-holder', subjectId: 'pc-2', fear: 1 })
    expect(
      (await npcEngine.call('listNpcOpinionsHeldBy', { holderNpcId: 'npc-holder' })) as unknown[]
    ).toHaveLength(1)
    expect(
      (await npcEngine.call('listNpcOpinionsAbout', { subjectId: 'pc-2' })) as unknown[]
    ).toHaveLength(1)
  })
})
