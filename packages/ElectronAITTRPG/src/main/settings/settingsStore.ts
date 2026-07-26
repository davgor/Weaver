import {
  buildDefaultSettingsSnapshot,
  curatedModelIds,
  type ProviderCredentialSettings,
  type ProviderModelSelection,
  type SettingsSnapshot,
  type TextProviderId,
  type UpdateSettingsRequest
} from '../../shared/settings/types.js'

export type SettingsStore = {
  get: () => SettingsSnapshot
  replace: (snapshot: SettingsSnapshot) => Promise<SettingsSnapshot>
  update: (request: UpdateSettingsRequest) => Promise<SettingsSnapshot>
}

type SettingsStoreOptions = {
  initialSnapshot?: SettingsSnapshot
  write?: (snapshot: SettingsSnapshot) => Promise<void> | void
  now?: () => Date
}

export function createSettingsStore(options: SettingsStoreOptions = {}): SettingsStore {
  const state = {
    snapshot: options.initialSnapshot ?? buildDefaultSettingsSnapshot(options.now?.())
  }
  const now = options.now ?? (() => new Date())
  const write = options.write ?? (() => undefined)
  return {
    get: () => state.snapshot,
    replace: async (snapshot) => {
      state.snapshot = snapshot
      await write(snapshot)
      return snapshot
    },
    update: async (request) => {
      state.snapshot = applySettingsUpdate(state.snapshot, request, now())
      await write(state.snapshot)
      return state.snapshot
    }
  }
}

function applySettingsUpdate(
  current: SettingsSnapshot,
  request: UpdateSettingsRequest,
  now = new Date()
): SettingsSnapshot {
  const nextTextProvider = request.textProvider ?? current.text.provider
  assertSupportedTextProvider(nextTextProvider)
  const nextEmbeddings = updateEmbeddings(current.embeddings, request)
  return {
    text: {
      provider: nextTextProvider,
      models: mergeModelSelections(current.text.models, request.providerModels),
      credentials: mergeCredentials(current.text.credentials, request.providerCredentials)
    },
    image: {
      provider: request.imageProvider ?? current.image.provider,
      generativeTokensEnabled: request.generativeTokensEnabled ?? current.image.generativeTokensEnabled
    },
    embeddings: nextEmbeddings,
    updatedAt: now.toISOString()
  }
}

function updateEmbeddings(
  current: SettingsSnapshot['embeddings'],
  request: UpdateSettingsRequest
): SettingsSnapshot['embeddings'] {
  const mode = request.embedderMode ?? current.mode
  if (!current.supportedModes.includes(mode)) {
    throw new Error(`Unsupported embedder mode: ${mode}`)
  }
  return { ...current, mode }
}

function mergeModelSelections(
  current: Record<TextProviderId, ProviderModelSelection>,
  updates: UpdateSettingsRequest['providerModels']
): Record<TextProviderId, ProviderModelSelection> {
  return {
    claude: mergeModelSelection('claude', current.claude, updates?.claude),
    openai: mergeModelSelection('openai', current.openai, updates?.openai),
    gemini: mergeModelSelection('gemini', current.gemini, updates?.gemini),
    grok: mergeModelSelection('grok', current.grok, updates?.grok),
    player2: mergeModelSelection('player2', current.player2, updates?.player2)
  }
}

function mergeModelSelection(
  provider: TextProviderId,
  current: ProviderModelSelection,
  update: Partial<ProviderModelSelection> | undefined
): ProviderModelSelection {
  const selectedModelId = update?.selectedModelId ?? current.selectedModelId
  if (!curatedModelIds(provider).includes(selectedModelId)) {
    throw new Error(`Unsupported ${provider} model: ${selectedModelId}`)
  }
  return {
    selectedModelId,
    customModelId: update?.customModelId ?? current.customModelId
  }
}

function mergeCredentials(
  current: Record<TextProviderId, ProviderCredentialSettings>,
  updates: UpdateSettingsRequest['providerCredentials']
): Record<TextProviderId, ProviderCredentialSettings> {
  return {
    claude: mergeCredential(current.claude, updates?.claude),
    openai: mergeCredential(current.openai, updates?.openai),
    gemini: mergeCredential(current.gemini, updates?.gemini),
    grok: mergeCredential(current.grok, updates?.grok),
    player2: mergeCredential(current.player2, updates?.player2)
  }
}

function mergeCredential(
  current: ProviderCredentialSettings,
  update: Partial<ProviderCredentialSettings> | undefined
): ProviderCredentialSettings {
  return {
    apiKey: update?.apiKey ?? current.apiKey,
    baseUrl: update?.baseUrl ?? current.baseUrl
  }
}

function assertSupportedTextProvider(provider: TextProviderId): void {
  if (!['claude', 'openai', 'gemini', 'grok', 'player2'].includes(provider)) {
    throw new Error(`Unsupported text provider: ${provider}`)
  }
}
