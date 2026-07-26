import { computeMaxHp } from '@weaver/character-engine'
import { replaceNpc, requireNpc } from './store.js'
import type {
  DefeatDisposition,
  HydrateNpcCombatTierInput,
  NpcRecord,
  SetNpcDefeatDispositionInput
} from './types.js'

export function hydrateNpcCombatTier(input: HydrateNpcCombatTierInput): NpcRecord {
  const npc = requireNpc(input.npcId)
  const maxHp = computeMaxHp(input.hitDie, input.level, npc.abilityModifiers.Body, input.rolls)
  return replaceNpc({
    ...npc,
    combatStats: {
      kind: 'combatant',
      tierId: input.tierId,
      level: input.level,
      hitDie: input.hitDie,
      maxHp,
      currentHp: maxHp,
      ...optionalCombatNumbers(input)
    }
  })
}

export function setNpcDefeatDisposition(input: SetNpcDefeatDispositionInput): NpcRecord {
  const npc = requireNpc(input.npcId)
  return replaceNpc({ ...npc, defeatDisposition: defeatDisposition(input) })
}

function optionalCombatNumbers(input: HydrateNpcCombatTierInput) {
  return {
    ...(input.armorClass === undefined ? {} : { armorClass: input.armorClass }),
    ...(input.attackBonus === undefined ? {} : { attackBonus: input.attackBonus })
  }
}

function defeatDisposition(input: SetNpcDefeatDispositionInput): DefeatDisposition {
  return {
    disposition: input.disposition,
    dead: false,
    source: { ...input.source }
  }
}
