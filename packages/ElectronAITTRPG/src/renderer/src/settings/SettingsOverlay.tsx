import { useEffect, useState, type ChangeEvent } from 'react'
import type { EmbedderMode, ImageProviderId } from '@weaver/narration-engine'
import {
  curatedModelIds,
  embedderModeOptions,
  imageProviderOptions,
  textProviderOptions,
  type ProviderCredentialSettings,
  type ProviderModelSelection,
  type SettingsConnectionResult,
  type SettingsSnapshot,
  type TextProviderId,
  type UpdateSettingsRequest
} from '../../../shared/settings/types'
import { LocalModelSection } from './LocalModelSection'
import './settings.css'

type SettingsOverlayProps = {
  open: boolean
  onClose: () => void
}

export function SettingsOverlay({ open, onClose }: SettingsOverlayProps): JSX.Element | null {
  const [snapshot, setSnapshot] = useSettingsSnapshot(open)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [connection, setConnection] = useState<SettingsConnectionResult | null>(null)

  if (!open) return null

  const persist = async (request: UpdateSettingsRequest): Promise<void> => {
    await persistSettings(request, setSnapshot, setBusy, setMessage)
  }

  return (
    <div className="modal-overlay settings-overlay">
      <section className="modal-panel settings-panel-shell" aria-label="Settings">
        <SettingsHeader onClose={onClose} />
        {snapshot === null ? (
          <p className="settings-loading">Loading settings...</p>
        ) : (
          <SettingsBody
            open={open}
            snapshot={snapshot}
            busy={busy}
            message={message}
            connection={connection}
            onCheckConnection={() => {
              void checkConnection(setConnection, setMessage)
            }}
            onUpdate={persist}
          />
        )}
      </section>
    </div>
  )
}

function useSettingsSnapshot(
  open: boolean
): [SettingsSnapshot | null, (snapshot: SettingsSnapshot) => void] {
  const [snapshot, setSnapshot] = useState<SettingsSnapshot | null>(null)
  useEffect(() => {
    if (!open) return
    let cancelled = false
    void window.aiTtrpg.settings.get().then((loaded) => {
      if (!cancelled) setSnapshot(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [open])
  return [snapshot, setSnapshot]
}

async function persistSettings(
  request: UpdateSettingsRequest,
  setSnapshot: (snapshot: SettingsSnapshot) => void,
  setBusy: (busy: boolean) => void,
  setMessage: (message: string | null) => void
): Promise<void> {
  setBusy(true)
  setMessage(null)
  try {
    const response = await window.aiTtrpg.settings.update(request)
    setSnapshot(response.snapshot)
    setMessage(response.apply.message)
  } catch (error) {
    setMessage(error instanceof Error ? error.message : 'Unable to save settings.')
  } finally {
    setBusy(false)
  }
}

function SettingsHeader({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <header className="settings-header">
      <div>
        <p className="eyebrow">Runtime</p>
        <h1>Settings</h1>
      </div>
      <button type="button" className="settings-close" onClick={onClose}>
        Close
      </button>
    </header>
  )
}

type SettingsBodyProps = {
  open: boolean
  snapshot: SettingsSnapshot
  busy: boolean
  message: string | null
  connection: SettingsConnectionResult | null
  onCheckConnection: () => void
  onUpdate: (request: UpdateSettingsRequest) => Promise<void>
}

function SettingsBody(props: SettingsBodyProps): JSX.Element {
  return (
    <div className="settings-body">
      <LocalModelSection open={props.open} busy={props.busy} />
      <TextProviderSection snapshot={props.snapshot} busy={props.busy} onUpdate={props.onUpdate} />
      <ImageRailsSection snapshot={props.snapshot} busy={props.busy} onUpdate={props.onUpdate} />
      <EmbeddingSection snapshot={props.snapshot} busy={props.busy} onUpdate={props.onUpdate} />
      <ConnectionSection
        busy={props.busy}
        message={props.message}
        connection={props.connection}
        provider={props.snapshot.text.provider}
        onCheckConnection={props.onCheckConnection}
      />
    </div>
  )
}

function TextProviderSection(props: {
  snapshot: SettingsSnapshot
  busy: boolean
  onUpdate: (request: UpdateSettingsRequest) => Promise<void>
}): JSX.Element {
  const provider = props.snapshot.text.provider
  const models = curatedModelIds(provider)
  const model = props.snapshot.text.models[provider]
  const credentials = props.snapshot.text.credentials[provider]
  return (
    <section className="settings-section">
      <h2>Text provider</h2>
      <label>
        Provider
        <select
          value={provider}
          disabled={props.busy}
          onChange={(event) => props.onUpdate({ textProvider: event.target.value as TextProviderId })}
        >
          {textProviderOptions.map((option) => optionElement(option.id, option.label))}
        </select>
      </label>
      <label>
        Curated model
        <select
          value={model.selectedModelId}
          disabled={props.busy}
          onChange={(event) => props.onUpdate(modelUpdate(provider, event))}
        >
          {models.map((id) => optionElement(id, id))}
        </select>
      </label>
      <ProviderTextInputs
        provider={provider}
        model={model}
        credentials={credentials}
        busy={props.busy}
        onUpdate={props.onUpdate}
      />
    </section>
  )
}

function ProviderTextInputs(props: {
  provider: TextProviderId
  model: ProviderModelSelection
  credentials: ProviderCredentialSettings
  busy: boolean
  onUpdate: (request: UpdateSettingsRequest) => Promise<void>
}): JSX.Element | null {
  if (props.provider === 'local') return null
  return (
    <>
      <label>
        Custom model id (optional)
        <input
          value={props.model.customModelId}
          disabled={props.busy}
          placeholder="Use curated model"
          onChange={(event) => props.onUpdate(customModelUpdate(props.provider, event))}
        />
      </label>
      <label>
        API key (optional for Player2)
        <input
          value={props.credentials.apiKey}
          disabled={props.busy}
          type="password"
          onChange={(event) => props.onUpdate(credentialUpdate(props.provider, 'apiKey', event))}
        />
      </label>
      <label>
        Base URL override
        <input
          value={props.credentials.baseUrl}
          disabled={props.busy}
          placeholder="Provider default"
          onChange={(event) => props.onUpdate(credentialUpdate(props.provider, 'baseUrl', event))}
        />
      </label>
    </>
  )
}

function ImageRailsSection(props: {
  snapshot: SettingsSnapshot
  busy: boolean
  onUpdate: (request: UpdateSettingsRequest) => Promise<void>
}): JSX.Element {
  return (
    <section className="settings-section">
      <h2>Image rails</h2>
      <label>
        Image provider
        <select
          value={props.snapshot.image.provider}
          disabled={props.busy}
          onChange={(event) => props.onUpdate({ imageProvider: event.target.value as ImageProviderId })}
        >
          {imageProviderOptions.map((option) => optionElement(option.id, option.label))}
        </select>
      </label>
      <label className="settings-checkbox">
        <input
          type="checkbox"
          checked={props.snapshot.image.generativeTokensEnabled}
          disabled={props.busy}
          onChange={(event) => props.onUpdate({ generativeTokensEnabled: event.target.checked })}
        />
        Enable generated visual tokens
      </label>
    </section>
  )
}

function EmbeddingSection(props: {
  snapshot: SettingsSnapshot
  busy: boolean
  onUpdate: (request: UpdateSettingsRequest) => Promise<void>
}): JSX.Element {
  const supported = props.snapshot.embeddings.supportedModes
  return (
    <section className="settings-section">
      <h2>Embeddings</h2>
      <label>
        Retrieval mode
        <select
          value={props.snapshot.embeddings.mode}
          disabled={props.busy}
          onChange={(event) => props.onUpdate({ embedderMode: event.target.value as EmbedderMode })}
        >
          {embedderModeOptions
            .filter((option) => supported.includes(option.id))
            .map((option) => optionElement(option.id, option.label))}
        </select>
      </label>
      <p className="settings-help">{props.snapshot.embeddings.mixedModeNote}</p>
    </section>
  )
}

function ConnectionSection(props: {
  busy: boolean
  message: string | null
  connection: SettingsConnectionResult | null
  provider: TextProviderId
  onCheckConnection: () => void
}): JSX.Element {
  const connectionClass = props.connection?.ok ? 'settings-status-ok' : 'settings-status-error'
  const label = props.provider === 'local' ? 'Check local model' : 'Check selected provider'
  return (
    <section className="settings-section">
      <h2>Connection check</h2>
      <button type="button" disabled={props.busy} onClick={props.onCheckConnection}>
        {label}
      </button>
      {props.message === null ? null : <p className="settings-help">{props.message}</p>}
      {props.connection === null ? null : (
        <p className={connectionClass}>{props.connection.message}</p>
      )}
    </section>
  )
}

async function checkConnection(
  setConnection: (result: SettingsConnectionResult | null) => void,
  setMessage: (message: string | null) => void
): Promise<void> {
  setConnection(null)
  setMessage(null)
  const result = await window.aiTtrpg.settings.checkConnection()
  setConnection(result)
}

function modelUpdate(provider: TextProviderId, event: ChangeEvent<HTMLSelectElement>): UpdateSettingsRequest {
  return { providerModels: { [provider]: { selectedModelId: event.target.value } } }
}

function customModelUpdate(provider: TextProviderId, event: ChangeEvent<HTMLInputElement>): UpdateSettingsRequest {
  return { providerModels: { [provider]: { customModelId: event.target.value } } }
}

function credentialUpdate(
  provider: TextProviderId,
  key: keyof ProviderCredentialSettings,
  event: ChangeEvent<HTMLInputElement>
): UpdateSettingsRequest {
  return { providerCredentials: { [provider]: { [key]: event.target.value } } }
}

function optionElement(id: string, label: string): JSX.Element {
  return (
    <option key={id} value={id}>
      {label}
    </option>
  )
}
