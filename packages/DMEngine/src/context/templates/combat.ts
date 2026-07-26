export type CombatNarrationSlots = {
  attacker: string
  target: string
  action: string
  outcome: string
  damage: string
}

const COMBAT_TEMPLATE = `Narrate this combat exchange in one short paragraph.
Attacker: {{attacker}}
Target: {{target}}
Action: {{action}}
Outcome: {{outcome}}
Damage: {{damage}}`

export function buildCombatNarrationPrompt(slots: CombatNarrationSlots): string {
  return replaceSlots(COMBAT_TEMPLATE, slots)
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
