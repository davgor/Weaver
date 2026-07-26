import type { WeaponDamageComponent, WeaponDamageProfile } from './enchantmentTypes.js'
import type { ItemInstance, ItemTemplate } from './types.js'

export type DamageModifierInput = {
  damageType: string
  resistances: readonly string[]
  vulnerabilities: readonly string[]
}

export type DamageModifierFn = (amount: number, input: DamageModifierInput) => number

export type ResolvedWeaponDamage = {
  damageType: string
  baseAmount: number
  finalAmount: number
}

export function buildWeaponDamageProfile(template: ItemTemplate, instance: ItemInstance): WeaponDamageProfile {
  const amounts = new Map<string, number>()

  for (const component of template.weaponDamage ?? []) {
    amounts.set(component.damageType, (amounts.get(component.damageType) ?? 0) + component.amount)
  }

  for (const overlay of instance.enchantmentOverlays ?? []) {
    if (overlay.kind === 'damage') {
      amounts.set(overlay.damageType, (amounts.get(overlay.damageType) ?? 0) + overlay.bonus)
    }
  }

  const damageComponents: WeaponDamageComponent[] = [...amounts.entries()].map(([damageType, amount]) => ({
    damageType: damageType as WeaponDamageComponent['damageType'],
    amount
  }))

  const onHitEffectIds = (instance.enchantmentOverlays ?? [])
    .filter((overlay) => overlay.kind === 'onHit')
    .map((overlay) => overlay.onHitEffectId)

  return { damageComponents, onHitEffectIds }
}

export function resolveWeaponDamageAgainstTarget(
  components: readonly WeaponDamageComponent[],
  target: { resistances: readonly string[]; vulnerabilities: readonly string[] },
  applyModifier: DamageModifierFn
): ResolvedWeaponDamage[] {
  return components.map((component) => {
    const finalAmount = applyModifier(component.amount, {
      damageType: component.damageType,
      resistances: target.resistances,
      vulnerabilities: target.vulnerabilities
    })
    return {
      damageType: component.damageType,
      baseAmount: component.amount,
      finalAmount
    }
  })
}
