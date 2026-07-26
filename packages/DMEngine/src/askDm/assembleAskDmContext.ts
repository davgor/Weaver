import type { AskDmContextInput } from './types.js'

export function assembleAskDmContext(input: AskDmContextInput): Record<string, string> {
  return pruneEmptyFacts({
    campaignId: input.campaignId,
    characterId: input.characterId,
    ...input.campaignFacts,
    ...input.characterFacts
  })
}

function pruneEmptyFacts(facts: Record<string, string>): Record<string, string> {
  const pruned: Record<string, string> = {}
  for (const [key, value] of Object.entries(facts)) {
    if (hasText(value)) {
      pruned[key] = value
    }
  }
  return pruned
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}
