import type { ProviderSettings } from '@weaver/llm-engine'
import type {
  ProviderCredentialSettings,
  SettingsSnapshot,
  TextProviderId
} from '../../shared/settings/types.js'
import { effectiveTextModelId } from '../../shared/settings/types.js'

export function snapshotToProviderSettings(snapshot: SettingsSnapshot): ProviderSettings {
  const provider = snapshot.text.provider
  const providerSettings = providerConfig(provider, snapshot)
  return {
    provider,
    [provider]: providerSettings
  }
}

function providerConfig(provider: TextProviderId, snapshot: SettingsSnapshot) {
  const credentials = snapshot.text.credentials[provider]
  return withOptionalCredentialFields(
    { model: effectiveTextModelId(snapshot, provider) },
    credentials
  )
}

function withOptionalCredentialFields(
  base: { model: string },
  credentials: ProviderCredentialSettings
): { model: string; apiKey?: string; baseUrl?: string } {
  const apiKey = clean(credentials.apiKey)
  const baseUrl = clean(credentials.baseUrl)
  return {
    ...base,
    ...(apiKey === undefined ? {} : { apiKey }),
    ...(baseUrl === undefined ? {} : { baseUrl })
  }
}

function clean(value: string): string | undefined {
  const trimmed = value.trim()
  return trimmed.length === 0 ? undefined : trimmed
}
