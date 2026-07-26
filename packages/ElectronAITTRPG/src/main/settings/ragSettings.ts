import {
  supportedEmbedderModesFromDescription,
  type SettingsSnapshot
} from '../../shared/settings/types.js'
import type { RagDescriptionPort } from './settingsPorts.js'

export async function refreshSupportedEmbedderModes(
  snapshot: SettingsSnapshot,
  narrationEngine: RagDescriptionPort
): Promise<SettingsSnapshot> {
  const description = await narrationEngine.call('describeRagRetrieval')
  const supportedModes = supportedEmbedderModesFromDescription(description)
  const mode = supportedModes.includes(snapshot.embeddings.mode)
    ? snapshot.embeddings.mode
    : supportedModes[0] ?? 'lexical'
  return {
    ...snapshot,
    embeddings: {
      mode,
      supportedModes,
      mixedModeNote: mixedModeNote(description) ?? snapshot.embeddings.mixedModeNote
    }
  }
}

function mixedModeNote(description: unknown): string | undefined {
  if (!isRecord(description) || typeof description.mixedModeNote !== 'string') {
    return undefined
  }
  return description.mixedModeNote
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
