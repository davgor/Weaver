import { describe, expect, it, vi } from 'vitest'
import type {
  CampaignSession,
  ResolveTurnDeps,
  ResolveTurnResult,
  VnPlayCursor,
  VnStoryOverview
} from '@weaver/dm-engine'
import { serializeVnPlayCursor } from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import { createVnPlayService, type VnPlayServiceDeps } from './playService.js'

describe('vnPlayService', () => {
  it('opens from overview opening beat in scene mode with two choices', async () => {
    const service = createVnPlayService(testDeps())
    const snapshot = await service.open('vn-1')
    expect(snapshot.mode).toBe('scene')
    expect(snapshot.beatText).toContain('Fog rolls')
    expect(snapshot.options).toEqual(['Search the fog.', 'Ask the warden.'])
    expect(snapshot.placeholders.some((row) => row.slot === 'mc')).toBe(true)
    expect(snapshot.placeholders.some((row) => row.slot === 'background')).toBe(true)
    expect(snapshot.placeholders.find((row) => row.slot === 'mc')?.label).toContain(
      "Ryn Vale's character"
    )
  })

  it('submits a turn through resolveTurn and updates mode from narration kind', async () => {
    const resolveTurnFn = vi.fn(async (): Promise<ResolveTurnResult> => socialResult())
    const service = createVnPlayService(testDeps({ resolveTurnFn }))
    await service.open('vn-1')
    const next = await service.submitAction({
      campaignId: 'vn-1',
      text: 'Ask what they saw.',
      socialSpeakerId: 'npc-1'
    })
    expect(resolveTurnFn).toHaveBeenCalled()
    expect(next.mode).toBe('npc')
    expect(next.beatText).toContain('scowls')
    expect(next.speakerName).toBe('Harbor Warden')
    expect(next.placeholders.some((row) => row.slot === 'npc')).toBe(true)
  })

  it('rejects submit when no session is open for the campaign', async () => {
    const service = createVnPlayService(testDeps())
    await expect(
      service.submitAction({ campaignId: 'vn-1', text: 'look around' })
    ).rejects.toThrow(/no active vn play session/i)
  })

  it('uses scene prose when projections are empty after a scene turn', async () => {
    const resolveTurnFn = vi.fn(async (): Promise<ResolveTurnResult> => ({
      route: 'narration',
      skipLlm: false,
      resolution: { kind: 'narration', text: 'look' },
      narration: { kind: 'scene', status: 'persisted', prose: 'Lanterns flicker.' },
      projections: { scene: [], social: [] }
    }))
    const service = createVnPlayService(testDeps({ resolveTurnFn }))
    await service.open('vn-1')
    const next = await service.submitAction({ campaignId: 'vn-1', text: 'look around' })
    expect(next.mode).toBe('scene')
    expect(next.beatText).toBe('Lanterns flicker.')
  })

  it('persists a fresh play cursor on open and again on submit', async () => {
    const session = fakeSession()
    const service = createVnPlayService(testDeps({}, session))
    const opened = await service.open('vn-1')
    expect(opened.phase).toBe('story')
    expect(opened.storyComplete).toBe(false)
    expect(opened.actIndex).toBe(1)
    expect(session.upsertMeta).toHaveBeenCalledWith('vn_play_cursor', expect.any(String))
    const openWrites = writeCount(session)
    await service.submitAction({ campaignId: 'vn-1', text: 'look around' })
    expect(writeCount(session)).toBeGreaterThan(openWrites)
  })

  it('resumes from a persisted cursor without regenerating opening choices', async () => {
    const completer = choiceCompleter()
    const completeSpy = vi.spyOn(completer, 'completeText')
    const session = fakeSession(() => serializeVnPlayCursor(savedCursor()))
    const service = createVnPlayService(testDeps({ completer }, session))
    const opened = await service.open('vn-1')
    expect(completeSpy).not.toHaveBeenCalled()
    expect(opened.beatText).toBe('The warden points north.')
    expect(opened.options).toEqual(['Follow the warden.', 'Stay put.'])
    expect(opened.mode).toBe('npc')
    expect(opened.speakerId).toBe('npc-1')
    expect(opened.phase).toBe('story')
    expect(opened.actIndex).toBe(2)
  })

  it('marks a resumed freeplay cursor as story complete', async () => {
    const session = fakeSession(() =>
      serializeVnPlayCursor({ ...savedCursor(), phase: 'freeplay', storyComplete: true, actIndex: 3 })
    )
    const service = createVnPlayService(testDeps({}, session))
    const opened = await service.open('vn-1')
    expect(opened.storyComplete).toBe(true)
    expect(opened.phase).toBe('freeplay')
  })

  it('queues assets fire-and-forget after open and submit without blocking the turn', async () => {
    const queueFromSnapshot = vi.fn()
    const cancel = vi.fn()
    const resolveTurnFn = vi.fn(async (): Promise<ResolveTurnResult> => socialResult())
    const service = createVnPlayService(
      testDeps({ assets: { queueFromSnapshot, cancel }, resolveTurnFn })
    )
    const opened = await service.open('vn-1')
    expect(queueFromSnapshot).toHaveBeenCalledWith(opened)
    const next = await service.submitAction({
      campaignId: 'vn-1',
      text: 'Ask what they saw.',
      socialSpeakerId: 'npc-1'
    })
    expect(queueFromSnapshot).toHaveBeenCalledWith(next)
    expect(queueFromSnapshot).toHaveBeenCalledTimes(2)
  })

  it('cancels prior asset work when opening a new session', async () => {
    const cancel = vi.fn()
    const service = createVnPlayService(
      testDeps({ assets: { queueFromSnapshot: vi.fn(), cancel } })
    )
    await service.open('vn-1')
    await service.open('vn-1')
    expect(cancel).toHaveBeenCalled()
  })

  it('open still resolves even when the asset service throws synchronously', async () => {
    const service = createVnPlayService(
      testDeps({
        assets: {
          queueFromSnapshot: () => {
            throw new Error('asset boom')
          },
          cancel: () => undefined
        }
      })
    )
    const opened = await service.open('vn-1')
    expect(opened.beatText).toContain('Fog rolls')
  })
})

function savedCursor(): VnPlayCursor {
  return {
    campaignId: 'vn-1',
    characterId: 'vn-1-vn-mc',
    phase: 'story',
    storyComplete: false,
    actIndex: 2,
    beatId: 'turn-1',
    mode: 'npc',
    beatText: 'The warden points north.',
    speakerId: 'npc-1',
    options: ['Follow the warden.', 'Stay put.'],
    updatedAt: '2026-07-27T00:00:00.000Z'
  }
}

function writeCount(session: CampaignSession): number {
  return (session.upsertMeta as unknown as { mock: { calls: unknown[] } }).mock.calls.length
}

function fakeSession(readMeta?: (key: string) => string | undefined): CampaignSession {
  return {
    campaignId: 'vn-1',
    filePath: '/tmp/x',
    schemaVersion: 5,
    appliedMigrations: [],
    close: () => undefined,
    isStoreBound: () => true,
    upsertMeta: vi.fn(),
    readMeta: vi.fn(readMeta ?? (() => undefined))
  } as unknown as CampaignSession
}

function testDeps(
  overrides: Partial<VnPlayServiceDeps> = {},
  session: CampaignSession = defaultSession()
): VnPlayServiceDeps {
  const overview = sampleOverview()
  return {
    catalog: {
      loadStory: () => ({
        overview,
        cast: overview.cast,
        openSession: () => session
      })
    },
    completer: choiceCompleter(),
    resolveTurnDeps: minimalTurnDeps(),
    ...overrides
  }
}

function defaultSession(): CampaignSession {
  return {
    campaignId: 'vn-1',
    filePath: '/tmp/x',
    schemaVersion: 5,
    appliedMigrations: [],
    close: () => undefined,
    isStoreBound: () => true,
    upsertMeta: vi.fn(),
    readMeta: vi.fn(() => undefined)
  } as unknown as CampaignSession
}

function sampleOverview(): VnStoryOverview {
  return {
    campaignId: 'vn-1',
    premiseSummary: 'Harbor lights vanish.',
    mainCharacter: {
      name: 'Ryn Vale',
      personality: 'quiet but stubborn',
      appearance: 'salt-stained coat'
    },
    acts: [],
    cast: [{ npcId: 'npc-1', displayName: 'Harbor Warden', role: 'mentor' }],
    openingBeat: 'Fog rolls over the dock as the last lantern dies.',
    overviewProse: 'A short tale.'
  }
}

function socialResult(): ResolveTurnResult {
  return {
    route: 'narration',
    skipLlm: false,
    resolution: { kind: 'narration', text: 'talk' },
    narration: { kind: 'social', status: 'persisted', prose: 'The warden scowls.' },
    projections: {
      scene: [],
      social: [
        {
          id: 's1',
          kind: 'npc',
          speakerId: 'npc-1',
          text: 'The warden scowls.',
          at: Date.now()
        }
      ]
    }
  }
}

function choiceCompleter(): TextCompleter {
  return {
    async completeText() {
      return {
        backend: 'test',
        text: [
          '<<<OPTION_A>>>Search the fog.<<</OPTION_A>>>',
          '<<<OPTION_B>>>Ask the warden.<<</OPTION_B>>>'
        ].join('\n')
      }
    }
  }
}

function minimalTurnDeps(): ResolveTurnDeps {
  return {
    completer: {
      async completeText() {
        return { text: '{"intent":"look","route":"narration"}', backend: 'test' }
      }
    },
    currency: {
      credit: () => ({ characterId: 'x', balance: 0 }),
      debit: () => ({ characterId: 'x', balance: 0 }),
      getBalance: () => 0,
      clampProposedPrice: (n) => n
    },
    travel: stubTravel(),
    destinations: {
      isGenerated: () => true,
      resolvePlacement: (destinationId) => ({
        regionId: destinationId,
        placeId: destinationId,
        locationKind: 'settlement'
      })
    },
    narration: {
      llm: {
        async completeText() {
          return { text: 'The room brightens.\n<<<CLAIMS\n>>>', backend: 'test' }
        }
      },
      npcs: { getNpc: () => undefined },
      items: { hasItem: () => true },
      locations: { isKnownLocation: () => true }
    },
    combat: stubCombat(),
    persist: () => undefined
  }
}

function stubTravel(): ResolveTurnDeps['travel'] {
  return {
    advanceTravelDays: (campaignId, days) => ({ campaignId, advancedDays: days, day: days }),
    setCharacterLocation: (input) => ({
      characterId: input.characterId,
      campaignId: input.campaignId,
      regionId: input.regionId,
      locationKind: input.locationKind
    })
  }
}

function stubCombat(): ResolveTurnDeps['combat'] {
  const boom = (): never => {
    throw new Error('no combat')
  }
  return {
    getEncounter: () => undefined,
    startEncounter: boom,
    startAdHocEncounter: boom,
    resolveEncounter: boom,
    submitCombatAction: boom,
    resolveAttack: boom,
    attemptFlee: boom,
    applySurrender: boom,
    resolveNonLethalVictory: boom,
    executeHelplessCombatant: boom
  }
}
