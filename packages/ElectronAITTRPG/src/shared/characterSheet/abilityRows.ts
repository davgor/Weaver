import { ABILITIES, type AbilityScores } from '@weaver/character-engine'
import type { AbilityRow } from './types.js'

export function buildAbilityRows(
  scores: AbilityScores,
  getModifier: (score: number) => number
): AbilityRow[] {
  return ABILITIES.map((ability) => ({
    ability,
    score: scores[ability],
    modifier: getModifier(scores[ability])
  }))
}

export function formatModifier(modifier: number): string {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`
}
