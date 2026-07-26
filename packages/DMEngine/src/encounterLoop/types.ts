import type {
  DifficultyBand,
  XpAwardResult
} from '@weaver/character-engine'
import type {
  EncounterCombatantInput
} from '@weaver/combat-engine'
import type { GenerateEncounterFoesInput } from '@weaver/enemy-engine'
import type { LootDrop } from '@weaver/item-engine'

export type EncounterIdContext = {
  campaignId: string
  characterId: string
  text: string
}

export type EncounterIdFactory = (context: EncounterIdContext) => string

export type AdHocEncounterStartRequest = {
  mode: 'adHoc'
  encounterId?: string
  knownCombatants?: readonly EncounterCombatantInput[]
  foeGeneration?: GenerateEncounterFoesInput
}

export type AuthoredEncounterStartRequest = {
  mode: 'preAuthored'
  encounterId?: string
  combatants: readonly EncounterCombatantInput[]
}

export type EncounterStartRequest = AdHocEncounterStartRequest | AuthoredEncounterStartRequest

export type EncounterRewardRequest = {
  xpDifficulty?: DifficultyBand
}

export type CharacterProgressionApi = {
  awardXp: (characterId: string, difficulty: DifficultyBand) => XpAwardResult
}

export type CombatLevelUpSummary = {
  fromLevel: number
  toLevel: number
  levelsGained: number
  xp: number
  xpAwarded: number
}

export type CombatRewards = {
  xp?: XpAwardResult
  loot: readonly LootDrop[]
  levelUp?: CombatLevelUpSummary
}

