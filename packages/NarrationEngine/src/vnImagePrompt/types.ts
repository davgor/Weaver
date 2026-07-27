export const VN_STANCES = [
  'Standing',
  'Sitting',
  'Kneeling',
  'Fighting',
  'Walking',
  'Running',
  'Casting'
] as const

export const VN_EXPRESSIONS = ['Neutral', 'Angry', 'Happy', 'Sad', 'Surprised', 'Afraid'] as const

export type VnStance = (typeof VN_STANCES)[number]
export type VnExpression = (typeof VN_EXPRESSIONS)[number]

export type VnCharacterIdentitySeed = {
  characterKey: string
  displayName: string
  appearance: string
  styleNotes?: readonly string[]
}

export type VnImagePrompt = {
  label: string
  fullPrompt: string
}

export type VnCharacterIdentityValidation = {
  identity: VnCharacterIdentitySeed
  ok: boolean
  errors: string[]
}

export function isVnStance(value: unknown): value is VnStance {
  return typeof value === 'string' && VN_STANCES.includes(value as VnStance)
}

export function isVnExpression(value: unknown): value is VnExpression {
  return typeof value === 'string' && VN_EXPRESSIONS.includes(value as VnExpression)
}

export function assertVnStance(value: unknown): VnStance {
  if (isVnStance(value)) {
    return value
  }
  throw new Error('VN character stance must be one of the enumerated VN_STANCES values.')
}

export function assertVnExpression(value: unknown): VnExpression {
  if (isVnExpression(value)) {
    return value
  }
  throw new Error('VN character expression must be one of the enumerated VN_EXPRESSIONS values.')
}

export function validateVnCharacterIdentitySeed(
  identity: VnCharacterIdentitySeed
): VnCharacterIdentityValidation {
  const errors = [
    requiredTextError('characterKey', identity.characterKey),
    requiredTextError('displayName', identity.displayName),
    requiredTextError('appearance', identity.appearance)
  ].filter(isText)

  return { identity, ok: errors.length === 0, errors }
}

export function assertVnCharacterIdentitySeed(
  identity: VnCharacterIdentitySeed
): VnCharacterIdentitySeed {
  const validation = validateVnCharacterIdentitySeed(identity)
  if (validation.ok) {
    return identity
  }
  throw new Error(`VN character identity seed invalid: ${validation.errors.join('; ')}`)
}

function requiredTextError(field: string, value: string): string | null {
  return value.trim().length > 0 ? null : `${field} is required`
}

function isText(value: string | null): value is string {
  return value !== null
}
