import type { TextCompleter } from './peers.js'
import { fillAndValidate } from './skeletonFill.js'

export type GuidedIdentityPhase = 'who' | 'why' | 'where' | 'what'

export type GuidedIdentityInput = {
  phase: GuidedIdentityPhase
  transcript: string | readonly string[]
  characterFacts: Record<string, string>
  seed?: string
}

export type GuidedIdentityResult = {
  ok: boolean
  prose?: string
  errors: string[]
}

const REQUIRED_FACT_KEYS = ['race', 'background', 'archetype'] as const
const MECHANICAL_FACT_KEYS = [
  'body',
  'agility',
  'mind',
  'presence',
  'strength',
  'dexterity',
  'constitution',
  'intelligence',
  'wisdom',
  'charisma',
  'level',
  'hp',
  'ac'
] as const

export async function generateGuidedIdentityReply(
  input: GuidedIdentityInput,
  completer: TextCompleter
): Promise<GuidedIdentityResult> {
  const result = await fillAndValidate(toFillInput(input), completer)
  const prose = result.filled.REPLY
  if (!result.ok || prose === undefined) {
    return { ok: false, errors: result.errors }
  }

  const errors = [
    ...identityMentionErrors(prose, input.characterFacts),
    ...mechanicalConflictErrors(prose, input.characterFacts)
  ]
  return errors.length === 0 ? { ok: true, prose, errors: [] } : { ok: false, errors }
}

function toFillInput(input: GuidedIdentityInput) {
  return {
    skeleton: '{{REPLY}}',
    facts: input.characterFacts,
    stage: guidedStage(input),
    ...(input.seed === undefined ? {} : { seed: input.seed })
  }
}

function guidedStage(input: GuidedIdentityInput): string {
  return [
    `guidedIdentity.reply:${input.phase}`,
    'Write one in-character prose reply in a REPLY labeled block.',
    'Respect race, background, archetype, and existing mechanical facts.',
    'Transcript:',
    ...transcriptLines(input.transcript)
  ].join('\n')
}

function identityMentionErrors(prose: string, facts: Record<string, string>): string[] {
  const normalizedProse = normalizeText(prose)
  return REQUIRED_FACT_KEYS.flatMap((key) => mentionError(key, facts, normalizedProse))
}

function mentionError(key: string, facts: Record<string, string>, normalizedProse: string): string[] {
  const value = readFactValue(facts, key)
  if (!hasText(value)) {
    return [`characterFacts.${key} is required`]
  }
  return normalizedProse.includes(normalizeText(value)) ? [] : [`Reply must mention ${key}=${value}`]
}

function mechanicalConflictErrors(prose: string, facts: Record<string, string>): string[] {
  const errors: string[] = []
  for (const key of MECHANICAL_FACT_KEYS) {
    const expected = firstNumber(readFactValue(facts, key))
    const observed = readMechanicalNumber(prose, key)
    if (expected !== null && observed !== null && observed !== expected) {
      errors.push(`Reply contradicts mechanical fact ${key}=${expected}`)
    }
  }
  return errors
}

function readMechanicalNumber(prose: string, key: string): string | null {
  const pattern = new RegExp(`\\b${key}\\b\\s*(?:score|stat|is|:|=)?\\s*(-?\\d+)`, 'i')
  const match = pattern.exec(prose)
  return match?.[1] ?? null
}

function readFactValue(facts: Record<string, string>, key: string): string {
  for (const [factKey, value] of Object.entries(facts)) {
    if (normalizeText(factKey) === key) {
      return value
    }
  }
  return ''
}

function firstNumber(value: string): string | null {
  const match = /-?\d+/.exec(value)
  return match?.[0] ?? null
}

function transcriptLines(transcript: string | readonly string[]): string[] {
  return typeof transcript === 'string' ? [transcript] : [...transcript]
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function hasText(value: string): boolean {
  return value.trim().length > 0
}
