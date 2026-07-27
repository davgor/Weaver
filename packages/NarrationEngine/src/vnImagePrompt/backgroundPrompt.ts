import type { VnImagePrompt } from './types.js'

const VN_BACKGROUND_PRESET_DEFS = [
  {
    id: 'tavern_interior',
    label: 'Tavern interior background',
    description: 'warm wooden tavern interior, candlelit tables, hearth glow'
  },
  {
    id: 'forest_path',
    label: 'Forest path background',
    description: 'leafy forest path, filtered daylight, soft moss and undergrowth'
  },
  {
    id: 'city_street',
    label: 'City street background',
    description: 'busy stone city street, shopfronts, banners, distant passersby implied'
  },
  {
    id: 'castle_hall',
    label: 'Castle hall background',
    description: 'grand castle hall, high arches, banners, polished stone floor'
  },
  {
    id: 'night_camp',
    label: 'Night camp background',
    description: 'quiet night camp, low firelight, bedrolls, dark treeline silhouettes'
  }
] as const

export type VnBackgroundPresetId = (typeof VN_BACKGROUND_PRESET_DEFS)[number]['id']

export type VnBackgroundPreset = {
  readonly id: VnBackgroundPresetId
  readonly label: string
  readonly description: string
}

export type VnPresetBackgroundPromptInput = {
  kind: 'preset'
  presetId: VnBackgroundPresetId
}

export type VnAdaptiveBackgroundPromptInput = {
  kind: 'adaptive'
  locationLabel: string
  sceneDescriptors: readonly string[]
}

export type BuildVnBackgroundPromptInput =
  | VnPresetBackgroundPromptInput
  | VnAdaptiveBackgroundPromptInput

export function listVnBackgroundPresets(): readonly VnBackgroundPreset[] {
  return VN_BACKGROUND_PRESET_DEFS
}

export function buildVnBackgroundPrompt(input: BuildVnBackgroundPromptInput): VnImagePrompt {
  if (input.kind === 'preset') {
    return buildPresetPrompt(input.presetId)
  }
  return buildAdaptivePrompt(input)
}

function buildPresetPrompt(presetId: VnBackgroundPresetId): VnImagePrompt {
  const preset = VN_BACKGROUND_PRESET_DEFS.find((entry) => entry.id === presetId)
  if (preset === undefined) {
    throw new Error(`Unknown VN background preset: ${presetId}`)
  }

  return {
    label: preset.label,
    fullPrompt: [
      'Background prompt for AI Visual Novel V1 placeholder.',
      'Style: anime visual novel background, painterly environment plate, no characters.',
      `Preset: ${preset.id}`,
      `Scene: ${preset.description}`
    ].join('\n')
  }
}

function buildAdaptivePrompt(input: VnAdaptiveBackgroundPromptInput): VnImagePrompt {
  const locationLabel = normalizeRequired('locationLabel', input.locationLabel)
  const descriptors = normalizeDescriptors(input.sceneDescriptors)

  return {
    label: `${locationLabel} background`,
    fullPrompt: [
      'Background prompt for AI Visual Novel V1 placeholder.',
      'Style: anime visual novel background, painterly environment plate, no characters.',
      `Location: ${locationLabel}`,
      `Scene descriptors: ${descriptors.join('; ')}`,
      'Grounding: use only the listed caller facts; do not add unsupplied geography.'
    ].join('\n')
  }
}

function normalizeDescriptors(sceneDescriptors: readonly string[]): readonly string[] {
  const descriptors = sceneDescriptors.map(normalizeText).filter(hasText)
  if (descriptors.length === 0) {
    throw new Error('Adaptive VN background prompt requires sceneDescriptors.')
  }
  return descriptors
}

function normalizeRequired(field: string, value: string): string {
  const normalized = normalizeText(value)
  if (!hasText(normalized)) {
    throw new Error(`Adaptive VN background prompt requires ${field}.`)
  }
  return normalized
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function hasText(value: string): boolean {
  return value.length > 0
}
