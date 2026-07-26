import type { Ability, RollMode } from './abilities.js'

export const CONDITIONS = ['Prone', 'Stunned', 'Poisoned', 'Restrained', 'Unconscious'] as const

export type Condition = (typeof CONDITIONS)[number]

export type AttacksAgainstMode = RollMode | 'meleeAdvantageRangedDisadvantage'

export type ConditionEffect = {
  canAct: boolean
  canMove: boolean
  crawlOnly: boolean
  speedZero: boolean
  attackRollMode: RollMode
  attacksAgainst: AttacksAgainstMode
  autoFailAbilitySaves: readonly Ability[]
  abilityCheckDisadvantage: boolean
  agilitySaveDisadvantage: boolean
  meleeHitsAreCritical: boolean
  impliesConditions: readonly Condition[]
}

export const CONDITION_EFFECTS: Readonly<Record<Condition, ConditionEffect>> = {
  Prone: {
    canAct: true,
    canMove: true,
    crawlOnly: true,
    speedZero: false,
    attackRollMode: 'disadvantage',
    attacksAgainst: 'meleeAdvantageRangedDisadvantage',
    autoFailAbilitySaves: [],
    abilityCheckDisadvantage: false,
    agilitySaveDisadvantage: false,
    meleeHitsAreCritical: false,
    impliesConditions: []
  },
  Stunned: {
    canAct: false,
    canMove: false,
    crawlOnly: false,
    speedZero: true,
    attackRollMode: 'normal',
    attacksAgainst: 'advantage',
    autoFailAbilitySaves: ['Body', 'Agility'],
    abilityCheckDisadvantage: false,
    agilitySaveDisadvantage: false,
    meleeHitsAreCritical: false,
    impliesConditions: []
  },
  Poisoned: {
    canAct: true,
    canMove: true,
    crawlOnly: false,
    speedZero: false,
    attackRollMode: 'disadvantage',
    attacksAgainst: 'normal',
    autoFailAbilitySaves: [],
    abilityCheckDisadvantage: true,
    agilitySaveDisadvantage: false,
    meleeHitsAreCritical: false,
    impliesConditions: []
  },
  Restrained: {
    canAct: true,
    canMove: false,
    crawlOnly: false,
    speedZero: true,
    attackRollMode: 'disadvantage',
    attacksAgainst: 'advantage',
    autoFailAbilitySaves: [],
    abilityCheckDisadvantage: false,
    agilitySaveDisadvantage: true,
    meleeHitsAreCritical: false,
    impliesConditions: []
  },
  Unconscious: {
    canAct: false,
    canMove: false,
    crawlOnly: false,
    speedZero: true,
    attackRollMode: 'normal',
    attacksAgainst: 'advantage',
    autoFailAbilitySaves: ['Body', 'Agility'],
    abilityCheckDisadvantage: false,
    agilitySaveDisadvantage: false,
    meleeHitsAreCritical: true,
    impliesConditions: ['Prone']
  }
}

const NEUTRAL_EFFECT: ConditionEffect = {
  canAct: true,
  canMove: true,
  crawlOnly: false,
  speedZero: false,
  attackRollMode: 'normal',
  attacksAgainst: 'normal',
  autoFailAbilitySaves: [],
  abilityCheckDisadvantage: false,
  agilitySaveDisadvantage: false,
  meleeHitsAreCritical: false,
  impliesConditions: []
}

export function listConditions(): Condition[] {
  return [...CONDITIONS]
}

export function isCondition(value: unknown): value is Condition {
  return typeof value === 'string' && CONDITIONS.some((entry) => entry === value)
}

export function getConditionEffect(condition: Condition): ConditionEffect {
  return CONDITION_EFFECTS[condition]
}

export function mergeConditionEffects(conditions: readonly Condition[]): ConditionEffect {
  return conditions.reduce(mergeTwoEffects, NEUTRAL_EFFECT)
}

function mergeTwoEffects(left: ConditionEffect, condition: Condition): ConditionEffect {
  const right = CONDITION_EFFECTS[condition]
  return {
    canAct: left.canAct && right.canAct,
    canMove: left.canMove && right.canMove,
    crawlOnly: left.crawlOnly || right.crawlOnly,
    speedZero: left.speedZero || right.speedZero,
    attackRollMode: worseRollMode(left.attackRollMode, right.attackRollMode),
    attacksAgainst: mergeAttacksAgainst(left.attacksAgainst, right.attacksAgainst),
    autoFailAbilitySaves: uniqueAbilities([
      ...left.autoFailAbilitySaves,
      ...right.autoFailAbilitySaves
    ]),
    abilityCheckDisadvantage: left.abilityCheckDisadvantage || right.abilityCheckDisadvantage,
    agilitySaveDisadvantage: left.agilitySaveDisadvantage || right.agilitySaveDisadvantage,
    meleeHitsAreCritical: left.meleeHitsAreCritical || right.meleeHitsAreCritical,
    impliesConditions: uniqueConditions([
      ...left.impliesConditions,
      ...right.impliesConditions
    ])
  }
}

function worseRollMode(left: RollMode, right: RollMode): RollMode {
  if (left === 'disadvantage' || right === 'disadvantage') {
    return 'disadvantage'
  }
  if (left === 'advantage' || right === 'advantage') {
    return 'advantage'
  }
  return 'normal'
}

function mergeAttacksAgainst(left: AttacksAgainstMode, right: AttacksAgainstMode): AttacksAgainstMode {
  if (left === right) {
    return left
  }
  if (left === 'meleeAdvantageRangedDisadvantage' || right === 'meleeAdvantageRangedDisadvantage') {
    return left === 'advantage' || right === 'advantage'
      ? 'advantage'
      : 'meleeAdvantageRangedDisadvantage'
  }
  if (left === 'advantage' || right === 'advantage') {
    return 'advantage'
  }
  if (left === 'disadvantage' || right === 'disadvantage') {
    return 'disadvantage'
  }
  return 'normal'
}

function uniqueAbilities(abilities: readonly Ability[]): Ability[] {
  return (['Body', 'Agility', 'Mind', 'Presence'] as const).filter((ability) =>
    abilities.includes(ability)
  )
}

function uniqueConditions(conditions: readonly Condition[]): Condition[] {
  return CONDITIONS.filter((condition) => conditions.includes(condition))
}
