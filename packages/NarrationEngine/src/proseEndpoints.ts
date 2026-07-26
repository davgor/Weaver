import { extractClaims, stripClaimBlock } from './claimExtract.js'
import { validateProse } from './proseValidate.js'
import type { NarrationPeers } from './peers.js'
import {
  clearNarrationStore,
  generateScene,
  projectScene,
  projectSocial,
  recordPlayerSocial,
  streamSocial
} from './proseApi.js'
import type { SceneGenerateInput, SocialGenerateInput, TurnInterestInput } from './proseTypes.js'
import { decideSilentResolve } from './silentResolve.js'

export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export function buildProseEndpoints(getPeers: () => NarrationPeers | undefined): EngineEndpoint[] {
  return [
    endpoint('projectSocial', 'Return persisted Social dialogue projection', () => projectSocial()),
    endpoint('projectScene', 'Return persisted Scene exposition projection', () => projectScene()),
    endpoint('clearNarrationStore', 'Clear Social and Scene projections', () => {
      clearNarrationStore()
      return { ok: true as const }
    }),
    endpoint('recordPlayerSocial', 'Append a player line to Social', (payload) =>
      recordPlayerSocial(readPlayerSocial(payload))
    ),
    endpoint('decideSilentResolve', 'Decide whether a turn needs narration', (payload) =>
      decideSilentResolve(readInterest(payload))
    ),
    endpoint('generateScene', 'Generate and validate Scene exposition', async (payload) => {
      return await generateScene(readSceneInput(payload), requirePeers(getPeers()))
    }),
    endpoint('streamSocial', 'Generate streaming Social dialogue', async (payload) => {
      return await collectSocialStream(readSocialInput(payload), requirePeers(getPeers()))
    }),
    endpoint('validateProseClaims', 'Extract and validate claims in prose', (payload) => {
      const raw = readStringRecord(asRecord(payload, 'validateProseClaims'), 'prose')
      const claims = extractClaims(raw)
      const validation = validateProse(stripClaimBlock(raw), claims, requirePeers(getPeers()))
      return {
        prose: validation.prose,
        claims,
        validation
      }
    })
  ]
}

function endpoint(
  name: string,
  description: string,
  invoke: (payload?: unknown) => Promise<unknown> | unknown
): EngineEndpoint {
  return { name, description, invoke }
}

async function collectSocialStream(input: SocialGenerateInput, peers: NarrationPeers) {
  const events = []
  for await (const event of streamSocial(input, peers)) {
    events.push(event)
  }
  return { events }
}

function requirePeers(peers: NarrationPeers | undefined): NarrationPeers {
  if (peers === undefined) {
    throw new Error('Narration prose endpoints require injected peers')
  }
  return peers
}

function readPlayerSocial(payload: unknown): { speakerId: string; text: string } {
  const record = asRecord(payload, 'recordPlayerSocial')
  return {
    speakerId: readStringRecord(record, 'speakerId'),
    text: readStringRecord(record, 'text')
  }
}

function readInterest(payload: unknown): TurnInterestInput {
  const record = asRecord(payload, 'decideSilentResolve')
  const stakes = record.stakes
  if (stakes !== 'low' && stakes !== 'high') {
    throw new Error('decideSilentResolve payload requires stakes low|high')
  }
  return {
    stakes,
    hasDialogue: readBoolean(record, 'hasDialogue'),
    worldChanged: readBoolean(record, 'worldChanged'),
    combatOccurred: readBoolean(record, 'combatOccurred'),
    noteworthyEventCount: readNumber(record, 'noteworthyEventCount')
  }
}

function readSceneInput(payload: unknown): SceneGenerateInput {
  const record = asRecord(payload, 'generateScene')
  return readPromptInput(record)
}

function readSocialInput(payload: unknown): SocialGenerateInput {
  const record = asRecord(payload, 'streamSocial')
  const kind = readSocialKind(record.kind)
  const base: SocialGenerateInput = {
    ...readPromptInput(record),
    speakerId: readStringRecord(record, 'speakerId'),
    kind
  }
  if (record.interest === undefined) {
    return base
  }
  return { ...base, interest: readInterest(asRecord(record.interest, 'interest')) }
}

function readSocialKind(value: unknown): SocialGenerateInput['kind'] {
  if (value === 'player' || value === 'npc') {
    return value
  }
  throw new Error('streamSocial payload requires kind player|npc')
}

function readPromptInput(record: Record<string, unknown>): SceneGenerateInput {
  const prompt = readStringRecord(record, 'prompt')
  const context = optionalString(record.context)
  const maxTokens = optionalNumber(record.maxTokens)
  return {
    prompt,
    ...(context === undefined ? {} : { context }),
    ...(maxTokens === undefined ? {} : { maxTokens })
  }
}

function asRecord(payload: unknown, label: string): Record<string, unknown> {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new Error(`${label} payload must be an object`)
  }
  return payload as Record<string, unknown>
}

function readStringRecord(record: Record<string, unknown>, key: string): string {
  const value = record[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`payload requires string ${key}`)
  }
  return value
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key]
  if (typeof value !== 'boolean') {
    throw new Error(`payload requires boolean ${key}`)
  }
  return value
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`payload requires number ${key}`)
  }
  return value
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}
