import type { AbilityScores, RaceSelection } from '@weaver/character-engine'
import type {
  GeneratePortraitDeps,
  ImageGenerateResult,
  ImageGenerationSettings,
  PortraitSubjectKind
} from '@weaver/narration-engine'
import type { NpcPlaceholderSlot } from '@weaver/civilization-engine'

export type SpeakingStyle = {
  tone: string
  vocabulary: readonly string[]
}

export type NpcSpeciesKind = 'person' | 'animal' | 'construct'

export type NpcBackground = {
  backgroundId: string
  name: string
  description?: string
}

export type NpcIdentityBundle = {
  race: RaceSelection
  background?: NpcBackground
  alignment: string
  temperament: string
  nonSpeaking: boolean
}

export type CivilianCombatStats = {
  kind: 'civilian'
  maxHp: number
  currentHp: number
}

export type CombatTierStats = {
  kind: 'combatant'
  tierId: string
  level: number
  hitDie: number
  maxHp: number
  currentHp: number
  armorClass?: number
  attackBonus?: number
}

export type NpcCombatStats = CivilianCombatStats | CombatTierStats
export type DefeatDispositionValue = 'yielded' | 'fled' | 'nonLethal' | 'executed'

export type DefeatDisposition = {
  disposition: DefeatDispositionValue
  dead: false
  source: DefeatDispositionSource
}

export type DefeatDispositionSource = {
  encounterId: string
  actorId: string
}

export type NpcPortrait = {
  imagePath: string
  provider: ImageGenerationSettings['provider']
}

export type NpcRecord = {
  npcId: string
  campaignId: string
  worldId: string
  regionId: string
  civilizationId: string
  placeholder: NpcPlaceholderSlot
  identity: NpcIdentityBundle
  abilityScores: AbilityScores
  abilityModifiers: AbilityScores
  speciesKind: NpcSpeciesKind
  combatStats: NpcCombatStats
  factionIds: string[]
  displayName?: string
  dialogueFlavor?: string
  speakingStyle?: SpeakingStyle
  portrait?: NpcPortrait
  defeatDisposition?: DefeatDisposition
}

export type ConstructNpcInput = {
  campaignId: string
  worldId: string
  npcId: string
  placeholderSlotId: string
  raceId: string
  alignment: string
  temperament: string
  abilityScores: AbilityScores
  background?: NpcBackground
  speciesKind?: NpcSpeciesKind
  nonSpeaking?: boolean
  speakingStyle?: SpeakingStyle
  displayName?: string
  dialogueFlavor?: string
  portraitPrompt?: string
  portraitSettings?: ImageGenerationSettings
}

export type HydrateNpcCombatTierInput = {
  npcId: string
  tierId: string
  level: number
  hitDie: number
  rolls?: readonly number[]
  armorClass?: number
  attackBonus?: number
}

export type SetNpcDefeatDispositionInput = {
  npcId: string
  disposition: DefeatDispositionValue
  source: DefeatDispositionSource
}

export type MemoryProvenance = {
  eventId: string
  sceneId?: string
}

export type NpcMemory = {
  npcId: string
  text: string
  provenance: MemoryProvenance
}

export type WorldFact = {
  factId: string
  text: string
  provenance: MemoryProvenance
  regionIds?: readonly string[]
  factionIds?: readonly string[]
}

export type GroundingContext = {
  npcId: string
  privateMemories: NpcMemory[]
  worldFacts: WorldFact[]
}

export type QueryNpcGroundingContextInput = {
  npcId: string
}

export type FactionRelationKind = 'allied' | 'neutral' | 'hostile'

export type FactionMembership = {
  npcId: string
  role?: string
}

export type FactionRecord = {
  factionId: string
  name: string
  memberships: FactionMembership[]
}

export type FactionRelation = {
  sourceFactionId: string
  targetFactionId: string
  relation: FactionRelationKind
}

export type ReputationStanding = {
  characterId: string
  factionId: string
  score: number
  lastProvenance?: MemoryProvenance
}

export type CreateFactionInput = {
  factionId: string
  name: string
}

export type AddNpcToFactionInput = {
  factionId: string
  npcId: string
  role?: string
}

export type SetFactionRelationInput = FactionRelation

export type UpdateReputationInput = {
  characterId: string
  factionId: string
  delta: number
  provenance?: MemoryProvenance
}

export type RecentSocialContext = {
  mentionedNpcIds?: readonly string[]
  mentionedFactionIds?: readonly string[]
}

export type SelectSocialRespondersInput = {
  presentNpcIds: readonly string[]
  addressedTarget?: string
  recentContext?: RecentSocialContext
}

export type UpdateNpcSpeakingStyleInput = {
  npcId: string
  speakingStyle: SpeakingStyle
}

export type PortraitHookRequest = {
  npcId: string
  prompt: string
  settings: ImageGenerationSettings
}

export type CompanionPortraitHookRequest = {
  companionId: string
  prompt: string
  settings: ImageGenerationSettings
}

export type PortraitHookDeps = GeneratePortraitDeps & {
  generatePortrait?: (
    request: PortraitGenerationRequest,
    deps?: GeneratePortraitDeps
  ) => Promise<ImageGenerateResult>
}

export type PortraitGenerationRequest = {
  subjectKind: PortraitSubjectKind
  subjectId: string
  prompt: string
  settings: ImageGenerationSettings
  subjectFacts: {
    race?: string
    description?: string
    name?: string
  }
  campaignId?: string
}

export type PortraitHookResult = {
  queued: boolean
  subjectKind: 'npc' | 'companion'
  subjectId: string
}
