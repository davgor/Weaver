export type XpNarrationSlots = {
  character: string
  source: string
  amount: string
  newTotal: string
}

const XP_TEMPLATE = `Narrate XP gain in one short sentence.
Character: {{character}}
Source: {{source}}
XP gained: {{amount}}
New total: {{newTotal}}`

export function buildXpNarrationPrompt(slots: XpNarrationSlots): string {
  return replaceSlots(XP_TEMPLATE, slots)
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
