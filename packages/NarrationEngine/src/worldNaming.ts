import { createHash } from 'node:crypto'
import { resolveDeityName } from './deityNameValidate.js'
import type { TextCompleter } from './peers.js'
import { validateProseTone } from './toneGuard.js'

export type RegionPlaceStats = {
  dominantLandType: string
  isOcean: boolean
  isLandlocked: boolean
  touchesOcean: boolean
  waterContent: number
  existingDisplayName?: string
}

export type SettlementPlaceStats = {
  settlementKind: string
  population: number
  regionDominantLandType?: string
  regionIsLandlocked?: boolean
  regionTouchesOcean?: boolean
  existingDisplayName?: string
}

export type PlaceStats = RegionPlaceStats | SettlementPlaceStats

export type RealizePlaceNamingInput = {
  kind: 'region' | 'settlement'
  stats: PlaceStats
  campaignId: string
  seed?: string
}

export type PlaceNaming = {
  displayName: string
  history: string
  campaignId: string
}

export type PlaceNamingOutcome =
  | { ok: true; naming: PlaceNaming }
  | { ok: false; reason: string }

export type PantheonDeity = {
  name: string
  domain: string
}

export type PantheonNaming = {
  campaignId: string
  deities: PantheonDeity[]
}

export type RealizePantheonInput = {
  campaignId: string
  count: number
  seed?: string
}

export type PantheonOutcome =
  | { ok: true; pantheon: PantheonNaming }
  | { ok: false; reason: string }

const COASTAL_TERMS =
  /\b(harbou?r|harborside|dockside|port|bay|coast|seaside|wharf|docks?|tidal|maritime|lagoon|pier)\b/i

export async function realizePlaceNaming(
  input: RealizePlaceNamingInput,
  completer: TextCompleter
): Promise<PlaceNamingOutcome> {
  const prompt = buildPlacePrompt(input)
  const first = await requestPlaceDraft(prompt, completer)
  const firstOutcome = validatePlaceDraft(input, first)
  if (firstOutcome.ok) {
    return firstOutcome
  }

  const retry = await requestPlaceDraft(
    `${prompt}\nRewrite without these issues: ${firstOutcome.reason}`,
    completer
  )
  const retryOutcome = validatePlaceDraft(input, retry)
  return retryOutcome.ok ? retryOutcome : firstOutcome
}

export async function realizePantheon(
  input: RealizePantheonInput,
  completer: TextCompleter
): Promise<PantheonOutcome> {
  const prompt = buildPantheonPrompt(input)
  const first = await requestPantheonDraft(prompt, completer)
  const firstOutcome = validatePantheonDraft(input, first)
  if (firstOutcome.ok) {
    return firstOutcome
  }

  const retry = await requestPantheonDraft(
    `${prompt}\nRewrite without these issues: ${firstOutcome.reason}`,
    completer
  )
  const retryOutcome = validatePantheonDraft(input, retry)
  return retryOutcome.ok ? retryOutcome : firstOutcome
}

export function sealPlaceNaming(naming: PlaceNaming): string {
  return createHash('sha256')
    .update(`${naming.campaignId}\0${naming.displayName}\0${naming.history}`)
    .digest('hex')
}

export function sealPantheon(pantheon: PantheonNaming): string {
  const body = pantheon.deities.map((d) => `${d.name}\0${d.domain}`).join('\n')
  return createHash('sha256').update(`${pantheon.campaignId}\0${body}`).digest('hex')
}

async function requestPlaceDraft(prompt: string, completer: TextCompleter): Promise<PlaceDraft> {
  const response = await completer.completeText({ prompt, maxTokens: 256 })
  return parsePlaceDraft(response.text)
}

async function requestPantheonDraft(prompt: string, completer: TextCompleter): Promise<PantheonDraft> {
  const response = await completer.completeText({ prompt, maxTokens: 512 })
  return parsePantheonDraft(response.text)
}

type PlaceDraft = {
  displayName: string
  history: string
}

type PantheonDraft = {
  deities: PantheonDeity[]
}

function buildPlacePrompt(input: RealizePlaceNamingInput): string {
  const stats = JSON.stringify(input.stats)
  return [
    'Invent a plain-English fantasy place name and two-sentence history.',
    'Respond with JSON only: {"displayName":"...","history":"..."}',
    `Kind: ${input.kind}`,
    `Campaign: ${input.campaignId}`,
    `Stats: ${stats}`,
    input.seed === undefined ? '' : `Seed: ${input.seed}`
  ]
    .filter((line) => line.length > 0)
    .join('\n')
}

function buildPantheonPrompt(input: RealizePantheonInput): string {
  return [
    'Invent a pantheon of plain-English fantasy deities with short domains.',
    'Respond with JSON only: {"deities":[{"name":"...","domain":"..."}]}',
    `Campaign: ${input.campaignId}`,
    `Count: ${input.count}`,
    input.seed === undefined ? '' : `Seed: ${input.seed}`
  ]
    .filter((line) => line.length > 0)
    .join('\n')
}

function validatePlaceDraft(
  input: RealizePlaceNamingInput,
  draft: PlaceDraft
): PlaceNamingOutcome {
  const displayName = draft.displayName.trim()
  const history = draft.history.trim()
  if (displayName.length === 0 || history.length === 0) {
    return { ok: false, reason: 'Place naming requires displayName and history' }
  }

  const nameTone = validateProseTone(displayName)
  const historyTone = validateProseTone(history)
  if (!nameTone.ok || !historyTone.ok) {
    const violations = [...nameTone.violations, ...historyTone.violations]
    return { ok: false, reason: `Tone violation: ${violations.join(', ')}` }
  }

  const coastalIssue = coastalContradiction(input, `${displayName} ${history}`)
  if (coastalIssue !== null) {
    return { ok: false, reason: coastalIssue }
  }

  const labelIssue = labelContradiction(input.stats, displayName)
  if (labelIssue !== null) {
    return { ok: false, reason: labelIssue }
  }

  return {
    ok: true,
    naming: {
      campaignId: input.campaignId,
      displayName: nameTone.prose,
      history: historyTone.prose
    }
  }
}

function validatePantheonDraft(input: RealizePantheonInput, draft: PantheonDraft): PantheonOutcome {
  if (draft.deities.length !== input.count) {
    return { ok: false, reason: `Expected ${input.count} deities, received ${draft.deities.length}` }
  }

  const deities: PantheonDeity[] = []
  for (let index = 0; index < draft.deities.length; index += 1) {
    const entry = draft.deities[index]
    if (entry === undefined) {
      return { ok: false, reason: 'Missing deity entry' }
    }
    const resolved = resolveDeityName(entry.name, index)
    if (resolved.fellBack) {
      return { ok: false, reason: resolved.reason }
    }
    const domainTone = validateProseTone(entry.domain.trim())
    if (!domainTone.ok) {
      return { ok: false, reason: `Tone violation: ${domainTone.violations.join(', ')}` }
    }
    deities.push({ name: resolved.name, domain: domainTone.prose })
  }

  return { ok: true, pantheon: { campaignId: input.campaignId, deities } }
}

function coastalContradiction(input: RealizePlaceNamingInput, text: string): string | null {
  if (!COASTAL_TERMS.test(text)) {
    return null
  }
  if (input.kind === 'region') {
    const stats = input.stats as RegionPlaceStats
    if (stats.isLandlocked && !stats.touchesOcean && !stats.isOcean) {
      return 'Coastal naming contradicts landlocked region stats'
    }
    return null
  }

  const stats = input.stats as SettlementPlaceStats
  if (stats.regionIsLandlocked === true && stats.regionTouchesOcean !== true) {
    return 'Coastal naming contradicts landlocked region stats'
  }
  return null
}

function labelContradiction(stats: PlaceStats, displayName: string): string | null {
  const existing = stats.existingDisplayName?.trim()
  if (existing === undefined || existing.length === 0) {
    return null
  }
  if (existing.toLowerCase() !== displayName.toLowerCase()) {
    return `Display name must match existing label: ${existing}`
  }
  return null
}

function parsePlaceDraft(text: string): PlaceDraft {
  const parsed = parseJson(text)
  return {
    displayName: readString(parsed, 'displayName'),
    history: readString(parsed, 'history')
  }
}

function parsePantheonDraft(text: string): PantheonDraft {
  const parsed = parseJson(text)
  const raw = parsed.deities
  if (!Array.isArray(raw)) {
    return { deities: [] }
  }
  const deities = raw
    .map((entry) => parseDeity(entry))
    .filter((entry): entry is PantheonDeity => entry !== null)
  return { deities }
}

function parseDeity(value: unknown): PantheonDeity | null {
  if (!isRecord(value)) {
    return null
  }
  const name = readString(value, 'name')
  const domain = readString(value, 'domain')
  if (name.length === 0 || domain.length === 0) {
    return null
  }
  return { name, domain }
}

function parseJson(text: string): Record<string, unknown> {
  const trimmed = text.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start < 0 || end <= start) {
    return {}
  }
  try {
    const parsed: unknown = JSON.parse(trimmed.slice(start, end + 1))
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  return typeof value === 'string' ? value : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
