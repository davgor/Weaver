import type { EquippedItemViews } from '@weaver/item-engine'

export function estimateArmorBonus(equipped: EquippedItemViews): number {
  const tags = equipped.armor?.template.tags ?? []
  if (equipped.armor === undefined) return 0
  if (tags.includes('light')) return 2
  if (tags.includes('medium')) return 4
  if (tags.includes('heavy')) return 6
  return 3
}
