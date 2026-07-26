import { beforeEach, describe, expect, it } from 'vitest'
import type { FillAndValidateResult, TextCompleter } from '@weaver/narration-engine'
import {
  confirmOpeningScene,
  exportGuidedCreationStates,
  generateOpeningScene,
  getGuidedCreationState,
  importGuidedCreationStates,
  resetGuidedCreationStateStore,
  startGuidedIdentity,
  submitGuidedIdentityMessage,
  type CharacterIdentityGroundingApi,
  type GuidedCreationNarrationApi,
  type GuidedCreationState
} from './index.js'

beforeEach(() => {
  resetGuidedCreationStateStore()
})

describe('guided identity phase sequencing', () => {
  it('walks who, why, where, what sequentially through NarrationEngine replies', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })
    const narration = scriptedNarration([
      'Race: elf. Background: outlander. Archetype: ranger. I am a watcher.',
      'Race: elf. Background: outlander. Archetype: ranger. I travel for a debt.',
      'Race: elf. Background: outlander. Archetype: ranger. I came from pines.',
      'Race: elf. Background: outlander. Archetype: ranger. I carry quiet courage.'
    ])

    const replies = []
    for (const message of identityMessages()) {
      replies.push(await submitIdentity(message, narration))
    }

    expect(replies.map((reply) => reply.phase)).toEqual(['why', 'where', 'what', 'opening_scene'])
    expect(narration.phases).toEqual(['who', 'why', 'where', 'what'])
    expect(getGuidedCreationState('pc-1')?.transcript).toHaveLength(8)
  })
})

describe('guided identity resume state', () => {
  it('exports and imports guidedCreationPhase state for resume mid-onboarding', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })
    const narration = scriptedNarration([
      'Race: elf. Background: outlander. Archetype: ranger. I remember home.'
    ])
    await submitIdentity('Who am I?', narration)

    const saved = exportGuidedCreationStates()
    resetGuidedCreationStateStore()
    importGuidedCreationStates(saved)

    expect(getGuidedCreationState('pc-1')?.guidedCreationPhase).toBe('why')
    expect(getGuidedCreationState('pc-1')?.transcript[1]).toMatchObject({
      speaker: 'dm',
      phase: 'who'
    })
  })
})

describe('guided opening scene confirmation', () => {
  it('generates an opening scene and only unlocks world entry after confirmation', async () => {
    importGuidedCreationStates([openingSceneReadyState()])

    const scene = await generateOpeningScene(
      { characterId: 'pc-1' },
      openingNarration('Race: elf. Background: outlander. Archetype: ranger. Dawn finds Ilyra.'),
      scriptedCompleter()
    )

    expect(scene).toEqual({
      ok: true,
      prose: 'Race: elf. Background: outlander. Archetype: ranger. Dawn finds Ilyra.',
      errors: []
    })
    expect(getGuidedCreationState('pc-1')?.enterWorldUnlocked).toBe(false)

    const confirmed = confirmOpeningScene({ characterId: 'pc-1' })
    expect(confirmed.guidedCreationPhase).toBe('complete')
    expect(confirmed.enterWorldUnlocked).toBe(true)
  })
})

describe('guided identity mechanical guard', () => {
  it('propagates NarrationEngine rejection of mechanical-stat decisions', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })
    const narration = rejectedNarration('No mechanical stats are decided by guided identity chat.')
    const result = await submitIdentity('What can I do?', narration)

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('No mechanical stats are decided by guided identity chat.')
    expect(getGuidedCreationState('pc-1')?.guidedCreationPhase).toBe('who')
  })

  it('rejects successful-looking replies that assign mechanical stats', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })
    const narration = scriptedNarration([
      'Race: elf. Background: outlander. Archetype: ranger. Body 16 opens every door.'
    ])

    const result = await submitIdentity('What can I do?', narration)

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('No mechanical stats are decided by guided identity chat.')
    expect(getGuidedCreationState('pc-1')?.guidedCreationPhase).toBe('who')
  })

  it('rejects opening scenes that assign mechanical stats', async () => {
    importGuidedCreationStates([openingSceneReadyState()])

    const result = await generateOpeningScene(
      { characterId: 'pc-1' },
      openingNarration('Race: elf. Background: outlander. Archetype: ranger. Level 3 hero arrives.'),
      scriptedCompleter()
    )

    expect(result.ok).toBe(false)
    expect(result.errors).toContain('No mechanical stats are decided by guided identity chat.')
    expect(getGuidedCreationState('pc-1')?.openingScene).toBeUndefined()
  })
})

describe('guided identity rejection paths', () => {
  it('rejects empty player messages before calling NarrationEngine', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })
    const narration = scriptedNarration(['unused'])

    await expect(submitIdentity('   ', narration)).rejects.toThrow(
      'Guided identity message must not be empty.'
    )
    expect(narration.phases).toEqual([])
  })

  it('rejects identity messages once the flow reaches the opening scene phase', async () => {
    importGuidedCreationStates([openingSceneReadyState()])

    await expect(submitIdentity('Can I still revise?', scriptedNarration(['unused']))).rejects.toThrow(
      'Guided identity chat is not accepting messages during opening_scene.'
    )
  })

  it('treats successful NarrationEngine replies without prose as rejected replies', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })

    const result = await submitIdentity('Who am I?', narrationWithoutProse())

    expect(result).toEqual({ ok: false, phase: 'who', errors: [] })
    expect(getGuidedCreationState('pc-1')?.guidedCreationPhase).toBe('who')
  })
})

describe('guided opening scene error paths', () => {
  it('requires all identity phases before generating an opening scene', async () => {
    startGuidedIdentity({ campaignId: 'camp-1', characterId: 'pc-1' })

    await expect(generateOpeningScene(
      { characterId: 'pc-1' },
      openingNarration('unused'),
      scriptedCompleter()
    )).rejects.toThrow('Opening scene requires completed guided identity phases.')
  })

  it('returns validation errors when the opening scene token is missing', async () => {
    importGuidedCreationStates([openingSceneReadyState()])

    const invalid = await generateOpeningScene(
      { characterId: 'pc-1' },
      openingNarrationResult({ ok: false, filled: {}, errors: ['missing OPENING_SCENE'] }),
      scriptedCompleter()
    )
    const missing = await generateOpeningScene(
      { characterId: 'pc-1' },
      openingNarrationResult({ ok: true, filled: {}, filledText: '', errors: [] }),
      scriptedCompleter()
    )

    expect(invalid).toEqual({ ok: false, errors: ['missing OPENING_SCENE'] })
    expect(missing).toEqual({ ok: false, errors: [] })
  })

  it('requires a generated scene before confirmation and is idempotent after completion', () => {
    importGuidedCreationStates([openingSceneReadyState()])

    expect(() => confirmOpeningScene({ characterId: 'pc-1' })).toThrow(
      'Opening scene must be generated before entering the world.'
    )

    importGuidedCreationStates([{ ...openingSceneReadyState(), openingScene: 'A road waits.' }])
    const confirmed = confirmOpeningScene({ characterId: 'pc-1' })
    const confirmedAgain = confirmOpeningScene({ characterId: 'pc-1' })

    expect(confirmed.enterWorldUnlocked).toBe(true)
    expect(confirmedAgain).toEqual(confirmed)
  })
})

describe('guided creation state import and export', () => {
  it('clones imported and exported states including generated opening scenes', () => {
    const original = { ...openingSceneReadyState(), openingScene: 'A road waits.' }
    const imported = importGuidedCreationStates([original])
    original.transcript[0] = { speaker: 'player', phase: 'who', text: 'mutated' }
    imported[0]?.transcript.push({ speaker: 'dm', phase: 'who', text: 'mutated' })

    const exported = exportGuidedCreationStates()

    expect(exported[0]?.openingScene).toBe('A road waits.')
    expect(exported[0]?.transcript).toHaveLength(2)
    expect(exported[0]?.transcript[0]?.text).toBe('I am Ilyra.')
  })

  it('rejects blank ids and missing started state', () => {
    expect(() => startGuidedIdentity({ campaignId: '', characterId: 'pc-1' })).toThrow(
      'Guided creation requires campaignId.'
    )
    expect(() => startGuidedIdentity({ campaignId: 'camp-1', characterId: ' ' })).toThrow(
      'Guided creation requires characterId.'
    )
    expect(() => confirmOpeningScene({ characterId: 'missing' })).toThrow(
      'Guided creation has not started for character missing.'
    )
  })
})

function submitIdentity(message: string, narration: GuidedCreationNarrationApi) {
  return submitGuidedIdentityMessage(
    { characterId: 'pc-1', message },
    narration,
    scriptedCompleter(),
    characterApi()
  )
}

function identityMessages(): string[] {
  return ['Who am I?', 'Why do I go?', 'Where am I from?', 'What defines me?']
}

function openingSceneReadyState(): GuidedCreationState {
  return {
    campaignId: 'camp-1',
    characterId: 'pc-1',
    guidedCreationPhase: 'opening_scene',
    transcript: [
      { speaker: 'player', phase: 'who', text: 'I am Ilyra.' },
      {
        speaker: 'dm',
        phase: 'who',
        text: 'Race: elf. Background: outlander. Archetype: ranger. Ilyra listens.'
      }
    ],
    characterFacts: facts(),
    enterWorldUnlocked: false
  }
}

function facts(): Record<string, string> {
  return {
    race: 'elf',
    background: 'outlander',
    archetype: 'ranger',
    gear: 'longbow, bedroll',
    companions: 'Lyra the ranger'
  }
}

function characterApi(): CharacterIdentityGroundingApi {
  return {
    getCharacterIdentity: () => ({
      race: {
        campaignId: 'camp-1',
        characterId: 'pc-1',
        raceId: 'elf',
        name: 'elf',
        lore: 'forest kin'
      },
      background: {
        campaignId: 'camp-1',
        characterId: 'pc-1',
        backgroundId: 'outlander',
        name: 'outlander',
        description: 'wilderness survivor'
      }
    }),
    getCharacterArchetype: () => 'ranger',
    getCharacterStartingLoadout: () => ({
      characterId: 'pc-1',
      archetype: 'ranger',
      level: 1,
      catalogVersion: 'test',
      items: [
        { templateId: 'longbow', quantity: 1 },
        { templateId: 'bedroll', quantity: 1 }
      ],
      actionIds: ['ranged-shot']
    }),
    getCompanionOnboardingStatus: () => 'completed',
    listCompanions: () => [
      {
        characterId: 'companion-1',
        ownerCharacterId: 'pc-1',
        campaignId: 'camp-1',
        name: 'Lyra',
        isCompanion: true,
        archetype: 'ranger'
      }
    ]
  }
}

function scriptedNarration(replies: string[]) {
  const phases: string[] = []
  const api: GuidedCreationNarrationApi & { phases: string[] } = {
    phases,
    generateGuidedIdentityReply: async (input) => {
      phases.push(input.phase)
      const prose = replies.shift()
      return prose === undefined ? { ok: false, errors: ['missing scripted reply'] } : { ok: true, prose, errors: [] }
    },
    fillAndValidate: async () => ({ ok: false, filled: {}, errors: ['not scripted'] })
  }
  return api
}

function rejectedNarration(error: string): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply: async () => ({ ok: false, errors: [error] }),
    fillAndValidate: async () => ({ ok: false, filled: {}, errors: ['not scripted'] })
  }
}

function narrationWithoutProse(): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply: async () => ({ ok: true, errors: [] }),
    fillAndValidate: async () => ({ ok: false, filled: {}, errors: ['not scripted'] })
  }
}

function openingNarration(prose: string): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply: async () => ({ ok: false, errors: ['not scripted'] }),
    fillAndValidate: async () => ({
      ok: true,
      filled: { OPENING_SCENE: prose },
      filledText: prose,
      errors: []
    })
  }
}

function openingNarrationResult(result: FillAndValidateResult): GuidedCreationNarrationApi {
  return {
    generateGuidedIdentityReply: async () => ({ ok: false, errors: ['not scripted'] }),
    fillAndValidate: async () => result
  }
}

function scriptedCompleter(): TextCompleter {
  return {
    completeText: async () => ({ text: '', backend: 'scripted' })
  }
}
