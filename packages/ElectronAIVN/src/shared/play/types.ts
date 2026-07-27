import type { SceneBlock, SocialLine, VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnMainCharacterBrief, VnPlayPhase, VnStoryCastMember } from '@weaver/dm-engine'
import type { VnAssetsUpdate } from './assetTypes.js'

export type VnPlayMode = 'scene' | 'npc'

export type { VnPlayPhase }

export type VnPlaySnapshot = {
  campaignId: string
  characterId: string
  mode: VnPlayMode
  beatText: string
  speakerName: string | null
  /** Durable speaker id for the current NPC line; null in scene mode. Needed for resume + social turns. */
  speakerId: string | null
  options: [string, string]
  freeText: string
  placeholders: readonly VnBeatPlaceholder[]
  scene: SceneBlock[]
  social: SocialLine[]
  mainCharacter: VnMainCharacterBrief
  cast: VnStoryCastMember[]
  phase: VnPlayPhase
  storyComplete: boolean
  /** 1-based act index within the authored story. */
  actIndex: number
}

export type SubmitVnPlayActionRequest = {
  campaignId: string
  text: string
  /** When set, DMEngine narrates social/NPC dialogue and steps back. */
  socialSpeakerId?: string
}

export type VnPlayApi = {
  open: (campaignId: string) => Promise<VnPlaySnapshot>
  submitAction: (request: SubmitVnPlayActionRequest) => Promise<VnPlaySnapshot>
  /** Subscribe to async image asset updates for the active campaign. Returns an unsubscribe fn. */
  onAssets: (listener: (update: VnAssetsUpdate) => void) => () => void
}
