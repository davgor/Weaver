import type { SceneBlock, SocialLine, VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnMainCharacterBrief, VnStoryCastMember } from '@weaver/dm-engine'

export type VnPlayMode = 'scene' | 'npc'

export type VnPlaySnapshot = {
  campaignId: string
  characterId: string
  mode: VnPlayMode
  beatText: string
  speakerName: string | null
  options: [string, string]
  freeText: string
  placeholders: readonly VnBeatPlaceholder[]
  scene: SceneBlock[]
  social: SocialLine[]
  mainCharacter: VnMainCharacterBrief
  cast: VnStoryCastMember[]
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
}
