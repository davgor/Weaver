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
          <SlotBox className="vn-placeholder vn-placeholder-mc" placeholder={mc} asset={assetFor('mc')} />
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
  if (props.asset?.status === 'ready') {
    return <ReadySlot className={props.className} label={slotLabel(props)} imagePath={props.asset.imagePath} />
  }
  return (
    <div className={props.className} data-status={props.asset?.status ?? 'placeholder'}>
      <span className="vn-placeholder-label">{slotLabel(props)}</span>
      <span className="vn-placeholder-prompt">{slotPrompt(props)}</span>
    </div>
  )
}

function ReadySlot(props: { className: string; label: string; imagePath: string }): JSX.Element {
  return (
    <div className={props.className} data-status="ready">
      <img className="vn-placeholder-image" src={fileUrl(props.imagePath)} alt={props.label} />
    </div>
  )
}

function slotLabel(props: SlotBoxProps): string {
  return props.asset?.label ?? props.placeholder?.label ?? props.fallbackLabel ?? ''
}

function slotPrompt(props: SlotBoxProps): string {
  return props.asset?.fullPrompt ?? props.placeholder?.fullPrompt ?? ''
}

function fileUrl(imagePath: string): string {
  if (/^[a-z]+:\/\//i.test(imagePath) || imagePath.startsWith('data:')) {
    return imagePath
  }
  return `file://${imagePath}`
}
