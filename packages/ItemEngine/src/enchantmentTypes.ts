export const WEAPON_DAMAGE_TYPES = ['Physical', 'Fire', 'Cold', 'Poison', 'Arcane'] as const

export type WeaponDamageType = (typeof WEAPON_DAMAGE_TYPES)[number]

export type WeaponDamageComponent = {
  damageType: WeaponDamageType
  amount: number
}

export type EnchantmentDamageOverlay = {
  overlayId: string
  kind: 'damage'
  damageType: WeaponDamageType
  bonus: number
}

export type EnchantmentOnHitOverlay = {
  overlayId: string
  kind: 'onHit'
  onHitEffectId: string
}

export type EnchantmentOverlay = EnchantmentDamageOverlay | EnchantmentOnHitOverlay

export type WeaponDamageProfile = {
  damageComponents: WeaponDamageComponent[]
  onHitEffectIds: string[]
}

export function isWeaponDamageType(value: unknown): value is WeaponDamageType {
  return typeof value === 'string' && WEAPON_DAMAGE_TYPES.some((entry) => entry === value)
}
