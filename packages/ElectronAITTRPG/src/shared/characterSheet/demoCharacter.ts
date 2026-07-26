import type { AbilityScores } from '@weaver/character-engine'
import type { LoadCharacterSheetRequest } from './types.js'

export const DEMO_SHEET_CHARACTER_ID = 'demo.character.sheet'
export const DEMO_SHEET_CHARACTER_NAME = 'Ashen Vale'
export const DEMO_SHEET_SCORES: AbilityScores = {
  Body: 14,
  Agility: 12,
  Mind: 10,
  Presence: 8
}

export function demoSheetLoadRequest(): LoadCharacterSheetRequest {
  return {
    characterId: DEMO_SHEET_CHARACTER_ID,
    characterName: DEMO_SHEET_CHARACTER_NAME,
    abilityScores: { ...DEMO_SHEET_SCORES }
  }
}
