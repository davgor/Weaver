import type { VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnPlayMode, VnPlayPhase, VnPlaySnapshot } from '../../../shared/play/types'
import type { VnSlotAssetState } from '../../../shared/play/assetTypes'
import { InteractionPanel } from './InteractionPanel'
import { PlaceholderLayer } from './PlaceholderLayer'

type VnStageScreenProps = {
  snapshot: VnPlaySnapshot
  busy: boolean
  freeText: string
  assets?: readonly VnSlotAssetState[]
  onFreeTextChange: (value: string) => void
  onChoose: (text: string) => void
  onHome: () => void
}

export function VnStageScreen(props: VnStageScreenProps): JSX.Element {
  return (
    <main className="vn-stage">
      <PlaceholderLayer
        placeholders={props.snapshot.placeholders}
        mode={props.snapshot.mode}
        {...(props.assets !== undefined ? { assets: props.assets } : {})}
      />
      <div className="vn-stage-foreground">
        <FreeplayBanner
          phase={props.snapshot.phase}
          storyComplete={props.snapshot.storyComplete}
        />
        <ModeBanner mode={props.snapshot.mode} speakerName={props.snapshot.speakerName} />
        <p className="vn-stage-beat">{props.snapshot.beatText}</p>
        <InteractionPanel
          options={props.snapshot.options}
          freeText={props.freeText}
          busy={props.busy}
          onFreeTextChange={props.onFreeTextChange}
          onChoose={props.onChoose}
        />
        <button type="button" className="vn-stage-home" onClick={props.onHome} disabled={props.busy}>
          Home
        </button>
      </div>
    </main>
  )
}

function FreeplayBanner(props: {
  phase: VnPlayPhase
  storyComplete: boolean
}): JSX.Element | null {
  if (props.phase !== 'freeplay' && !props.storyComplete) return null
  return <p className="vn-stage-freeplay">Story complete — exploring</p>
}

function ModeBanner(props: { mode: VnPlayMode; speakerName: string | null }): JSX.Element {
  if (props.mode === 'npc') {
    return (
      <p className="vn-stage-mode">
        NPC dialogue{props.speakerName ? ` — ${props.speakerName}` : ''}
      </p>
    )
  }
  return <p className="vn-stage-mode">Scene</p>
}

export type { VnBeatPlaceholder }
