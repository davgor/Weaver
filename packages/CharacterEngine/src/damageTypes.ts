export const DAMAGE_TYPES = ['Physical', 'Fire', 'Cold', 'Poison', 'Arcane'] as const

export type DamageType = (typeof DAMAGE_TYPES)[number]

export type DamageModifierInput = {
  damageType: DamageType
  resistances: readonly DamageType[]
  vulnerabilities: readonly DamageType[]
}

export function listDamageTypes(): DamageType[] {
  return [...DAMAGE_TYPES]
}

export function isDamageType(value: unknown): value is DamageType {
  return typeof value === 'string' && DAMAGE_TYPES.some((entry) => entry === value)
}

export function applyDamageModifiers(amount: number, input: DamageModifierInput): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Damage amount must be a non-negative finite number')
  }
  const resisted = input.resistances.includes(input.damageType)
  const vulnerable = input.vulnerabilities.includes(input.damageType)
  if (resisted && vulnerable) {
    return amount
  }
  if (resisted) {
    return amount / 2
  }
  if (vulnerable) {
    return amount * 2
  }
  return amount
}
