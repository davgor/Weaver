import type { VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnPlayMode } from '../../../shared/play/types'

type PlaceholderLayerProps = {
  placeholders: VnBeatPlaceholder[]
  mode: VnPlayMode
}

export function PlaceholderLayer(props: PlaceholderLayerProps): JSX.Element {
  const background = props.placeholders.find((row) => row.slot === 'background')
  const mc = props.placeholders.find((row) => row.slot === 'mc')
  const npc = props.placeholders.find((row) => row.slot === 'npc')
  return (
    <div className="vn-placeholders" aria-hidden={false}>
      <div className="vn-placeholder vn-placeholder-bg">
        <span className="vn-placeholder-label">{background?.label ?? 'Background'}</span>
        <span className="vn-placeholder-prompt">{background?.fullPrompt ?? ''}</span>
      </div>
      <div className="vn-placeholder-sprites">
        {mc ? (
          <div className="vn-placeholder vn-placeholder-mc">
            <span className="vn-placeholder-label">{mc.label}</span>
            <span className="vn-placeholder-prompt">{mc.fullPrompt}</span>
          </div>
        ) : null}
        {props.mode === 'npc' && npc ? (
          <div className="vn-placeholder vn-placeholder-npc">
            <span className="vn-placeholder-label">{npc.label}</span>
            <span className="vn-placeholder-prompt">{npc.fullPrompt}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
}
