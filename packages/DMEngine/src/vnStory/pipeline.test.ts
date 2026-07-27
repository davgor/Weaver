import { describe, expect, it } from 'vitest'
import { runVnStoryGeneration } from './pipeline.js'
import {
  VN_STORY_GENERATION_STAGES,
  type VnStoryGenerationDeps,
  type VnStoryGenerationInput,
  type VnStoryGenerationStageId
} from './types.js'
import { castSlotCount } from './skeletons.js'

describe('vn story generation pipeline stage flow', () => {
  it('runs every stage in strict VN story order with draft lifecycle', async () => {
    const calls: VnStoryGenerationStageId[] = []
    const result = await runVnStoryGeneration(baseInput(), fakeDeps({
      onFill(input) {
        calls.push(input.stage)
        return stageBlocks(input.stage, 3)
      }
    }))

    expect(calls).toEqual([...VN_STORY_GENERATION_STAGES])
    expect(result.lifecycle).toBe('draft')
    expect(result.stages.map((stage) => stage.stage)).toEqual([...VN_STORY_GENERATION_STAGES])
    expect(result.overview.acts).toHaveLength(3)
    expect(result.overview.premiseSummary).toContain('Harbor')
    expect(result.overview.openingBeat).toContain('dock')
    expect(result.npcIds).toHaveLength(castSlotCount(3))
  })

  it('defaults actCount to 3 and respects custom act counts', async () => {
    const defaulted = await runVnStoryGeneration(baseInput(), fakeDeps())
    expect(defaulted.overview.acts).toHaveLength(3)

    const custom = await runVnStoryGeneration(
      { ...baseInput(), actCount: 5, campaignId: 'vn-custom' },
      fakeDeps()
    )
    expect(custom.overview.acts).toHaveLength(5)
    expect(custom.npcIds).toHaveLength(castSlotCount(5))
  })
})

describe('vn story generation pipeline retries', () => {
  it('retries a stage by re-invoking NarrationEngine before persisting', async () => {
    let premiseAttempts = 0
    const deps = fakeDeps({
      onFill(input) {
        if (input.stage === 'premise' && premiseAttempts === 0) {
          premiseAttempts += 1
          return { ok: false, filled: {}, errors: ['missing PREMISE_SUMMARY'] }
        }
        return stageBlocks(input.stage, 3)
      }
    })

    const result = await runVnStoryGeneration(baseInput(), deps)

    expect(result.overview.premiseSummary).toContain('Harbor')
    expect(premiseAttempts).toBe(1)
    expect(deps.campaign.created).toHaveLength(1)
  })

  it('never persists draft campaign when a stage fails validation', async () => {
    const deps = fakeDeps({
      onFill(input) {
        if (input.stage === 'opening') {
          return { ok: false, filled: { OPENING_BEAT: 'x' }, errors: ['invalid'] }
        }
        return stageBlocks(input.stage, 3)
      }
    })

    await expect(runVnStoryGeneration(baseInput(), deps)).rejects.toThrow(/opening/i)
    expect(deps.campaign.created).toHaveLength(0)
  })
})

describe('vn story cast memory isolation (fake deps)', () => {
  it('appends per-NPC memories and keeps grounding isolated', async () => {
    const deps = fakeDeps()
    const result = await runVnStoryGeneration(baseInput(), deps)

    expect(result.npcIds.length).toBeGreaterThanOrEqual(2)
    for (const npcId of result.npcIds) {
      assertIsolatedMemory(deps, result.npcIds, npcId)
    }
  })
})

function assertIsolatedMemory(
  deps: TrackingDeps,
  npcIds: string[],
  npcId: string
): void {
  const context = deps.npc.queryNpcGroundingContext({ npcId })
  expect(context.privateMemories).toHaveLength(1)
  expect(context.privateMemories[0]?.text).toContain(npcId)
  for (const otherId of npcIds.filter((id) => id !== npcId)) {
    expect(context.privateMemories[0]?.text).not.toContain(`for ${otherId}`)
  }
}

function baseInput(): VnStoryGenerationInput {
  return {
    campaignId: 'vn-test',
    dataRoot: '/tmp/weaver-vn-story-test',
    campaignFilePath: '/tmp/weaver-vn-story-test/story.sqlite',
    seed: 'seed-vn',
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    }
  }
}

type NarrationFillInput = Parameters<VnStoryGenerationDeps['narration']['fillAndValidate']>[0]

type FakeOptions = {
  onFill?: (input: NarrationFillInput) => ReturnType<typeof stageBlocks>
}

type TrackingDeps = VnStoryGenerationDeps & {
  campaign: VnStoryGenerationDeps['campaign'] & { created: string[] }
}

function fakeDeps(options: FakeOptions = {}): TrackingDeps {
  const memories = new Map<string, string[]>()
  return {
    narration: {
      fillAndValidate: async (input) =>
        options.onFill?.(input) ?? stageBlocks(input.stage, actCountFromFacts(input.facts))
    },
    completer: {
      async completeText() {
        return { text: '', backend: 'unit' }
      }
    },
    civilization: {
      ensureNpcPlaceholders: (input) =>
        input.roleHints.map((roleHint, index) => ({
          slotId: `${input.civilizationId}:${roleHint}:${index + 1}`,
          civilizationId: input.civilizationId,
          worldId: input.worldId,
          regionId: input.regionId,
          roleHint,
          status: 'unassigned' as const
        }))
    },
    npc: fakeNpc(memories),
    character: {
      setCampaignRaceRoster() {}
    },
    campaign: fakeCampaign()
  }
}

function fakeNpc(memories: Map<string, string[]>): VnStoryGenerationDeps['npc'] {
  return {
    constructNpc: (input) => ({
      npcId: input.npcId,
      campaignId: input.campaignId,
      worldId: input.worldId,
      regionId: 'vn-region',
      civilizationId: 'vn-civ',
      placeholder: {
        slotId: input.placeholderSlotId,
        civilizationId: 'vn-civ',
        worldId: input.worldId,
        regionId: 'vn-region',
        roleHint: 'resident',
        status: 'assigned',
        assignedNpcId: input.npcId
      },
      identity: {
        race: { raceId: input.raceId, name: 'Human' },
        alignment: input.alignment,
        temperament: input.temperament,
        nonSpeaking: false
      },
      abilityScores: input.abilityScores,
      abilityModifiers: { Body: 0, Agility: 0, Mind: 0, Presence: 0 },
      speciesKind: 'person',
      combatStats: { kind: 'civilian', maxHp: 10, currentHp: 10 },
      factionIds: [],
      displayName: input.displayName
    }),
    appendNpcMemory: (memory) => {
      const list = memories.get(memory.npcId) ?? []
      list.push(memory.text)
      memories.set(memory.npcId, list)
      return memory
    },
    queryNpcGroundingContext: ({ npcId }) => ({
      npcId,
      privateMemories: (memories.get(npcId) ?? []).map((text) => ({
        npcId,
        text,
        provenance: { eventId: 'unit' }
      })),
      worldFacts: [],
      opinions: []
    })
  }
}

function fakeCampaign(): TrackingDeps['campaign'] {
  const created: string[] = []
  return {
    created,
    createCampaign: (options) => {
      created.push(options.campaignId)
      options.seedCatalog?.({
        campaignId: options.campaignId,
        schemaVersion: 1,
        catalog: { upsert() {} }
      })
      return {
        campaignId: options.campaignId,
        filePath: options.filePath,
        schemaVersion: 1,
        appliedMigrations: [1],
        getDb: () => ({
          prepare: () => ({ run() {}, get: () => undefined })
        }) as never,
        close() {}
      }
    }
  }
}

function actCountFromFacts(facts: Record<string, string>): number {
  const parsed = Number(facts.actCount)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 3
}

function stageBlocks(stage: VnStoryGenerationStageId, actCount: number) {
  const filled = filledForStage(stage, actCount)
  return { ok: true as const, filled, filledText: Object.values(filled).join('\n'), errors: [] }
}

function filledForStage(
  stage: VnStoryGenerationStageId,
  actCount: number
): Record<string, string> {
  if (stage === 'premise') {
    return { PREMISE_SUMMARY: 'Harbor lights vanish under a thief moon.' }
  }
  if (stage === 'acts') return actBlocks(actCount)
  if (stage === 'cast') return castBlocks(castSlotCount(actCount))
  if (stage === 'opening') {
    return { OPENING_BEAT: 'Fog rolls over the dock as the last lantern dies.' }
  }
  if (stage === 'overview') {
    return { OVERVIEW_PROSE: 'A short tale of stolen light and stubborn courage.' }
  }
  return { PERSIST_SUMMARY: 'Draft VN story catalog ready.' }
}

function actBlocks(actCount: number): Record<string, string> {
  const filled: Record<string, string> = {}
  for (let index = 1; index <= actCount; index += 1) {
    filled[`ACT_${index}`] = `Title: Act ${index} Title\nSummary: Summary for act ${index}.`
  }
  return filled
}

function castBlocks(castCount: number): Record<string, string> {
  const filled: Record<string, string> = {}
  for (let index = 1; index <= castCount; index += 1) {
    filled[`CAST_${index}`] = [
      `Name: Cast Member ${index}`,
      `Role: role-${index}`,
      `Bio: Bio for cast member ${index}.`,
      'Race: human',
      'Alignment: neutral',
      'Temperament: curious'
    ].join('\n')
  }
  return filled
}
