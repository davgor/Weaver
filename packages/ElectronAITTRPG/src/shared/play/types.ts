import type { SceneBlock, SocialLine } from '@weaver/narration-engine'
import type { CombatConditionId, HitPointState } from '@weaver/combat-engine'
import type { AskDmHistoryEntry } from '@weaver/dm-engine'
import type { DeathMode } from '../campaignCreate/types.js'

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

export type PlayDeathOutcome =
  | {
      mode: DeathMode
      status: 'dead'
      cause: string
      obituary: string
    }
  | {
      mode: 'standard'
      status: 'alive'
      restoredFromAutosave: true
    }
  | {
      mode: 'respawn'
      status: 'alive'
      respawn: {
        relocatedTo: string
        costPaid: number
        respawnsUsed: number
        respawnsRemaining: number
        goldRemaining: number
      }
    }

export type SubmitPlayActionSuccess = {
  ok: true
  scene: SceneBlock[]
  social: SocialLine[]
  combat: CombatChromeSnapshot
  roll: D20RollFeedback | null
  death: PlayDeathOutcome | null
}

type SubmitPlayActionFailure = {
  ok: false
  kind: 'turn'
  message: string
  code: string
}

export type SubmitPlayActionResult = SubmitPlayActionSuccess | SubmitPlayActionFailure

export type AskDmResult = {
  answer: string
  entries: AskDmHistoryEntry[]
  errors: string[]
}

export type PlayApi = {
  submitAction: (request: SubmitPlayActionRequest) => Promise<SubmitPlayActionResult>
  askDm: (request: AskDmRequest) => Promise<AskDmResult>
}
