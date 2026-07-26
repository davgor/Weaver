export type ProviderId = 'claude' | 'openai' | 'gemini' | 'grok' | 'player2' | 'local'
export type CloudProviderId = Exclude<ProviderId, 'local'>
type StandardApiProviderId = 'claude' | 'openai' | 'gemini'
type KeyedApiProviderId = StandardApiProviderId | 'grok'

type ApiProviderSettings = {
  apiKey?: string
  model?: string
  baseUrl?: string
}

type Player2Settings = {
  apiKey?: string
  model?: string
  baseUrl?: string
}

export type ProviderSettings = {
  provider?: ProviderId
  claude?: ApiProviderSettings
  openai?: ApiProviderSettings
  gemini?: ApiProviderSettings
  grok?: ApiProviderSettings
  player2?: Player2Settings
}

type EnvKey =
  | 'AGENT_PROVIDER'
  | 'CLAUDE_API_KEY'
  | 'CLAUDE_MODEL'
  | 'OPENAI_API_KEY'
  | 'OPENAI_MODEL'
  | 'GEMINI_API_KEY'
  | 'GEMINI_MODEL'
  | 'GROK_API_KEY'
  | 'XAI_API_KEY'
  | 'GROK_MODEL'
  | 'PLAYER2_BASE_URL'

export type ProviderEnv = Partial<Record<EnvKey, string | undefined>>

export type ApiProviderConfig = {
  provider: KeyedApiProviderId
  apiKey: string
  model: string
  baseUrl: string
}

export type Player2ProviderConfig = {
  provider: 'player2'
  model: string
  baseUrl: string
  apiKey?: string
}

export type LocalProviderConfig = {
  provider: 'local'
}

export type ResolvedProviderConfig =
  | ApiProviderConfig
  | Player2ProviderConfig
  | LocalProviderConfig

const DEFAULTS = {
  claude: {
    model: 'claude-3-5-sonnet-latest',
    baseUrl: 'https://api.anthropic.com/v1',
    keyLabel: 'CLAUDE_API_KEY'
  },
  openai: {
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    keyLabel: 'OPENAI_API_KEY'
  },
  gemini: {
    model: 'gemini-1.5-flash',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyLabel: 'GEMINI_API_KEY'
  },
  grok: {
    model: 'grok-3-latest',
    baseUrl: 'https://api.x.ai/v1',
    keyLabel: 'GROK_API_KEY or XAI_API_KEY'
  },
  player2: {
    model: 'player2',
    baseUrl: 'http://127.0.0.1:4315'
  }
} as const

export function resolveProviderConfig(
  settings?: ProviderSettings,
  env: ProviderEnv = process.env
): ResolvedProviderConfig {
  const provider = resolveProvider(settings, env)
  switch (provider) {
    case 'claude':
    case 'openai':
    case 'gemini':
      return apiProviderConfig(provider, settings?.[provider], env)
    case 'grok':
      return grokProviderConfig(settings?.grok, env)
    case 'player2':
      return player2ProviderConfig(settings?.player2, env)
    case 'local':
      return { provider: 'local' }
  }
}

function apiProviderConfig(
  provider: StandardApiProviderId,
  settings: ApiProviderSettings | undefined,
  env: ProviderEnv
): ApiProviderConfig {
  const defaults = DEFAULTS[provider]
  const apiKey = clean(settings?.apiKey) ?? clean(env[`${upper(provider)}_API_KEY` as EnvKey])
  if (!apiKey) {
    throw new Error(`${provider} provider requires ${defaults.keyLabel}`)
  }
  return {
    provider,
    apiKey,
    model: clean(settings?.model) ?? clean(env[`${upper(provider)}_MODEL` as EnvKey]) ?? defaults.model,
    baseUrl: trimTrailingSlash(clean(settings?.baseUrl) ?? defaults.baseUrl)
  }
}

function grokProviderConfig(
  settings: ApiProviderSettings | undefined,
  env: ProviderEnv
): ApiProviderConfig {
  const apiKey = clean(settings?.apiKey) ?? clean(env.GROK_API_KEY) ?? clean(env.XAI_API_KEY)
  if (!apiKey) {
    throw new Error('grok provider requires GROK_API_KEY or XAI_API_KEY')
  }
  return {
    provider: 'grok',
    apiKey,
    model: clean(settings?.model) ?? clean(env.GROK_MODEL) ?? DEFAULTS.grok.model,
    baseUrl: trimTrailingSlash(clean(settings?.baseUrl) ?? DEFAULTS.grok.baseUrl)
  }
}

function player2ProviderConfig(
  settings: Player2Settings | undefined,
  env: ProviderEnv
): Player2ProviderConfig {
  const apiKey = clean(settings?.apiKey)
  const config = {
    provider: 'player2' as const,
    model: clean(settings?.model) ?? DEFAULTS.player2.model,
    baseUrl: trimTrailingSlash(
      clean(settings?.baseUrl) ?? clean(env.PLAYER2_BASE_URL) ?? DEFAULTS.player2.baseUrl
    )
  }
  return apiKey ? { ...config, apiKey } : config
}

function resolveProvider(settings: ProviderSettings | undefined, env: ProviderEnv): ProviderId {
  const raw = clean(settings?.provider) ?? clean(env.AGENT_PROVIDER) ?? 'local'
  if (isProviderId(raw)) return raw
  throw new Error(`Unsupported AGENT_PROVIDER: ${raw}`)
}

function isProviderId(value: string): value is ProviderId {
  return ['claude', 'openai', 'gemini', 'grok', 'player2', 'local'].includes(value)
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

function upper(value: 'claude' | 'openai' | 'gemini'): 'CLAUDE' | 'OPENAI' | 'GEMINI' {
  return value.toUpperCase() as 'CLAUDE' | 'OPENAI' | 'GEMINI'
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}
