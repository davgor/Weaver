import { useCallback, useEffect, useState } from 'react'
import type { SettingsIntroSnapshot } from '../../../shared/settings/settingsIntroTypes.js'
import './settings.css'

type SettingsIntroOverlayProps = {
  onOpenSettings: () => void
  settingsOpen: boolean
}

export function SettingsIntroOverlay({
  onOpenSettings,
  settingsOpen
}: SettingsIntroOverlayProps): JSX.Element | null {
  const [intro, setIntro] = useState<SettingsIntroSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshIntro = useCallback(async (): Promise<void> => {
    const snapshot = await window.aiTtrpg.settingsIntro.get()
    setIntro(snapshot)
  }, [])

  useEffect(() => {
    if (settingsOpen) return
    void refreshIntro()
  }, [refreshIntro, settingsOpen])

  if (intro === null || !intro.needed) return null

  return (
    <div className="modal-overlay settings-intro-overlay">
      <section className="modal-panel settings-intro-panel" aria-label="First-run setup">
        <IntroHeader reason={intro.reason} />
        <IntroActions
          busy={busy}
          ready={intro.ready}
          error={error}
          onOpenSettings={onOpenSettings}
          onDismiss={() => void dismissIntro(setIntro, setBusy, setError)}
        />
      </section>
    </div>
  )
}

function IntroHeader(props: { reason: string | null }): JSX.Element {
  return (
    <>
      <p className="eyebrow">Welcome</p>
      <h1>Configure your text provider</h1>
      {props.reason === null ? null : <p className="settings-help">{props.reason}</p>}
      <p className="settings-help">
        Install the pinned local Qwen model for offline play, or add a cloud provider API key in
        Settings.
      </p>
    </>
  )
}

type IntroActionsProps = {
  busy: boolean
  ready: boolean
  error: string | null
  onOpenSettings: () => void
  onDismiss: () => void
}

function IntroActions(props: IntroActionsProps): JSX.Element {
  return (
    <>
      <div className="settings-intro-actions">
        <button type="button" disabled={props.busy} onClick={props.onOpenSettings}>
          Open settings
        </button>
        <button type="button" disabled={props.busy || !props.ready} onClick={props.onDismiss}>
          Continue
        </button>
      </div>
      {props.error === null ? null : <p className="settings-status-error">{props.error}</p>}
    </>
  )
}

async function dismissIntro(
  setIntro: (snapshot: SettingsIntroSnapshot) => void,
  setBusy: (busy: boolean) => void,
  setError: (message: string | null) => void
): Promise<void> {
  setBusy(true)
  setError(null)
  try {
    const next = await window.aiTtrpg.settingsIntro.dismiss()
    setIntro(next)
  } catch (caught) {
    setError(caught instanceof Error ? caught.message : 'Unable to dismiss intro.')
  } finally {
    setBusy(false)
  }
}