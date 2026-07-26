import { CharacterEngineError } from './errors.js'

export type JournalEntry = {
  id: string
  text: string
  createdAt: string
  linkedNpcId?: string
}

export type AddJournalEntryInput = {
  characterId: string
  text: string
  createdAt?: string
  linkedNpcId?: string
}

export type JournalEntryFilter = {
  linkedNpcId?: string
}

export type LogBookEntry = {
  id: string
  type: string
  payload: Record<string, unknown>
  createdAt: string
}

export type WriteLogBookEventInput = {
  characterIds: readonly string[]
  type: string
  payload: Record<string, unknown>
  createdAt?: string
}

export type QuestKind = 'main' | 'side'
export type QuestStatus = 'active' | 'complete' | 'failed'

export type QuestEntry = {
  questId: string
  kind: QuestKind
  status: QuestStatus
  title?: string
}

export type UpsertQuestInput = QuestEntry & {
  characterId: string
}

const journalStore = new Map<string, JournalEntry[]>()
const logBookStore = new Map<string, LogBookEntry[]>()
const questStore = new Map<string, Map<string, QuestEntry>>()
const knownActionStore = new Map<string, Set<string>>()
let nextRecordId = 1

export function addJournalEntry(input: AddJournalEntryInput): JournalEntry {
  const entry = buildJournalEntry(input)
  appendRecord(journalStore, input.characterId, entry)
  return { ...entry }
}

export function listJournalEntries(
  characterId: string,
  filter: JournalEntryFilter = {}
): JournalEntry[] {
  const entries = journalStore.get(characterId) ?? []
  const filtered = filter.linkedNpcId === undefined ? entries : entries.filter(matchesNpc(filter))
  return filtered.map(copyJournalEntry)
}

export function writeLogBookEvent(input: WriteLogBookEventInput): LogBookEntry[] {
  assertCharacterIds(input.characterIds)
  return input.characterIds.map((characterId) => {
    const entry = buildLogBookEntry(input)
    appendRecord(logBookStore, characterId, entry)
    return copyLogBookEntry(entry)
  })
}

export function listLogBookEntries(characterId: string): LogBookEntry[] {
  return (logBookStore.get(characterId) ?? []).map(copyLogBookEntry)
}

export function upsertQuest(input: UpsertQuestInput): QuestEntry {
  const quests = readQuestMap(input.characterId)
  const entry = buildQuestEntry(input)
  quests.set(input.questId, entry)
  return copyQuestEntry(entry)
}

export function listQuestLog(characterId: string): QuestEntry[] {
  const quests = questStore.get(characterId)
  return quests === undefined ? [] : [...quests.values()].map(copyQuestEntry)
}

export function learnKnownAction(characterId: string, actionId: string): string[] {
  const known = readKnownActionSet(characterId)
  known.add(actionId)
  return listKnownActions(characterId)
}

export function listKnownActions(characterId: string): string[] {
  return [...(knownActionStore.get(characterId) ?? new Set<string>())].sort()
}

function buildJournalEntry(input: AddJournalEntryInput): JournalEntry {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.text, 'text')
  const base = {
    id: createRecordId('journal'),
    text: input.text,
    createdAt: input.createdAt ?? nowIso()
  }
  return input.linkedNpcId === undefined ? base : { ...base, linkedNpcId: input.linkedNpcId }
}

function buildLogBookEntry(input: WriteLogBookEventInput): LogBookEntry {
  assertNonEmpty(input.type, 'type')
  return {
    id: createRecordId('log'),
    type: input.type,
    payload: { ...input.payload },
    createdAt: input.createdAt ?? nowIso()
  }
}

function buildQuestEntry(input: UpsertQuestInput): QuestEntry {
  assertNonEmpty(input.characterId, 'characterId')
  assertNonEmpty(input.questId, 'questId')
  const base = {
    questId: input.questId,
    kind: input.kind,
    status: input.status
  }
  return input.title === undefined ? base : { ...base, title: input.title }
}

function readQuestMap(characterId: string): Map<string, QuestEntry> {
  const existing = questStore.get(characterId)
  if (existing !== undefined) {
    return existing
  }
  const quests = new Map<string, QuestEntry>()
  questStore.set(characterId, quests)
  return quests
}

function readKnownActionSet(characterId: string): Set<string> {
  const existing = knownActionStore.get(characterId)
  if (existing !== undefined) {
    return existing
  }
  const known = new Set<string>()
  knownActionStore.set(characterId, known)
  return known
}

function matchesNpc(filter: JournalEntryFilter): (entry: JournalEntry) => boolean {
  return (entry) => entry.linkedNpcId === filter.linkedNpcId
}

function appendRecord<T>(store: Map<string, T[]>, characterId: string, entry: T): void {
  const entries = store.get(characterId) ?? []
  entries.push(entry)
  store.set(characterId, entries)
}

function assertCharacterIds(characterIds: readonly string[]): void {
  if (characterIds.length === 0) {
    throw new CharacterEngineError('RECORD_INPUT_INVALID', 'characterIds must not be empty')
  }
  characterIds.forEach((characterId) => assertNonEmpty(characterId, 'characterId'))
}

function assertNonEmpty(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new CharacterEngineError('RECORD_INPUT_INVALID', `${label} must not be empty`)
  }
}

function createRecordId(prefix: string): string {
  const id = `${prefix}-${nextRecordId}`
  nextRecordId += 1
  return id
}

function nowIso(): string {
  return new Date().toISOString()
}

function copyJournalEntry(entry: JournalEntry): JournalEntry {
  return entry.linkedNpcId === undefined
    ? { ...entry }
    : { ...entry, linkedNpcId: entry.linkedNpcId }
}

function copyLogBookEntry(entry: LogBookEntry): LogBookEntry {
  return { ...entry, payload: { ...entry.payload } }
}

function copyQuestEntry(entry: QuestEntry): QuestEntry {
  return entry.title === undefined ? { ...entry } : { ...entry, title: entry.title }
}
