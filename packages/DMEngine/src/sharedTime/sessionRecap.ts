import type {
  CharacterSessionCursor,
  CausalEvent,
  SessionRecap,
  SessionRecapInput
} from './types.js'
import { sortEventsByCausalOrder } from './turnOrderPolicy.js'

const cursorsByKey = new Map<string, CharacterSessionCursor>()

export function recordCharacterSessionCursor(cursor: CharacterSessionCursor): CharacterSessionCursor {
  const key = cursorKey(cursor.campaignId, cursor.characterId)
  const stored = { ...cursor }
  cursorsByKey.set(key, stored)
  return { ...stored }
}

export function getCharacterSessionCursor(
  campaignId: string,
  characterId: string
): CharacterSessionCursor | undefined {
  const cursor = cursorsByKey.get(cursorKey(campaignId, characterId))
  return cursor === undefined ? undefined : { ...cursor }
}

export function buildSessionRecap(input: SessionRecapInput): SessionRecap {
  const relevant = sortEventsByCausalOrder(
    input.events.filter((event) => event.at > input.lastSessionAt)
  )

  if (relevant.length === 0) {
    return {
      paragraphs: [
        'Since your last session, the world has been quiet — nothing notable reached your ears.'
      ],
      eventIds: []
    }
  }

  const paragraphs = relevant.map((event) => formatRecapSentence(event, input.characterId))
  return {
    paragraphs,
    eventIds: relevant.map((event) => event.id)
  }
}

export function exportCharacterSessionCursorStore(): CharacterSessionCursor[] {
  return [...cursorsByKey.values()].map((cursor) => ({ ...cursor }))
}

export function importCharacterSessionCursorStore(
  cursors: readonly CharacterSessionCursor[]
): CharacterSessionCursor[] {
  resetCharacterSessionCursorStore()
  for (const cursor of cursors) {
    recordCharacterSessionCursor(cursor)
  }
  return exportCharacterSessionCursorStore()
}

export function resetCharacterSessionCursorStore(): void {
  cursorsByKey.clear()
}

function formatRecapSentence(event: CausalEvent, viewerCharacterId: string): string {
  const prefix =
    event.actorCharacterId === viewerCharacterId
      ? `On day ${event.day}, you`
      : `Meanwhile, on day ${event.day}, another adventurer`

  switch (event.kind) {
    case 'travel':
      return `${prefix} traveled: ${event.summary}.`
    case 'combat':
      return `${prefix} fought: ${event.summary}.`
    case 'social':
      return `${prefix} interacted with locals: ${event.summary}.`
    case 'rest':
      return `${prefix} rested: ${event.summary}.`
    case 'explore':
      return `${prefix} explored: ${event.summary}.`
    default:
      return `${prefix}: ${event.summary}.`
  }
}

function cursorKey(campaignId: string, characterId: string): string {
  return `${campaignId}::${characterId}`
}
