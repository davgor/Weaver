import type { AbilityScores, DamageType } from '@weaver/character-engine'
import type {
  GeneratePortraitDeps,
  ImageGenerateRequest,
  ImageGenerateResult,
  ImageGenerationSettings
} from '@weaver/narration-engine'

export type EnemyDifficulty = 'easy' | 'medium' | 'hard'

export type BestiaryHpProfile = {
  hitDie: number
  level: number
  referenceMaxHp: number
  rolls?: number[]
}

export type BestiaryDamageProfile = {
  dealt: DamageType[]
  resisted: DamageType[]
  vulnerable: DamageType[]
}

export type BestiaryEntry = {
  bestiaryId: string
  speciesId: string
  speciesName: string
  variantId: string
  variantName: string
  displayName: string
  description: string
  difficulty: EnemyDifficulty
  abilityScores: AbilityScores
  hp: BestiaryHpProfile
  damageTypes: BestiaryDamageProfile
  regions: string[]
  tags: string[]
}

export type EnemyHpSnapshot = {
  hitDie: number
  level: number
  max: number
  current: number
}

export type HydratedBestiaryEntry = Omit<BestiaryEntry, 'hp'> & {
  hp: EnemyHpSnapshot
}

export type GenerateEncounterFoesInput = {
  regionId?: string
  difficulty?: EnemyDifficulty
  tags?: readonly string[]
  count?: number
}

export type EnemyCombatToken = {
  imagePath: string
  provider: ImageGenerationSettings['provider']
}

export type GeneratedFoeRef = {
  foeId: string
  bestiaryId: string
  difficulty: EnemyDifficulty
  tags: string[]
  regionId?: string
  combatToken?: EnemyCombatToken
}

export type QuestFoeAssignmentInput = {
  questId: string
  bestiaryIds: readonly string[]
}

export type QuestFoeAssignment = {
  questId: string
  foeRefs: GeneratedFoeRef[]
}

export type EnemyCombatantSnapshot = {
  id: string
  bestiaryId: string
  speciesId: string
  variantId: string
  name: string
  abilities: {
    scores: AbilityScores
    modifiers: AbilityScores
  }
  hp: EnemyHpSnapshot
  damageTypes: BestiaryDamageProfile
  tags: string[]
  combatToken?: EnemyCombatToken
}

export type CombatTokenRequest = {
  foeId: string
  prompt: string
  settings: ImageGenerationSettings
  campaignId?: string
  visuallyUnique?: boolean
}

export type CombatTokenResult = {
  queued: boolean
  foeId: string
  fromCache: boolean
}

export type EnemyPortraitGenerator = (
  request: ImageGenerateRequest,
  deps?: GeneratePortraitDeps
) => Promise<ImageGenerateResult>

export type CombatTokenDeps = GeneratePortraitDeps & {
  generatePortrait?: EnemyPortraitGenerator
}

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type EnemyEngineApi = {
  id: 'EnemyEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}
