import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  createJsonEncounterStore,
  endTurn,
  getEncounter,
  startEncounter,
  submitCombatAction,
  submitMovement,
  type EncounterCombatantInput
} from './index.js'

describe('CombatEngine encounter lifecycle — initiative', () => {
  it('rolls initiative once and stores a stable turn order', () => {
    withEncounterTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      const rolls = [4, 10, 10]
      const encounter = startEncounter(
        {
          encounterId: 'enc-stable',
          combatants: combatants(),
          store
        },
        { roller: () => rolls.shift() ?? 1 }
      )

      expect(encounter.turnOrder).toEqual(['npc-fast', 'enemy-slow', 'hero'])
      expect(encounter.combatants.map(({ id, initiative }) => ({ id, initiative }))).toEqual([
        { id: 'hero', initiative: { roll: 4, modifier: 1, total: 5 } },
        { id: 'npc-fast', initiative: { roll: 10, modifier: 3, total: 13 } },
        { id: 'enemy-slow', initiative: { roll: 10, modifier: -1, total: 9 } }
      ])
      expect(getEncounter({ encounterId: 'enc-stable', store })?.turnOrder).toEqual(encounter.turnOrder)
      expect(rolls).toHaveLength(0)
    })
  })
})

describe('CombatEngine encounter lifecycle — persistence', () => {
  it('persists active encounter state to a queryable JSON file', () => {
    withEncounterTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })

      startEncounter({ encounterId: 'enc-file', combatants: combatants(), store }, { roller: () => 8 })
      const freshStore = createJsonEncounterStore({ dataRoot })
      const persisted = getEncounter({ encounterId: 'enc-file', store: freshStore })

      expect(persisted).toMatchObject({
        encounterId: 'enc-file',
        status: 'active',
        startMode: 'pre-authored',
        currentTurnIndex: 0,
        round: 1,
        turnOrder: ['npc-fast', 'hero', 'enemy-slow']
      })
      expect(readFileSync(join(dataRoot, 'combat', 'encounters', 'enc-file.json'), 'utf8')).toContain(
        '"encounterId": "enc-file"'
      )
    })
  })
})

describe('CombatEngine encounter lifecycle — turn actions', () => {
  it('allows one typed free-text Action and one Movement per turn', () => {
    withEncounterTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      startEncounter({ encounterId: 'enc-turn', combatants: combatants(), store }, { roller: () => 10 })

      const acted = submitCombatAction({
        encounterId: 'enc-turn',
        combatantId: 'npc-fast',
        action: { type: 'typed-action', action: 'Slash with a curved blade' },
        store
      })
      const moved = submitMovement({
        encounterId: 'enc-turn',
        combatantId: 'npc-fast',
        movement: { description: 'Duck behind the wagon', distanceFeet: 20 },
        store
      })

      expect(acted.currentTurn.actionUsed).toBe(true)
      expect(moved.currentTurn.movementUsed).toBe(true)
      expect(moved.turnLog.map((entry) => entry.kind)).toEqual(['action', 'movement'])
      expect(() =>
        submitCombatAction({
          encounterId: 'enc-turn',
          combatantId: 'npc-fast',
          action: { type: 'typed-action', action: 'Strike again' },
          store
        })
      ).toThrow(/already used an Action/)
    })
  })

  it('advances turns and resets Action and Movement slots', () => {
    withEncounterTempDir((dataRoot) => {
      const store = createJsonEncounterStore({ dataRoot })
      startEncounter({ encounterId: 'enc-next', combatants: combatants(), store }, { roller: () => 10 })
      submitCombatAction({
        encounterId: 'enc-next',
        combatantId: 'npc-fast',
        action: { type: 'typed-action', action: 'First turn attack' },
        store
      })

      const next = endTurn({ encounterId: 'enc-next', combatantId: 'npc-fast', store })

      expect(next.currentTurn).toEqual({
        combatantId: 'hero',
        actionUsed: false,
        movementUsed: false
      })
      expect(next.round).toBe(1)
    })
  })
})

function withEncounterTempDir(run: (dataRoot: string) => void): void {
  const dataRoot = mkdtempSync(join(tmpdir(), 'weaver-combat-'))
  try {
    run(dataRoot)
  } finally {
    rmSync(dataRoot, { recursive: true, force: true })
  }
}

function combatants(): readonly EncounterCombatantInput[] {
  return [
    {
      id: 'hero',
      kind: 'character',
      displayName: 'Hero',
      abilityScores: { Body: 10, Agility: 12, Mind: 10, Presence: 10 }
    },
    {
      id: 'npc-fast',
      kind: 'npc',
      displayName: 'Fast NPC',
      abilityScores: { Body: 10, Agility: 16, Mind: 10, Presence: 10 }
    },
    {
      id: 'enemy-slow',
      kind: 'enemy',
      displayName: 'Slow Enemy',
      abilityScores: { Body: 12, Agility: 8, Mind: 8, Presence: 8 }
    }
  ]
}
