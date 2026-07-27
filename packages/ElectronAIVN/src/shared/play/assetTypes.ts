import type { VnPlaceholderSlot } from '@weaver/narration-engine'

/** IPC channel used to push VN asset updates from main to every renderer window. */
export const VN_PLAY_ASSETS_CHANNEL = 'vnPlay:assets'

export type VnAssetSlot = VnPlaceholderSlot

export type VnSlotAssetState =
  | {
      slot: VnAssetSlot
      status: 'placeholder' | 'loading' | 'failed'
      label: string
      fullPrompt: string
    }
  | {
      slot: VnAssetSlot
      status: 'ready'
      label: string
      fullPrompt: string
      imagePath: string
    }

export type VnAssetsUpdate = {
  campaignId: string
  assets: readonly VnSlotAssetState[]
}
