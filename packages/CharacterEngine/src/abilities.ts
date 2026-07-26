export const ABILITIES = ['Body', 'Agility', 'Mind', 'Presence'] as const

export type Ability = (typeof ABILITIES)[number]
export type AbilityScores = Record<Ability, number>
export type RollMode = 'normal' | 'advantage' | 'disadvantage'
export type D20Roller = () => number

export type AbilityResolutionInput = {
  ability: Ability
  scores: AbilityScores
  proficient: boolean
  proficiencyBonus: number
  target: number
  rollMode?: RollMode
}

export type AbilityResolutionResult = {
  ability: Ability
  rollMode: RollMode
  rolls: readonly number[]
  selectedRoll: number
  abilityModifier: number
  proficiencyBonusApplied: number
  total: number
  target: number
  success: boolean
}

export type ArmorClassInput = {
  agilityScore: number
  armorBonus: number
}

type D20Rolls = readonly [number] | readonly [number, number]

export function isAbility(value: unknown): value is Ability {
  return typeof value === 'string' && ABILITIES.some((ability) => ability === value)
}

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function calculateArmorClass(input: ArmorClassInput): number {
  return 10 + getAbilityModifier(input.agilityScore) + input.armorBonus
}

export function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

export function resolveAbilityCheck(
  input: AbilityResolutionInput,
  roller: D20Roller = rollD20
): AbilityResolutionResult {
  const rollMode = input.rollMode ?? 'normal'
  const rolls = rollForMode(rollMode, roller)
  const selectedRoll = selectRoll(rollMode, rolls)
  const abilityModifier = getAbilityModifier(input.scores[input.ability])
  const proficiencyBonusApplied = input.proficient ? input.proficiencyBonus : 0
  const total = selectedRoll + abilityModifier + proficiencyBonusApplied

  return {
    ability: input.ability,
    rollMode,
    rolls,
    selectedRoll,
    abilityModifier,
    proficiencyBonusApplied,
    total,
    target: input.target,
    success: total >= input.target
  }
}

function rollForMode(rollMode: RollMode, roller: D20Roller): D20Rolls {
  const first = assertD20Roll(roller())
  if (rollMode === 'normal') {
    return [first]
  }
  return [first, assertD20Roll(roller())]
}

function selectRoll(rollMode: RollMode, rolls: D20Rolls): number {
  if (rollMode === 'advantage') {
    return Math.max(...rolls)
  }
  if (rollMode === 'disadvantage') {
    return Math.min(...rolls)
  }
  return rolls[0]
}

function assertD20Roll(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new Error(`D20 roller returned invalid roll: ${roll}`)
  }
  return roll
}
