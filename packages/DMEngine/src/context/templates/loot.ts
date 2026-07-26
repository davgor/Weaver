export type LootNarrationSlots = {
  character: string
  container: string
  items: string
  rarity: string
}

const LOOT_TEMPLATE = `Narrate loot discovery in one short paragraph.
Character: {{character}}
Container: {{container}}
Items: {{items}}
Rarity: {{rarity}}`

export function buildLootNarrationPrompt(slots: LootNarrationSlots): string {
  return replaceSlots(LOOT_TEMPLATE, slots)
}

function replaceSlots<T extends Record<string, string>>(
  template: string,
  slots: T
): string {
  return Object.entries(slots).reduce(
    (prompt, [key, value]) => prompt.replaceAll(`{{${key}}}`, value),
    template
  )
}
