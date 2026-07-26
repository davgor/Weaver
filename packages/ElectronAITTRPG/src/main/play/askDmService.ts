import type {
  AskDmNarrationApi,
  AskTheDmInput,
  AskTheDmResult
} from '@weaver/dm-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import type { AskDmRequest, AskDmResult } from '../../shared/play/types.js'

export type AskDmServiceDeps = {
  askTheDm: (input: AskTheDmInput) => Promise<AskTheDmResult>
  narration: AskDmNarrationApi
  completer: TextCompleter
  facts: (request: AskDmRequest) => Record<string, string>
}

export type AskDmService = {
  ask: (request: AskDmRequest) => Promise<AskDmResult>
}

export function createAskDmService(deps: AskDmServiceDeps): AskDmService {
  return {
    ask: (request) => ask(deps, request)
  }
}

async function ask(deps: AskDmServiceDeps, request: AskDmRequest): Promise<AskDmResult> {
  const result = await deps.askTheDm({
    campaignId: request.campaignId,
    characterId: request.characterId,
    question: request.question,
    facts: deps.facts(request),
    narration: deps.narration,
    completer: deps.completer
  })
  if (!result.ok) {
    return { answer: '', entries: [], errors: result.errors }
  }
  return {
    answer: result.answer,
    entries: result.history.entries,
    errors: []
  }
}
