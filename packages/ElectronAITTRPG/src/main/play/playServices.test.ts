import { describe, expect, it } from 'vitest'
import type { AskTheDmInput, ResolveTurnInput, ResolveTurnResult } from '@weaver/dm-engine'
import type { CombatConditionId, EncounterCombatant, EncounterState } from '@weaver/combat-engine'
import { createAskDmService } from './askDmService.js'
import { buildCombatChrome } from './combatChrome.js'
import { createTurnService } from './turnService.js'

describe('turnService', () => {
  it('maps a resolved turn into independently renderable scene and social columns', async () => {
    const service = createTurnService({
      resolveTurn: async (input: ResolveTurnInput): Promise<ResolveTurnResult> => ({
        route: input.text.includes('attack') ? 'combat' : 'narration',
        skipLlm: false,
        resolution: { kind: 'narration', text: input.text },
        narration: { kind: 'scene', status: 'persisted', prose: 'The door opens.' },
        projections: {
          scene: [{ id: 'scene-1', text: 'The door opens.', at: 1 }],
          social: [{ id: 'social-1', kind: 'npc', speakerId: 'mira', text: 'This way.', at: 2 }]
        }
      }),
      deps: {},
      getEncounter: () => activeEncounter()
    })

    await expect(
      service.submitAction({ campaignId: 'camp-1', characterId: 'pc-1', text: 'look around' })
    ).resolves.toMatchObject({
      ok: true,
      scene: [{ id: 'scene-1', text: 'The door opens.' }],
      social: [{ id: 'social-1', text: 'This way.' }],
      roll: { visible: true, label: 'narration check', roll: 12 }
    })

    await expect(
      service.submitAction({
        campaignId: 'camp-1',
        characterId: 'pc-1',
        text: 'attack goblin',
        encounterId: 'enc-1'
      })
    ).resolves.toMatchObject({
      ok: true,
      combat: { active: true, encounterId: 'enc-1' },
      roll: { visible: true, label: 'combat check', roll: 16 }
    })
  })
})

describe('askDmService', () => {
  it('calls askTheDm for out-of-character questions and returns OOC history', async () => {
    const service = createAskDmService({
      askTheDm: async (input: AskTheDmInput) => ({
        ok: true,
        answer: `OOC:${input.question}`,
        history: {
          campaignId: input.campaignId,
          characterId: input.characterId,
          entries: [{ speaker: 'dm', text: 'OOC answer' }]
        },
        errors: []
      }),
      narration: { fillAndValidate: async () => ({ ok: true, filled: { ANSWER: 'ok' }, errors: [] }) },
      completer: { completeText: async () => ({ text: 'ok', backend: 'test' }) },
      facts: () => ({ rule: 'ask-dm does not mutate fiction' })
    })

    await expect(
      service.ask({ campaignId: 'camp-1', characterId: 'pc-1', question: 'Can I grapple?' })
    ).resolves.toMatchObject({
      answer: 'OOC:Can I grapple?',
      entries: [{ speaker: 'dm', text: 'OOC answer' }]
    })
  })

  it('surfaces Ask-the-DM validation errors without inventing an answer', async () => {
    const service = createAskDmService({
      askTheDm: async () => ({ ok: false, errors: ['Ask-the-DM question must not be empty.'] }),
      narration: { fillAndValidate: async () => ({ ok: true, filled: {}, errors: [] }) },
      completer: { completeText: async () => ({ text: 'ok', backend: 'test' }) },
      facts: () => ({})
    })

    await expect(
      service.ask({ campaignId: 'camp-1', characterId: 'pc-1', question: '?' })
    ).resolves.toEqual({
      answer: '',
      entries: [],
      errors: ['Ask-the-DM question must not be empty.']
    })
  })
})

describe('combatChrome', () => {
  it('shows turn order, hit points, and conditions for active encounters only', () => {
    expect(buildCombatChrome(activeEncounter())).toEqual({
      active: true,
      encounterId: 'enc-1',
      round: 2,
      activeCombatantId: 'pc-1',
      turnOrder: [
        { combatantId: 'pc-1', displayName: 'Ilyra', isActive: true, hp: { current: 7, max: 10 }, conditions: [] },
        {
          combatantId: 'goblin',
          displayName: 'Goblin',
          isActive: false,
          hp: { current: 3, max: 6 },
          conditions: ['restrained']
        }
      ]
    })
    expect(buildCombatChrome({ ...activeEncounter(), status: 'resolved' })).toEqual({ active: false })
    expect(buildCombatChrome(undefined)).toEqual({ active: false })
  })

  it('falls back to combatant id when displayName is missing and rejects unknown ids', () => {
    const encounter = activeEncounter()
    encounter.combatants[0] = combatant({ id: 'pc-1', kind: 'character', current: 7, max: 10 })
    const chrome = buildCombatChrome(encounter)
    expect(chrome.active ? chrome.turnOrder[0]?.displayName : undefined).toBe('pc-1')

    expect(() =>
      buildCombatChrome({ ...activeEncounter(), turnOrder: ['missing'] })
    ).toThrow(/unknown combatant missing/)
  })
})

function activeEncounter(): EncounterState {
  return {
    encounterId: 'enc-1',
    status: 'active',
    startMode: 'pre-authored',
    round: 2,
    currentTurnIndex: 0,
    currentTurn: { combatantId: 'pc-1', actionUsed: false, movementUsed: false },
    turnOrder: ['pc-1', 'goblin'],
    turnLog: [],
    combatants: [
      combatant({ id: 'pc-1', kind: 'character', displayName: 'Ilyra', current: 7, max: 10 }),
      combatant({
        id: 'goblin',
        kind: 'enemy',
        displayName: 'Goblin',
        current: 3,
        max: 6,
        conditions: ['restrained']
      })
    ]
  }
}

function combatant(input: {
  id: string
  kind: 'character' | 'enemy'
  displayName?: string
  current: number
  max: number
  conditions?: CombatConditionId[]
}): EncounterCombatant {
  return {
    id: input.id,
    kind: input.kind,
    ...(input.displayName === undefined ? {} : { displayName: input.displayName }),
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    hp: { current: input.current, max: input.max },
    armorClass: 12,
    conditions: input.conditions ?? [],
    characterConditions: [],
    damageResistances: [],
    damageVulnerabilities: [],
    initiative: { roll: 10, modifier: 0, total: 10 }
  }
}
