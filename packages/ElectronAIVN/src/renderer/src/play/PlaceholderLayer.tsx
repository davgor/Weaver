import type { VnBeatPlaceholder } from '@weaver/narration-engine'
import type { VnPlayMode } from '../../../shared/play/types'
import type { VnAssetSlot, VnSlotAssetState } from '../../../shared/play/assetTypes'

type PlaceholderLayerProps = {
  placeholders: readonly VnBeatPlaceholder[]
  mode: VnPlayMode
  assets?: readonly VnSlotAssetState[]
}

export function PlaceholderLayer(props: PlaceholderLayerProps): JSX.Element {
  const background = props.placeholders.find((row) => row.slot === 'background')
  const mc = props.placeholders.find((row) => row.slot === 'mc')
  const npc = props.placeholders.find((row) => row.slot === 'npc')
  const assetFor = (slot: VnAssetSlot): VnSlotAssetState | undefined =>
    props.assets?.find((row) => row.slot === slot)
  return (
    <div className="vn-placeholders" aria-hidden={false}>
      <SlotBox
        className="vn-placeholder vn-placeholder-bg"
        placeholder={background}
        asset={assetFor('background')}
        fallbackLabel="Background"
      />
      <div className="vn-placeholder-sprites">
        {mc ? (
          <SlotBox
            className="vn-placeholder vn-placeholder-mc"
            placeholder={mc}
            asset={assetFor('mc')}
          />
        ) : null}
        {props.mode === 'npc' && npc ? (
          <SlotBox
            className="vn-placeholder vn-placeholder-npc"
            placeholder={npc}
            asset={assetFor('npc')}
          />
        ) : null}
      </div>
    </div>
  )
}

type SlotBoxProps = {
  className: string
  placeholder: VnBeatPlaceholder | undefined
  asset: VnSlotAssetState | undefined
  fallbackLabel?: string
}

function SlotBox(props: SlotBoxProps): JSX.Element {
  const label = props.asset?.label ?? props.placeholder?.label ?? props.fallbackLabel ?? ''
  const fullPrompt = props.asset?.fullPrompt ?? props.placeholder?.fullPrompt ?? ''
  if (props.asset?.status === 'ready') {
    return (
      <div className={props.className} data-status="ready">
        <img className="vn-placeholder-image" src={fileUrl(props.asset.imagePath)} alt={label} />
      </div>
    )
  }
  const status = props.asset?.status ?? 'placeholder'
  return (
    <div className={props.className} data-status={status}>
      <span className="vn-placeholder-label">{label}</span>
      <span className="vn-placeholder-prompt">{fullPrompt}</span>
    </div>
  )
}

function fileUrl(imagePath: string): string {
  if (/^[a-z]+:\/\//i.test(imagePath) || imagePath.startsWith('data:')) {
    return imagePath
  }
  return `file://${imagePath}`
}
