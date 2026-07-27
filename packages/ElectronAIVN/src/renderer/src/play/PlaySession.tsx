import { useEffect, useState } from 'react'
import type { VnPlaySnapshot } from '../../../shared/play/types'
import type { VnSlotAssetState } from '../../../shared/play/assetTypes'
import { VnStageScreen } from './VnStageScreen'

type PlaySessionProps = {
  campaignId: string
  onHome: () => void
}

export function PlaySession(props: PlaySessionProps): JSX.Element {
  const session = usePlaySession(props.campaignId)
  if (session.error !== null) {
    return (
      <main className="play-stub">
        <p className="tell-story-error">{session.error}</p>
        <button type="button" className="empty-home-cta" onClick={props.onHome}>
          Back to home
        </button>
      </main>
    )
  }
  if (session.snapshot === null) {
    return (
      <main className="play-stub">
        <p>Opening visual novel…</p>
      </main>
    )
  }
  return (
    <VnStageScreen
      snapshot={session.snapshot}
      busy={session.busy}
      freeText={session.freeText}
      assets={session.assets}
      onFreeTextChange={session.setFreeText}
      onHome={props.onHome}
      onChoose={session.choose}
    />
  )
}

function usePlaySession(campaignId: string) {
  const [snapshot, setSnapshot] = useState<VnPlaySnapshot | null>(null)
  const [freeText, setFreeText] = useState('')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assets, setAssets] = useState<readonly VnSlotAssetState[]>([])

  useEffect(() => {
    let cancelled = false
    setBusy(true)
    // New campaign: drop any assets carried over from a prior session so the stage
    // does not briefly show stale images while the next beat's assets load.
    setAssets([])
    void window.aivn.play
      .open(campaignId)
      .then((next) => {
        if (!cancelled) {
          setSnapshot(next)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to open play')
        }
      })
      .finally(() => {
        if (!cancelled) setBusy(false)
      })
    return () => {
      cancelled = true
    }
  }, [campaignId])

  useEffect(() => {
    // Asset updates are advisory only — they never toggle `busy`, so turn input
    // stays available while images load (epic 126.4).
    const unsubscribe = window.aivn.play.onAssets((update) => {
      if (update.campaignId !== campaignId) return
      setAssets(update.assets)
    })
    return unsubscribe
  }, [campaignId])

  return {
    snapshot,
    freeText,
    setFreeText,
    busy,
    error,
    assets,
    choose: (text: string) => {
      if (snapshot === null) return
      void chooseAction({ text, snapshot, setSnapshot, setFreeText, setBusy, setError })
    }
  }
}

async function chooseAction(args: {
  text: string
  snapshot: VnPlaySnapshot
  setSnapshot: (next: VnPlaySnapshot) => void
  setFreeText: (value: string) => void
  setBusy: (busy: boolean) => void
  setError: (error: string | null) => void
}): Promise<void> {
  args.setBusy(true)
  try {
    const socialSpeakerId =
      args.snapshot.mode === 'npc'
        ? args.snapshot.speakerId ?? args.snapshot.cast[0]?.npcId
        : undefined
    const next = await window.aivn.play.submitAction({
      campaignId: args.snapshot.campaignId,
      text: args.text,
      ...(socialSpeakerId !== undefined ? { socialSpeakerId } : {})
    })
    args.setSnapshot(next)
    args.setFreeText('')
    args.setError(null)
  } catch (err) {
    args.setError(err instanceof Error ? err.message : 'Turn failed')
  } finally {
    args.setBusy(false)
  }
}
