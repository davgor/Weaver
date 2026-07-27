import { describe, expect, it } from 'vitest'
import type {
  PermanentizeVnStoryResult,
  VnStoryGenerationInput,
  VnStoryGenerationResult
} from '@weaver/dm-engine'
import type { VnStoryDraft } from '../../shared/story/types.js'
import {
  createVnStoryService,
  type VnStoryGenerationPort,
  type VnStoryService
} from './storyService.js'

describe('vnStoryService generation', () => {
  it('starts generation from a validated draft and exposes review snapshot', async () => {
    const service = createTestService()
    const snapshot = await service.startGeneration(validDraft())

    expect(snapshot.status).toBe('ready')
    expect(snapshot.confirmed).toBe(false)
    expect(snapshot.premiseSummary).toContain('Harbor')
    expect(snapshot.acts).toHaveLength(3)
    expect(snapshot.cast.length).toBeGreaterThan(0)
    expect(snapshot.mainCharacter.name).toBe('Ryn Vale')
    expect(snapshot.openingBeat.length).toBeGreaterThan(0)
  })

  it('records generation failures as error status', async () => {
    const service = createVnStoryService({
      ...basePort(),
      generate: async () => {
        throw new Error('pipeline boom')
      }
    })
    const snapshot = await service.startGeneration(validDraft())
    expect(snapshot.status).toBe('error')
    expect(snapshot.errorMessage).toMatch(/pipeline boom/)
  })

  it('rejects invalid drafts before generation starts', async () => {
    const service = createTestService()
    await expect(
      service.startGeneration({ ...validDraft(), premise: '' })
    ).rejects.toThrow(/premise/i)
  })
})

describe('vnStoryService review gates', () => {
  it('requires confirm before Play and permanentizes on Play', async () => {
    const permanentizeCalls: string[] = []
    const service = createTestService({
      permanentize: ({ campaignId, filePath }) => {
        permanentizeCalls.push(`${campaignId}:${filePath}`)
        return fakePermanentize()
      }
    })
    await service.startGeneration(validDraft())
    await expect(service.play()).rejects.toThrow(/confirm/i)

    const confirmed = await service.confirmReview()
    expect(confirmed.confirmed).toBe(true)
    const played = await service.play()
    expect(played.lifecycle).toBe('permanent')
    expect(permanentizeCalls).toHaveLength(1)
  })

  it('backToEdit clears review so the form can be edited again', async () => {
    const service = createTestService()
    await service.startGeneration(validDraft())
    await service.backToEdit()
    expect(await service.getReview()).toBeNull()
  })

  it('returns null review before generation', async () => {
    const service = createTestService()
    expect(await service.getReview()).toBeNull()
  })
})

describe('vnStoryService saved games', () => {
  it('lists permanent games from the port', async () => {
    const service = createTestService({
      listSaved: () => [
        {
          campaignId: 'vn-1',
          title: 'Ryn Vale',
          premiseSummary: 'Harbor lights',
          actCount: 3,
          lifecycle: 'permanent',
          playStatus: 'in_progress'
        }
      ]
    })
    await expect(service.listSavedGames()).resolves.toEqual([
      expect.objectContaining({ campaignId: 'vn-1', lifecycle: 'permanent' })
    ])
  })
})

function createTestService(overrides: Partial<VnStoryGenerationPort> = {}): VnStoryService {
  return createVnStoryService({ ...basePort(), ...overrides })
}

function basePort(): VnStoryGenerationPort {
  let n = 0
  return {
    generate: async (input) => fakeResult(input),
    permanentize: () => fakePermanentize(),
    resolvePaths: (campaignId) => ({
      dataRoot: `/tmp/${campaignId}/data`,
      campaignFilePath: `/tmp/${campaignId}/story.sqlite`
    }),
    ensureLayout: () => undefined,
    createCampaignId: () => `vn-test-${++n}`,
    listSaved: () => []
  }
}

function fakePermanentize(): PermanentizeVnStoryResult {
  return {
    lifecycle: 'permanent',
    session: {
      campaignId: 'vn-test-1',
      close: () => undefined,
      isStoreBound: () => true
    } as PermanentizeVnStoryResult['session']
  }
}

function fakeResult(input: VnStoryGenerationInput): VnStoryGenerationResult {
  return {
    campaignId: input.campaignId,
    seed: input.seed ?? 'seed',
    lifecycle: 'draft',
    stages: [],
    overview: {
      campaignId: input.campaignId,
      premiseSummary: 'Harbor lights vanish under a thief moon.',
      mainCharacter: input.mainCharacter,
      acts: [
        { actIndex: 1, title: 'Act 1', summary: 'Fog' },
        { actIndex: 2, title: 'Act 2', summary: 'Chase' },
        { actIndex: 3, title: 'Act 3', summary: 'Light' }
      ],
      cast: [{ npcId: 'npc-1', displayName: 'Harbor Warden', role: 'mentor' }],
      openingBeat: 'Fog rolls over the dock.',
      overviewProse: 'A short tale of stolen light.'
    },
    npcIds: ['npc-1'],
    campaign: {
      campaignId: input.campaignId,
      filePath: input.campaignFilePath,
      schemaVersion: 1,
      appliedMigrations: []
    }
  }
}

function validDraft(): VnStoryDraft {
  return {
    premise: 'A lantern thief steals the last harbor light.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    actCount: 3
  }
}
