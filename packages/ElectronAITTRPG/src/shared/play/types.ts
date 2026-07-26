import type { SceneBlock, SocialLine } from '@weaver/narration-engine'
import type { CombatConditionId, HitPointState } from '@weaver/combat-engine'
import type { AskDmHistoryEntry } from '@weaver/dm-engine'

export type { AskDmHistoryEntry } from '@weaver/dm-engine'

export type PlayContext = {
  campaignId: string
  characterId: string
  characterName?: string
  encounterId?: string
}

export type SubmitPlayActionRequest = PlayContext & {
  text: string
}

export type AskDmRequest = PlayContext & {
  question: string
}

export type D20RollFeedback = {
  visible: boolean
  label: string
  roll: number
}

export type CombatChromeCombatant = {
  combatantId: string
  displayName: string
  isActive: boolean
  hp: HitPointState | null
  conditions: CombatConditionId[]
}

export type CombatChromeSnapshot =
  | { active: false }
  | {
      active: true
      encounterId: string
      round: number
      activeCombatantId: string
      turnOrder: CombatChromeCombatant[]
    }

export type SubmitPlayActionResult = {
  scene: SceneBlock[]
  social: SocialLine[]
  combat: CombatChromeSnapshot
  roll: D20RollFeedback | null
}

export type AskDmResult = {
  answer: string
  entries: AskDmHistoryEntry[]
  errors: string[]
}

export type PlayApi = {
  submitAction: (request: SubmitPlayActionRequest) => Promise<SubmitPlayActionResult>
  askDm: (request: AskDmRequest) => Promise<AskDmResult>
}
