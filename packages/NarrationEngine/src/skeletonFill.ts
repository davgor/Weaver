import type { TextCompleter, TextCompletionRequest } from './peers.js'

export type FillAndValidateInput = {
  skeleton: string
  facts: Record<string, string>
  stage: string
  seed?: string
}

export type FillAndValidateResult = {
  ok: boolean
  filled: Record<string, string>
  filledText?: string
  errors: string[]
}

const TOKEN_PATTERN = /{{\s*@?([A-Za-z0-9_.-]+)\s*}}/g
const BLOCK_PATTERN = /<<<\s*(@?[A-Za-z0-9_.-]+)\s*>>>([\s\S]*?)<<<\s*\/\s*\1\s*>>>/g

export function parseLabeledBlocks(raw: string): Record<string, string> {
  const blocks: Record<string, string> = {}
  for (const match of raw.matchAll(BLOCK_PATTERN)) {
    const token = match[1]
    const content = match[2]
    if (token !== undefined && content !== undefined) {
      blocks[normalizeToken(token)] = content.trim()
    }
  }
  return blocks
}

export function fillSkeleton(skeleton: string, blocks: Record<string, string>): string {
  return skeleton.replace(TOKEN_PATTERN, (placeholder: string, token: string) => {
    return blocks[normalizeToken(token)] ?? placeholder
  })
}

export async function fillAndValidate(
  input: FillAndValidateInput,
  completer: TextCompleter
): Promise<FillAndValidateResult> {
  const response = await completer.completeText(toCompletionRequest(input))
  const parsed = parseLabeledBlocks(response.text)
  const tokens = extractSkeletonTokens(input.skeleton)
  const filled = selectBlocks(tokens, parsed)
  const errors = [
    ...missingTokenErrors(tokens, parsed),
    ...factContradictionErrors(filled, input.facts)
  ]

  if (errors.length > 0) {
    return { ok: false, filled, errors }
  }
  return { ok: true, filled, filledText: fillSkeleton(input.skeleton, filled), errors: [] }
}

function toCompletionRequest(input: FillAndValidateInput): TextCompletionRequest {
  const lines = [
    'Fill each skeleton placeholder with one labeled block.',
    'Return only blocks formatted as <<<TOKEN>>>content<<</TOKEN>>>.',
    `Stage: ${input.stage}`,
    ...seedLines(input.seed)
  ]
  return {
    prompt: lines.join('\n'),
    context: ['Skeleton:', input.skeleton, 'Facts:', factLines(input.facts).join('\n')].join('\n')
  }
}

function extractSkeletonTokens(skeleton: string): string[] {
  const tokens = new Set<string>()
  for (const match of skeleton.matchAll(TOKEN_PATTERN)) {
    const token = match[1]
    if (token !== undefined) {
      tokens.add(normalizeToken(token))
    }
  }
  return [...tokens]
}

function selectBlocks(tokens: string[], parsed: Record<string, string>): Record<string, string> {
  const selected: Record<string, string> = {}
  for (const token of tokens) {
    const value = parsed[token]
    if (value !== undefined) {
      selected[token] = value
    }
  }
  return selected
}

function missingTokenErrors(tokens: string[], parsed: Record<string, string>): string[] {
  return tokens.filter((token) => parsed[token] === undefined).map((token) => `Missing block for token ${token}`)
}

function factContradictionErrors(
  blocks: Record<string, string>,
  facts: Record<string, string>
): string[] {
  const errors: string[] = []
  for (const [token, content] of Object.entries(blocks)) {
    for (const [key, expected] of Object.entries(facts)) {
      if (hasText(expected) && contradictsFact(content, key, expected)) {
        errors.push(`Block ${token} contradicts fact ${key}=${expected}`)
      }
    }
  }
  return errors
}

function contradictsFact(text: string, key: string, expected: string): boolean {
  const normalizedExpected = normalizeText(expected)
  const labeledValue = readLabeledFactValue(text, key)
  if (labeledValue !== null) {
    return !normalizeText(labeledValue).includes(normalizedExpected)
  }
  return normalizeText(text).includes(`not ${normalizedExpected}`)
}

function readLabeledFactValue(text: string, key: string): string | null {
  for (const alias of factKeyAliases(key)) {
    const pattern = new RegExp(`\\b${escapeRegExp(alias)}\\b\\s*(?::|=|is|are)\\s*([^.;\\n]+)`, 'i')
    const match = pattern.exec(text)
    if (match?.[1] !== undefined) {
      return match[1]
    }
  }
  return null
}

function factKeyAliases(key: string): string[] {
  const trimmed = key.trim()
  const parts = trimmed.split(/[._-]/)
  const last = parts[parts.length - 1] ?? trimmed
  return [...new Set([trimmed, last].filter(hasText))]
}

function factLines(facts: Record<string, string>): string[] {
  return Object.entries(facts).map(([key, value]) => `${key}: ${value}`)
}

function seedLines(seed: string | undefined): string[] {
  return hasText(seed) ? [`Seed: ${seed}`] : []
}

function normalizeToken(token: string): string {
  return token.trim().replace(/^@/, '')
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function hasText(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0
}
