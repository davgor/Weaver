import { assembleAskDmContext } from './assembleAskDmContext.js'
import { appendAskDmEntry, getAskDmHistory } from './askDmHistory.js'
import type { AskTheDmInput, AskTheDmResult } from './types.js'

const ASK_DM_SKELETON = '{{ANSWER}}'

export async function askTheDm(input: AskTheDmInput): Promise<AskTheDmResult> {
  const question = input.question.trim()
  if (question.length === 0) {
    return { ok: false, errors: ['Ask-the-DM question must not be empty.'] }
  }

  const facts = groundingFacts(input)
  const priorHistory = getAskDmHistory(input.campaignId, input.characterId)
  appendAskDmEntry({
    campaignId: input.campaignId,
    characterId: input.characterId,
    speaker: 'player',
    text: question
  })

  const result = await input.narration.fillAndValidate(
    {
      skeleton: ASK_DM_SKELETON,
      facts,
      stage: askDmStage(question, priorHistory?.entries ?? []),
      seed: askDmSeed(input.campaignId, input.characterId, question)
    },
    input.completer
  )

  const answer = result.filled.ANSWER
  if (!result.ok || answer === undefined) {
    return { ok: false, errors: result.errors }
  }

  const history = appendAskDmEntry({
    campaignId: input.campaignId,
    characterId: input.characterId,
    speaker: 'dm',
    text: answer
  })
  return { ok: true, answer, history, errors: [] }
}

function groundingFacts(input: AskTheDmInput): Record<string, string> {
  return assembleAskDmContext({
    campaignId: input.campaignId,
    characterId: input.characterId,
    campaignFacts: input.facts,
    characterFacts: {}
  })
}

function askDmStage(question: string, priorEntries: readonly { speaker: string; text: string }[]): string {
  const lines = [
    'askDm.answer',
    'Answer an out-of-character rules or lore question without changing game state.',
    'Use only supplied campaign and character facts.',
    `Question: ${question}`
  ]
  if (priorEntries.length > 0) {
    lines.push('Prior OOC history:', ...priorEntries.map(formatHistoryLine))
  }
  return lines.join('\n')
}

function askDmSeed(campaignId: string, characterId: string, question: string): string {
  return `askDm:${campaignId}:${characterId}:${question}`
}

function formatHistoryLine(entry: { speaker: string; text: string }): string {
  return `${entry.speaker}: ${entry.text}`
}
