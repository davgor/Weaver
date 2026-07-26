import { describe, expect, it } from 'vitest'
import type { EncounterCombatantInput, EncounterState } from '@weaver/combat-engine'
import { finalizeCombatResolution, resolveEncounterLoop } from './encounterLoop.js'
import type { CombatTurnApi } from '../turnRouting/types.js'

describe('resolveEncounterLoop encounter start', () => {
  it('starts an ad-hoc encounter when combat routing has no active encounter id', () => {
    const combat = fakeCombatApi()
    const result = resolveEncounterLoop({
      branch: {
        combat,
        combatantId: 'hero',
        combatAction: 'draw steel'
      },
      context: {
        campaignId: 'camp-start',
        characterId: 'hero',
        text: 'attack the goblin'
      },
      encounterStart: {
        mode: 'adHoc',
        knownCombatants: [combatant('hero', 'character'), combatant('goblin', 'enemy')]
      },
      createEncounterId: () => 'enc-generated'
    })

    expect(result.kind).toBe('combat')
    expect(combat.startedAdHocIds).toEqual(['enc-generated'])
    expect(combat.submittedEncounterIds).toEqual(['enc-generated'])
  })
})

describe('finalizeCombatResolution victory rewards', () => {
  it('awards XP, surfaces level-up numbers, and preserves outcome loot after victory', () => {
    const combat = fakeCombatApi()
    const result = finalizeCombatResolution({
      resolution: {
        kind: 'combat',
        encounter: resolvedEncounter('enc-victory'),
        outcome: {
          type: 'execute',
          targetId: 'goblin',
          loot: [{ templateId: 'template.healing_potion', quantity: 1 }]
        }
      },
      combat,
      characterId: 'hero',
      rewards: { xpDifficulty: 'impossible' },
      progression: {
        awardXp: (characterId, difficulty) => ({
          characterId,
          level: 2,
          xp: 0,
          xpAwarded: difficulty === 'impossible' ? 100 : 0,
          levelsGained: 1
        })
      }
    })

    expect(result.rewards).toEqual({
      xp: { characterId: 'hero', level: 2, xp: 0, xpAwarded: 100, levelsGained: 1 },
      loot: [{ templateId: 'template.healing_potion', quantity: 1 }],
      levelUp: { fromLevel: 1, toLevel: 2, levelsGained: 1, xp: 0, xpAwarded: 100 }
    })
  })
})

describe('finalizeCombatResolution flee cleanup', () => {
  it('closes an active encounter when the last character flees without awarding victory XP', () => {
    const combat = fakeCombatApi()
    const activeAfterFlee = activeEncounter('enc-flee', [
      combatant('hero', 'character', ['fled']),
      combatant('goblin', 'enemy')
    ])

    const result = finalizeCombatResolution({
      resolution: {
        kind: 'combat',
        encounter: activeAfterFlee,
        outcome: { type: 'flee', success: true, roll: 20, total: 20, dc: 12 }
      },
      combat,
      characterId: 'hero',
      rewards: { xpDifficulty: 'easy' },
      progression: {
        awardXp: () => {
          throw new Error('flee cleanup should not award victory XP')
        }
      }
    })

    expect(result.encounter.status).toBe('resolved')
    expect(combat.resolvedEncounterIds).toEqual(['enc-flee'])
    expect(result.rewards).toBeUndefined()
  })
})

describe('finalizeCombatResolution hostile defeat', () => {
  it('closes an active encounter after full hostile defeat before awarding XP', () => {
    const defeated = activeEncounter('enc-defeat', [
      combatant('hero', 'character'),
      combatant('goblin', 'enemy', ['down'])
    ])

    const result = finalizeCombatResolution({
      resolution: {
        kind: 'combat',
        encounter: defeated,
        outcome: {
          type: 'attack',
          hit: true,
          totalDamage: 12,
          critical: false,
          targetId: 'goblin',
          targetHp: { current: 0, max: 12 },
          conditions: ['down']
        }
      },
      combat: { resolveEncounter: () => ({ ...defeated, status: 'resolved' }) },
      characterId: 'hero',
      rewards: { xpDifficulty: 'hard' },
      progression: {
        awardXp: (characterId, difficulty) => ({
          characterId,
          level: 1,
          xp: difficulty === 'hard' ? 30 : 0,
          xpAwarded: 30,
          levelsGained: 0
        })
      }
    })

    expect(result.encounter.status).toBe('resolved')
    expect(result.rewards?.xp).toMatchObject({ characterId: 'hero', xpAwarded: 30 })
  })
})

type FakeCombatApi = CombatTurnApi & {
  startedAdHocIds: string[]
  submittedEncounterIds: string[]
  resolvedEncounterIds: string[]
}

function fakeCombatApi(): FakeCombatApi {
  const encounters = new Map<string, EncounterState>()
  const startedAdHocIds: string[] = []
  const submittedEncounterIds: string[] = []
  const resolvedEncounterIds: string[] = []
  return {
    startedAdHocIds,
    submittedEncounterIds,
    resolvedEncounterIds,
    getEncounter: (encounterId) => encounters.get(encounterId),
    startAdHocEncounter: (input) => startAdHoc(encounters, startedAdHocIds, input),
    startEncounter: (input) => startEncounterInStore(encounters, input),
    resolveEncounter: (encounterId) => resolveInStore(encounters, resolvedEncounterIds, encounterId),
    submitCombatAction: (input) => submitAction(encounters, submittedEncounterIds, input),
    resolveAttack: () => {
      throw new Error('resolveAttack should not run')
    },
    attemptFlee: () => {
      throw new Error('attemptFlee should not run')
    },
    applySurrender: () => {
      throw new Error('applySurrender should not run')
    },
    resolveNonLethalVictory: () => {
      throw new Error('resolveNonLethalVictory should not run')
    },
    executeHelplessCombatant: () => {
      throw new Error('executeHelplessCombatant should not run')
    }
  }
}

function startAdHoc(
  encounters: Map<string, EncounterState>,
  startedAdHocIds: string[],
  input: Parameters<CombatTurnApi['startAdHocEncounter']>[0]
): EncounterState {
  startedAdHocIds.push(input.encounterId)
  const encounter = activeEncounter(input.encounterId, toEncounterCombatants(input.knownCombatants ?? []))
  encounters.set(input.encounterId, encounter)
  return encounter
}

function startEncounterInStore(
  encounters: Map<string, EncounterState>,
  input: Parameters<CombatTurnApi['startEncounter']>[0]
): EncounterState {
  const encounter = activeEncounter(input.encounterId, toEncounterCombatants(input.combatants))
  encounters.set(input.encounterId, encounter)
  return encounter
}

function resolveInStore(
  encounters: Map<string, EncounterState>,
  resolvedEncounterIds: string[],
  encounterId: string
): EncounterState {
  resolvedEncounterIds.push(encounterId)
  const encounter = encounters.get(encounterId) ?? activeEncounter(encounterId, [])
  const resolved = { ...encounter, status: 'resolved' as const }
  encounters.set(encounterId, resolved)
  return resolved
}

function submitAction(
  encounters: Map<string, EncounterState>,
  submittedEncounterIds: string[],
  input: Parameters<CombatTurnApi['submitCombatAction']>[0]
): EncounterState {
  submittedEncounterIds.push(input.encounterId)
  return encounters.get(input.encounterId) ?? activeEncounter(input.encounterId, [])
}

function resolvedEncounter(encounterId: string): EncounterState {
  return { ...activeEncounter(encounterId, [combatant('hero', 'character')]), status: 'resolved' }
}

function activeEncounter(
  encounterId: string,
  combatants: EncounterState['combatants']
): EncounterState {
  return {
    encounterId,
    status: 'active',
    startMode: 'ad-hoc',
    combatants,
    turnOrder: combatants.map((entry) => entry.id),
    currentTurnIndex: 0,
    round: 1,
    currentTurn: { combatantId: combatants[0]?.id ?? 'hero', actionUsed: false, movementUsed: false },
    turnLog: []
  }
}

function combatant(
  id: string,
  kind: EncounterState['combatants'][number]['kind'],
  conditions: EncounterState['combatants'][number]['conditions'] = []
): EncounterState['combatants'][number] {
  return {
    id,
    kind,
    abilityScores: { Body: 10, Agility: 14, Mind: 10, Presence: 10 },
    initiative: { roll: 10, modifier: 2, total: 12 },
    conditions,
    characterConditions: [],
    damageResistances: [],
    damageVulnerabilities: []
  }
}

function toEncounterCombatants(inputs: readonly EncounterCombatantInput[]): EncounterState['combatants'] {
  return inputs.map((input) => combatant(input.id, input.kind, [...(input.conditions ?? [])]))
}
