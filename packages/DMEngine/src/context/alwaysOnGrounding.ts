import type { AlwaysOnGrounding } from './types.js'

const FIELD_ORDER = [
  ['currentHp', 'Current HP'],
  ['presentNpcs', 'Present NPCs'],
  ['activeCombatState', 'Active combat']
] as const

export function formatAlwaysOnGrounding(fields: AlwaysOnGrounding): string {
  const lines: string[] = []

  for (const [key, label] of FIELD_ORDER) {
    const value = fields[key]
    if (value !== undefined && value.length > 0) {
      lines.push(`${label}: ${value}`)
    }
  }

  return lines.join('\n')
}
