import { stableHash } from './stableHash.js'
import {
  assertVnCharacterIdentitySeed,
  assertVnExpression,
  assertVnStance,
  type VnCharacterIdentitySeed,
  type VnExpression,
  type VnImagePrompt,
  type VnStance
} from './types.js'

export function vnCharacterStyleLockId(characterKey: string): string {
  return `vn-character-${stableHash(characterKey)}`
}

export type BuildVnCharacterPromptInput = {
  identity: VnCharacterIdentitySeed
  stance: VnStance
  expression: VnExpression
}

export function buildVnCharacterPrompt(input: BuildVnCharacterPromptInput): VnImagePrompt {
  const identity = normalizeIdentity(assertVnCharacterIdentitySeed(input.identity))
  const stance = assertVnStance(input.stance)
  const expression = assertVnExpression(input.expression)

  return {
    label: `${identity.displayName}'s character, ${stance}, ${expression}`,
    fullPrompt: buildFullPrompt(identity, stance, expression)
  }
}

function buildFullPrompt(
  identity: VnCharacterIdentitySeed,
  stance: VnStance,
  expression: VnExpression
): string {
  return [
    'Character sprite prompt for AI Visual Novel V1 placeholder.',
    'Style: anime visual novel style, clean character sprite rendering.',
    'Framing: subject-only, full character visible, no background, transparent background.',
    `Character: ${identity.displayName}`,
    `Appearance: ${identity.appearance}`,
    optionalStyleNotes(identity.styleNotes),
    `Stance: ${stance}`,
    `Expression: ${expression}`,
    styleLockLine(identity.characterKey)
  ]
    .filter(isText)
    .join('\n')
}

function styleLockLine(characterKey: string): string {
  return [
    `Style lock: ${vnCharacterStyleLockId(characterKey)}`,
    'preserve face, outfit, palette, and proportions across every stance and expression.'
  ].join('; ')
}

function optionalStyleNotes(notes: readonly string[] | undefined): string | null {
  const cleaned = notes?.map(normalizeText).filter(hasText) ?? []
  return cleaned.length > 0 ? `Style notes: ${cleaned.join('; ')}` : null
}

function normalizeIdentity(identity: VnCharacterIdentitySeed): VnCharacterIdentitySeed {
  const normalized: VnCharacterIdentitySeed = {
    characterKey: normalizeText(identity.characterKey),
    displayName: normalizeText(identity.displayName),
    appearance: normalizeText(identity.appearance)
  }
  if (identity.styleNotes !== undefined) {
    normalized.styleNotes = identity.styleNotes
  }
  return normalized
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function hasText(value: string): boolean {
  return value.length > 0
}

function isText(value: string | null): value is string {
  return value !== null
}
