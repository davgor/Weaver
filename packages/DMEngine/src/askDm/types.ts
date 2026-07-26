import type {
  FillAndValidateInput,
  FillAndValidateResult,
  TextCompleter
} from '@weaver/narration-engine'

export type AskDmSpeaker = 'player' | 'dm'

export type AskDmHistoryEntry = {
  speaker: AskDmSpeaker
  text: string
}

export type AskDmHistory = {
  campaignId: string
  characterId: string
  entries: AskDmHistoryEntry[]
}

export type AskDmContextInput = {
  campaignId: string
  characterId: string
  campaignFacts?: Record<string, string>
  characterFacts?: Record<string, string>
}

export type AskDmNarrationApi = {
  fillAndValidate: (
    input: FillAndValidateInput,
    completer: TextCompleter
  ) => Promise<FillAndValidateResult>
}

export type AskTheDmInput = {
  campaignId: string
  characterId: string
  question: string
  facts: Record<string, string>
  narration: AskDmNarrationApi
  completer: TextCompleter
}

export type AskTheDmResult =
  | {
      ok: true
      answer: string
      history: AskDmHistory
      errors: []
    }
  | {
      ok: false
      errors: string[]
    }
