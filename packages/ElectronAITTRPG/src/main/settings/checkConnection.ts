import { createTextCompletionClient } from '@weaver/llm-engine'
import type {
  SettingsApi,
  SettingsConnectionResult,
  SettingsSnapshot,
  TextProviderId
} from '../../shared/settings/types.js'
import { snapshotToProviderSettings } from './providerSettings.js'
import type { LocalLlmStatusPort, TextCompletionClientFactory } from './settingsPorts.js'

type CheckConnectionRequest = Parameters<SettingsApi['checkConnection']>[0]

export type ConnectionCheckPorts = {
  createTextClient?: TextCompletionClientFactory
  llmEngine?: LocalLlmStatusPort
}

export async function checkSettingsConnection(
  ports: ConnectionCheckPorts,
  snapshot: SettingsSnapshot,
  request: CheckConnectionRequest = {}
): Promise<SettingsConnectionResult> {
  const provider = request.providerOverride ?? snapshot.text.provider
  if (provider === 'local') {
    return await checkLocalConnection(ports.llmEngine)
  }
  return await checkTextProviderConnection(ports.createTextClient, snapshot, provider)
}

async function checkTextProviderConnection(
  createTextClient: TextCompletionClientFactory | undefined,
  snapshot: SettingsSnapshot,
  provider: TextProviderId
): Promise<SettingsConnectionResult> {
  try {
    const client = (createTextClient ?? createTextCompletionClient)({
      settings: snapshotToProviderSettings({ ...snapshot, text: { ...snapshot.text, provider } }),
      retry: { maxAttempts: 1 }
    })
    const response = await client.completeText({
      prompt: 'Connection check. Reply with ok.',
      maxTokens: 4,
      purpose: 'settings-connection-check'
    })
    await client.dispose()
    return { ok: true, provider, backend: response.backend, message: 'Connection check passed.' }
  } catch (error) {
    return { ok: false, provider, message: errorMessage(error) }
  }
}

async function checkLocalConnection(
  llmEngine: LocalLlmStatusPort | undefined
): Promise<SettingsConnectionResult> {
  if (llmEngine === undefined) {
    return { ok: false, provider: 'local', message: 'Local LLM status API is unavailable.' }
  }
  try {
    llmEngine.health()
    const [status, backend] = await Promise.all([
      llmEngine.getStatus(),
      llmEngine.resolveBackend()
    ])
    return {
      ok: status.phase === 'ready',
      provider: 'local',
      backend,
      statusPhase: status.phase,
      message: localStatusMessage(status.phase)
    }
  } catch (error) {
    return { ok: false, provider: 'local', message: errorMessage(error) }
  }
}

function localStatusMessage(phase: string): string {
  return phase === 'ready' ? 'Local LLM is ready.' : `Local LLM is ${phase}.`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Connection check failed.'
}
