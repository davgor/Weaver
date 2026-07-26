export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

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

export type CharacterEngineApi = {
  id: 'CharacterEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

type D20Rolls = readonly [number] | readonly [number, number]

const PACKAGE_NAME = '@weaver/character-engine'
const VERSION = '0.1.0'

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

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'abilities',
      description: 'List the core player-character abilities',
      invoke: () => [...ABILITIES]
    },
    {
      name: 'abilityModifier',
      description: 'Calculate floor((score - 10) / 2) for an ability score',
      invoke: (payload) => getAbilityModifier(parseAbilityModifierPayload(payload).score)
    },
    {
      name: 'resolveAbilityCheck',
      description: 'Resolve d20 + ability modifier + optional proficiency vs target',
      invoke: (payload) => resolveAbilityCheck(parseResolutionPayload(payload))
    },
    {
      name: 'armorClass',
      description: 'Calculate 10 + Agility modifier + caller-supplied armor bonus',
      invoke: (payload) => calculateArmorClass(parseArmorClassPayload(payload))
    }
  ]
}

function parseAbilityModifierPayload(payload: unknown): { score: number } {
  const record = readRecord(payload, 'abilityModifier')
  return { score: readNumber(record, 'score') }
}

function parseArmorClassPayload(payload: unknown): ArmorClassInput {
  const record = readRecord(payload, 'armorClass')
  return {
    agilityScore: readNumber(record, 'agilityScore'),
    armorBonus: readNumber(record, 'armorBonus')
  }
}

function parseResolutionPayload(payload: unknown): AbilityResolutionInput {
  const record = readRecord(payload, 'resolveAbilityCheck')
  const base = {
    ability: readAbility(record['ability']),
    scores: readAbilityScores(record['scores']),
    proficient: readBoolean(record, 'proficient'),
    proficiencyBonus: readNumber(record, 'proficiencyBonus'),
    target: readNumber(record, 'target')
  }
  const rollMode = readRollMode(record)
  return rollMode === undefined ? base : { ...base, rollMode }
}

function readAbilityScores(value: unknown): AbilityScores {
  const record = readRecord(value, 'scores')
  return {
    Body: readNumber(record, 'Body'),
    Agility: readNumber(record, 'Agility'),
    Mind: readNumber(record, 'Mind'),
    Presence: readNumber(record, 'Presence')
  }
}

function readAbility(value: unknown): Ability {
  if (!isAbility(value)) {
    throw new Error('Expected ability to be Body, Agility, Mind, or Presence')
  }
  return value
}

function readRollMode(record: Record<string, unknown>): RollMode | undefined {
  const value = record['rollMode']
  if (value === undefined) {
    return undefined
  }
  if (value === 'normal' || value === 'advantage' || value === 'disadvantage') {
    return value
  }
  throw new Error('Expected rollMode to be normal, advantage, or disadvantage')
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`Expected ${key} to be a boolean`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Expected ${key} to be a finite number`)
  }
  return value
}

function readRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`Expected ${label} payload to be an object`)
  }
  return payload as Record<string, unknown>
}

export const characterEngine: CharacterEngineApi = {
  id: 'CharacterEngine',
  title: 'Character Engine',
  description: 'Deterministic player-character ability and resolution model',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((entry) => entry.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}
