import {
  CONDITION_EFFECTS,
  applyDamageModifiers,
  applyHitPointDamage,
  calculateArmorClass,
  getAbilityModifier,
  isDamageType,
  mergeConditionEffects,
  type AttacksAgainstMode,
  type Condition,
  type DamageType,
  type RollMode
} from '@weaver/character-engine'
import {
  itemEngine,
  resolveWeaponDamageAgainstTarget,
  type DamageModifierInput,
  type WeaponDamageComponent,
  type WeaponDamageProfile
} from '@weaver/item-engine'
import {
  findCombatant,
  replaceCombatant,
  requireActiveEncounter,
  saveEncounterUpdate
} from './encounter.js'
import type {
  AttackRange,
  AttackResolution,
  AttackResolutionDeps,
  AttackRollResult,
  AttackTurnLogEntry,
  CombatConditionId,
  EncounterCombatant,
  ResolveAttackAgainstCombatantsInput,
  ResolveAttackInput,
  ResolveAttackResult
} from './types.js'

const DEFAULT_RANGE: AttackRange = 'melee'

export function resolveAttack(
  input: ResolveAttackInput,
  deps: AttackResolutionDeps = {}
): ResolveAttackResult {
  const encounter = requireActiveEncounter(input)
  assertActiveAttacker(input, encounter.currentTurn.combatantId, encounter.currentTurn.actionUsed)
  const attacker = findCombatant(encounter, input.attackerId)
  const target = findCombatant(encounter, input.targetId)
  const resolution = resolveAttackAgainstCombatants(attackInput(input, attacker, target), deps)
  const saved = saveEncounterUpdate(input, {
    ...replaceCombatant(encounter, resolution.target),
    currentTurn: { ...encounter.currentTurn, actionUsed: true },
    turnLog: [...encounter.turnLog, attackLog(encounter.round, resolution)]
  })
  return { ...resolution, encounter: saved }
}

function attackInput(
  input: ResolveAttackInput,
  attacker: EncounterCombatant,
  target: EncounterCombatant
): ResolveAttackAgainstCombatantsInput {
  return {
    attacker,
    target,
    weaponInstanceId: input.weaponInstanceId,
    attackAbility: input.attackAbility,
    proficient: input.proficient,
    proficiencyBonus: input.proficiencyBonus,
    ...(input.range === undefined ? {} : { range: input.range })
  }
}

export function resolveAttackAgainstCombatants(
  input: ResolveAttackAgainstCombatantsInput,
  deps: AttackResolutionDeps = {}
): AttackResolution {
  const profile = readWeaponDamageProfile(input.weaponInstanceId, deps)
  const attack = rollAttack(input, deps.roller ?? rollD20)
  const damage = attack.hit ? resolveDamage(profile, input.target, attack.critical) : []
  const totalDamage = sumDamage(damage)
  return {
    attackerId: input.attacker.id,
    targetId: input.target.id,
    weaponInstanceId: input.weaponInstanceId,
    attack,
    damage,
    totalDamage,
    onHitEffectIds: [...profile.onHitEffectIds],
    target: attack.hit ? applyDamageToTarget(input.target, totalDamage) : cloneCombatant(input.target)
  }
}

function rollAttack(
  input: ResolveAttackAgainstCombatantsInput,
  roller: () => number
): AttackRollResult {
  const attackerEffects = mergedEffects(input.attacker.characterConditions)
  if (!attackerEffects.canAct) {
    throw new Error(`${input.attacker.id} cannot attack while unable to act`)
  }
  const range = input.range ?? DEFAULT_RANGE
  const targetEffects = mergedEffects(input.target.characterConditions)
  const rollMode = combineRollModes(
    attackerEffects.attackRollMode,
    targetRollMode(targetEffects.attacksAgainst, range)
  )
  const rolls = rollForMode(rollMode, roller)
  const selectedRoll = selectRoll(rollMode, rolls)
  const abilityModifier = getAbilityModifier(input.attacker.abilityScores[input.attackAbility])
  const proficiencyBonusApplied = input.proficient ? input.proficiencyBonus : 0
  const targetArmorClass = armorClass(input.target)
  const total = selectedRoll + abilityModifier + proficiencyBonusApplied
  const naturalOne = selectedRoll === 1
  const hit = !naturalOne && (selectedRoll === 20 || total >= targetArmorClass)
  return {
    rollMode,
    rolls,
    selectedRoll,
    abilityModifier,
    proficiencyBonusApplied,
    total,
    targetArmorClass,
    naturalOne,
    critical: hit && isCritical(selectedRoll, targetEffects.meleeHitsAreCritical, range),
    hit
  }
}

function resolveDamage(
  profile: WeaponDamageProfile,
  target: EncounterCombatant,
  critical: boolean
) {
  const components = critical ? profile.damageComponents.map(doubleDamage) : profile.damageComponents
  return resolveWeaponDamageAgainstTarget(components, {
    resistances: target.damageResistances,
    vulnerabilities: target.damageVulnerabilities
  }, applyCharacterDamageModifier)
}

function applyDamageToTarget(
  target: EncounterCombatant,
  amount: number
): EncounterCombatant {
  if (target.kind === 'character') {
    return applyCharacterDamage(target, amount)
  }
  if (target.hp === undefined) {
    return cloneCombatant(target)
  }
  const current = Math.max(0, target.hp.current - amount)
  return {
    ...cloneCombatant(target),
    hp: { current, max: target.hp.max },
    conditions: current === 0 ? withCombatCondition(target.conditions, 'down') : [...target.conditions]
  }
}

function applyCharacterDamage(target: EncounterCombatant, amount: number): EncounterCombatant {
  const stats = applyHitPointDamage(target.id, amount)
  return {
    ...cloneCombatant(target),
    hp: { current: stats.currentHp, max: stats.maxHp },
    characterConditions: [...stats.conditions],
    dying: stats.dying === null ? null : { ...stats.dying },
    conditions: stats.currentHp === 0 ? withCombatCondition(target.conditions, 'down') : [...target.conditions]
  }
}

function readWeaponDamageProfile(
  weaponInstanceId: string,
  deps: AttackResolutionDeps
): WeaponDamageProfile {
  assertText(weaponInstanceId, 'weaponInstanceId')
  const readProfile = deps.getWeaponDamageProfile ?? itemEngine.getWeaponDamageProfile
  return readProfile(weaponInstanceId)
}

function applyCharacterDamageModifier(amount: number, input: DamageModifierInput): number {
  return applyDamageModifiers(amount, {
    damageType: asDamageType(input.damageType),
    resistances: input.resistances.map(asDamageType),
    vulnerabilities: input.vulnerabilities.map(asDamageType)
  })
}

function mergedEffects(conditions: readonly Condition[]) {
  return mergeConditionEffects(expandConditions(conditions))
}

function expandConditions(conditions: readonly Condition[]): Condition[] {
  const expanded = new Set<Condition>()
  for (const condition of conditions) {
    expanded.add(condition)
    for (const implied of CONDITION_EFFECTS[condition].impliesConditions) {
      expanded.add(implied)
    }
  }
  return [...expanded]
}

function targetRollMode(attacksAgainst: AttacksAgainstMode, range: AttackRange): RollMode {
  if (attacksAgainst === 'meleeAdvantageRangedDisadvantage') {
    return range === 'melee' ? 'advantage' : 'disadvantage'
  }
  return attacksAgainst
}

function combineRollModes(left: RollMode, right: RollMode): RollMode {
  const hasAdvantage = left === 'advantage' || right === 'advantage'
  const hasDisadvantage = left === 'disadvantage' || right === 'disadvantage'
  if (hasAdvantage && hasDisadvantage) {
    return 'normal'
  }
  if (hasAdvantage) {
    return 'advantage'
  }
  return hasDisadvantage ? 'disadvantage' : 'normal'
}

function rollForMode(rollMode: RollMode, roller: () => number): number[] {
  const first = assertD20(roller())
  return rollMode === 'normal' ? [first] : [first, assertD20(roller())]
}

function selectRoll(rollMode: RollMode, rolls: readonly number[]): number {
  if (rollMode === 'advantage') {
    return Math.max(...rolls)
  }
  if (rollMode === 'disadvantage') {
    return Math.min(...rolls)
  }
  return rolls[0] ?? 1
}

function armorClass(target: EncounterCombatant): number {
  return target.armorClass ?? calculateArmorClass({
    agilityScore: target.abilityScores.Agility,
    armorBonus: 0
  })
}

function isCritical(
  selectedRoll: number,
  meleeHitsAreCritical: boolean,
  range: AttackRange
): boolean {
  return selectedRoll === 20 || (range === 'melee' && meleeHitsAreCritical)
}

function doubleDamage(component: WeaponDamageComponent): WeaponDamageComponent {
  return { ...component, amount: component.amount * 2 }
}

function sumDamage(damage: readonly { finalAmount: number }[]): number {
  return damage.reduce((sum, component) => sum + component.finalAmount, 0)
}

function withCombatCondition(
  conditions: readonly CombatConditionId[],
  condition: CombatConditionId
): CombatConditionId[] {
  return conditions.includes(condition) ? [...conditions] : [...conditions, condition]
}

function cloneCombatant(combatant: EncounterCombatant): EncounterCombatant {
  return {
    ...combatant,
    abilityScores: { ...combatant.abilityScores },
    conditions: [...combatant.conditions],
    characterConditions: [...combatant.characterConditions],
    damageResistances: [...combatant.damageResistances],
    damageVulnerabilities: [...combatant.damageVulnerabilities],
    ...(combatant.hp === undefined ? {} : { hp: { ...combatant.hp } }),
    ...(combatant.dying === undefined ? {} : {
      dying: combatant.dying === null ? null : { ...combatant.dying }
    })
  }
}

function attackLog(round: number, resolution: AttackResolution) {
  return {
    kind: 'attack' as const,
    round,
    combatantId: resolution.attackerId,
    attack: attackLogEntry(resolution)
  }
}

function attackLogEntry(resolution: AttackResolution): AttackTurnLogEntry {
  return {
    targetId: resolution.targetId,
    weaponInstanceId: resolution.weaponInstanceId,
    hit: resolution.attack.hit,
    critical: resolution.attack.critical,
    totalDamage: resolution.totalDamage
  }
}

function assertActiveAttacker(
  input: ResolveAttackInput,
  currentCombatantId: string,
  actionUsed: boolean
): void {
  assertText(input.attackerId, 'attackerId')
  assertText(input.targetId, 'targetId')
  if (currentCombatantId !== input.attackerId) {
    throw new Error(`It is not ${input.attackerId}'s turn`)
  }
  if (actionUsed) {
    throw new Error(`${input.attackerId} has already used an Action this turn`)
  }
}

function asDamageType(value: string): DamageType {
  if (!isDamageType(value)) {
    throw new Error(`Unexpected damage type: ${value}`)
  }
  return value
}

function assertD20(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 20) {
    throw new Error(`D20 roller returned invalid roll: ${roll}`)
  }
  return roll
}

function rollD20(): number {
  return Math.floor(Math.random() * 20) + 1
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}
