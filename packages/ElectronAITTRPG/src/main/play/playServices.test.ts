import { describe, expect, it } from 'vitest'
import type { AskTheDmInput, ResolveTurnInput, ResolveTurnResult } from '@weaver/dm-engine'
import type { EncounterState } from '@weaver/combat-engine'
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
      deps: {}
    })

    await expect(
      service.submitAction({ campaignId: 'camp-1', characterId: 'pc-1', text: 'look around' })
    ).resolves.toMatchObject({
      scene: [{ id: 'scene-1', text: 'The door opens.' }],
      social: [{ id: 'social-1', text: 'This way.' }],
      roll: { visible: true, label: 'narration check' }
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
      combatant('pc-1', 'character', 'Ilyra', 7, 10, []),
      combatant('goblin', 'enemy', 'Goblin', 3, 6, ['restrained'])
    ]
  }
}

function combatant(
  id: string,
  kind: 'character' | 'enemy',
  displayName: string,
  current: number,
  max: number,
  conditions: ['restrained'] | []
) {
  return {
    id,
    kind,
    displayName,
    abilityScores: { Body: 10, Agility: 10, Mind: 10, Presence: 10 },
    hp: { current, max },
    armorClass: 12,
    conditions,
    characterConditions: [],
    damageResistances: [],
    damageVulnerabilities: [],
    initiative: { roll: 10, modifier: 0, total: 10 }
  }
}
