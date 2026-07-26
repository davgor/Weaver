import type { ProviderId } from '@weaver/llm-engine'
import type { EmbedderMode, ImageProviderId } from '@weaver/narration-engine'

export type TextProviderId = Exclude<ProviderId, 'local'>

type SettingsOption<T extends string> = {
  id: T
  label: string
  description: string
}

export type ProviderModelSelection = {
  selectedModelId: string
  customModelId: string
}

export type ProviderCredentialSettings = {
  apiKey: string
  baseUrl: string
}

type TextProviderSettingsSnapshot = {
  provider: TextProviderId
  models: Record<TextProviderId, ProviderModelSelection>
  credentials: Record<TextProviderId, ProviderCredentialSettings>
}

type ImageRailSettingsSnapshot = {
  provider: ImageProviderId
  generativeTokensEnabled: boolean
}

type EmbeddingSettingsSnapshot = {
  mode: EmbedderMode
  supportedModes: EmbedderMode[]
  mixedModeNote: string
}

export type SettingsSnapshot = {
  text: TextProviderSettingsSnapshot
  image: ImageRailSettingsSnapshot
  embeddings: EmbeddingSettingsSnapshot
  updatedAt: string
}

export type UpdateSettingsRequest = {
  textProvider?: TextProviderId
  providerModels?: Partial<Record<TextProviderId, Partial<ProviderModelSelection>>>
  providerCredentials?: Partial<Record<TextProviderId, Partial<ProviderCredentialSettings>>>
  imageProvider?: ImageProviderId
  generativeTokensEnabled?: boolean
  embedderMode?: EmbedderMode
}

type CheckConnectionRequest = {
  providerOverride?: TextProviderId | 'local'
}

type SettingsApplyResult = {
  ok: boolean
  provider: TextProviderId
  model: string
  message: string
}

type SettingsUpdateResponse = {
  snapshot: SettingsSnapshot
  apply: SettingsApplyResult
}

export type SettingsConnectionResult = {
  ok: boolean
  provider: TextProviderId | 'local'
  message: string
  backend?: string
  statusPhase?: string
}

export type SettingsApi = {
  get: () => Promise<SettingsSnapshot>
  update: (request: UpdateSettingsRequest) => Promise<SettingsUpdateResponse>
  checkConnection: (request?: CheckConnectionRequest) => Promise<SettingsConnectionResult>
}

export const textProviderOptions: readonly SettingsOption<TextProviderId>[] = [
  option('claude', 'Claude', 'Anthropic Claude with curated Sonnet defaults.'),
  option('openai', 'OpenAI', 'OpenAI chat-completions compatible models.'),
  option('gemini', 'Gemini', 'Google Gemini generation models.'),
  option('grok', 'Grok', 'xAI Grok OpenAI-compatible endpoint.'),
  option('player2', 'Player2', 'Local Player2 provider bridge.')
] as const

export const imageProviderOptions: readonly SettingsOption<ImageProviderId>[] = [
  option('cloud', 'Cloud', 'Use the configured cloud visual-token rail.'),
  option('player2', 'Player2', 'Use Player2 image generation independently from text.'),
  option('local', 'Local', 'Use a local image runtime when available.')
] as const

export const embedderModeOptions: readonly SettingsOption<EmbedderMode>[] = [
  option('lexical', 'Lexical only', 'Keyword retrieval with no embedding backend.'),
  option('local', 'Local', 'Use local embeddings when NarrationEngine can serve them.'),
  option('openai', 'OpenAI', 'Use OpenAI embeddings for semantic ranking.'),
  option('gemini', 'Gemini', 'Use Gemini embeddings for semantic ranking.')
] as const

const curatedModels: Record<TextProviderId, readonly string[]> = {
  claude: ['claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
  openai: ['gpt-4o-mini', 'gpt-4o'],
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro'],
  grok: ['grok-3-latest', 'grok-3-mini'],
  player2: ['player2']
}

const defaultNote =
  'Switching embedder modes keeps mixed-mode chunks searchable through lexical fallback.'

export function buildDefaultSettingsSnapshot(now = new Date()): SettingsSnapshot {
  return {
    text: {
      provider: 'player2',
      models: defaultModelSelections(),
      credentials: defaultCredentials()
    },
    image: {
      provider: 'cloud',
      generativeTokensEnabled: true
    },
    embeddings: {
      mode: 'lexical',
      supportedModes: ['lexical'],
      mixedModeNote: defaultNote
    },
    updatedAt: now.toISOString()
  }
}

export function curatedModelIds(provider: TextProviderId): readonly string[] {
  return curatedModels[provider]
}

export function effectiveTextModelId(
  snapshot: SettingsSnapshot,
  provider = snapshot.text.provider
): string {
  const selection = snapshot.text.models[provider]
  const custom = clean(selection.customModelId)
  return custom ?? selection.selectedModelId
}

export function supportedEmbedderModesFromDescription(description: unknown): EmbedderMode[] {
  const modes = readEmbedderModeList(description).filter(isEmbedderMode)
  const supported = embedderModeOptions.flatMap((option) => {
    return modes.includes(option.id) ? [option.id] : []
  })
  return supported.length === 0 ? ['lexical'] : supported
}

function option<T extends string>(id: T, label: string, description: string): SettingsOption<T> {
  return { id, label, description }
}

function defaultModelSelections(): Record<TextProviderId, ProviderModelSelection> {
  return {
    claude: modelSelection('claude'),
    openai: modelSelection('openai'),
    gemini: modelSelection('gemini'),
    grok: modelSelection('grok'),
    player2: modelSelection('player2')
  }
}

function modelSelection(provider: TextProviderId): ProviderModelSelection {
  return {
    selectedModelId: curatedModels[provider][0] ?? provider,
    customModelId: ''
  }
}

function defaultCredentials(): Record<TextProviderId, ProviderCredentialSettings> {
  const empty = { apiKey: '', baseUrl: '' }
  return {
    claude: { ...empty },
    openai: { ...empty },
    gemini: { ...empty },
    grok: { ...empty },
    player2: { ...empty }
  }
}

function readEmbedderModeList(description: unknown): unknown[] {
  if (!isRecord(description) || !Array.isArray(description.embedderModes)) {
    return []
  }
  return description.embedderModes
}

function isEmbedderMode(value: unknown): value is EmbedderMode {
  return value === 'lexical' || value === 'local' || value === 'openai' || value === 'gemini'
}

function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
