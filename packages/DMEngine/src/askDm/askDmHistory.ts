import type { AskDmHistory, AskDmHistoryEntry, AskDmSpeaker } from './types.js'

const historyByKey = new Map<string, AskDmHistory>()

export function getAskDmHistory(campaignId: string, characterId: string): AskDmHistory | undefined {
  const history = historyByKey.get(historyKey(campaignId, characterId))
  return history === undefined ? undefined : cloneHistory(history)
}

export function appendAskDmEntry(input: {
  campaignId: string
  characterId: string
  speaker: AskDmSpeaker
  text: string
}): AskDmHistory {
  const key = historyKey(input.campaignId, input.characterId)
  const current = historyByKey.get(key) ?? emptyHistory(input.campaignId, input.characterId)
  const next = {
    ...current,
    entries: [...current.entries, entry(input.speaker, input.text)]
  }
  historyByKey.set(key, cloneHistory(next))
  return cloneHistory(next)
}

export function exportAskDmHistory(): AskDmHistory[] {
  return [...historyByKey.values()].map(cloneHistory)
}

export function importAskDmHistory(histories: readonly AskDmHistory[]): AskDmHistory[] {
  historyByKey.clear()
  for (const history of histories) {
    historyByKey.set(historyKey(history.campaignId, history.characterId), normalizeHistory(history))
  }
  return exportAskDmHistory()
}

export function resetAskDmHistoryStore(): void {
  historyByKey.clear()
}

function emptyHistory(campaignId: string, characterId: string): AskDmHistory {
  return { campaignId, characterId, entries: [] }
}

function entry(speaker: AskDmSpeaker, text: string): AskDmHistoryEntry {
  return { speaker, text }
}

function historyKey(campaignId: string, characterId: string): string {
  return `${campaignId}:${characterId}`
}

function normalizeHistory(history: AskDmHistory): AskDmHistory {
  return {
    campaignId: history.campaignId,
    characterId: history.characterId,
    entries: history.entries.map(cloneEntry)
  }
}

function cloneHistory(history: AskDmHistory): AskDmHistory {
  return normalizeHistory(history)
}

function cloneEntry(entryValue: AskDmHistoryEntry): AskDmHistoryEntry {
  return { speaker: entryValue.speaker, text: entryValue.text }
}
