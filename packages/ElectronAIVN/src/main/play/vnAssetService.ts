import type {
  generateVnBackground,
  generateVnSprite,
  ImageGenerationSettings,
  ImageProvider,
  ImageProviderId,
  VnBeatPlaceholder,
  VnCharacterIdentitySeed
} from '@weaver/narration-engine'
import type { VnPlaySnapshot } from '../../shared/play/types.js'
import type { VnAssetsUpdate, VnSlotAssetState } from '../../shared/play/assetTypes.js'

export type VnAssetService = {
  /** Fire-and-forget: never blocks; emits updates as slots resolve. */
  queueFromSnapshot: (snapshot: VnPlaySnapshot) => void
  /** Cancel in-flight work when the campaign changes or the session closes. */
  cancel: () => void
}

export type VnAssetServiceDeps = {
  generateSprite: typeof generateVnSprite
  generateBackground: typeof generateVnBackground
  settings: ImageGenerationSettings
  onUpdate: (update: VnAssetsUpdate) => void
  /** Optional image providers, injected for contract tests / real runtimes. */
  providers?: Partial<Record<ImageProviderId, ImageProvider>>
}

export function createVnAssetService(deps: VnAssetServiceDeps): VnAssetService {
  let seq = 0
  let states: VnSlotAssetState[] = []
  let campaignId: string | null = null

  const emit = (): void => {
    if (campaignId === null) return
    deps.onUpdate({ campaignId, assets: states.map((state) => ({ ...state })) })
  }

  const applyIfCurrent = (token: number, next: VnSlotAssetState): void => {
    if (token !== seq) return
    const index = states.findIndex((state) => state.slot === next.slot)
    if (index < 0) return
    states[index] = next
    emit()
  }

  return {
    queueFromSnapshot: (snapshot) => {
      const token = ++seq
      campaignId = snapshot.campaignId
      states = snapshot.placeholders.map(loadingState)
      emit()
      for (const placeholder of snapshot.placeholders) {
        void resolveSlot(deps, snapshot, placeholder).then((next) =>
          applyIfCurrent(token, next)
        )
      }
    },
    cancel: () => {
      seq += 1
    }
  }
}

async function resolveSlot(
  deps: VnAssetServiceDeps,
  snapshot: VnPlaySnapshot,
  placeholder: VnBeatPlaceholder
): Promise<VnSlotAssetState> {
  try {
    if (placeholder.slot === 'background') {
      return await resolveBackground(deps, snapshot, placeholder)
    }
    return await resolveSprite(deps, snapshot, placeholder)
  } catch {
    return failedState(placeholder)
  }
}

async function resolveBackground(
  deps: VnAssetServiceDeps,
  snapshot: VnPlaySnapshot,
  placeholder: VnBeatPlaceholder
): Promise<VnSlotAssetState> {
  const result = await deps.generateBackground(
    {
      background: {
        kind: 'adaptive',
        locationLabel: snapshot.mode === 'npc' ? 'Dialogue' : 'Scene',
        sceneDescriptors: [snapshot.beatText.slice(0, 160)]
      },
      settings: deps.settings,
      campaignId: snapshot.campaignId
    },
    generateDeps(deps)
  )
  if (result.status === 'ready') {
    return readyState(placeholder, result.imagePath)
  }
  return failedState(placeholder)
}

async function resolveSprite(
  deps: VnAssetServiceDeps,
  snapshot: VnPlaySnapshot,
  placeholder: VnBeatPlaceholder
): Promise<VnSlotAssetState> {
  const identity = placeholder.slot === 'mc' ? mcIdentity(snapshot) : npcIdentity(snapshot)
  if (identity === null) {
    return failedState(placeholder)
  }
  const result = await deps.generateSprite(
    {
      identity,
      stance: 'Standing',
      expression: 'Neutral',
      settings: deps.settings,
      campaignId: snapshot.campaignId
    },
    generateDeps(deps)
  )
  if (result.status === 'ready') {
    return readyState(placeholder, result.asset.imagePath)
  }
  return failedState(placeholder)
}

function generateDeps(
  deps: VnAssetServiceDeps
): { providers: Partial<Record<ImageProviderId, ImageProvider>> } | Record<string, never> {
  return deps.providers === undefined ? {} : { providers: deps.providers }
}

function mcIdentity(snapshot: VnPlaySnapshot): VnCharacterIdentitySeed {
  return {
    characterKey: `${snapshot.campaignId}-vn-mc`,
    displayName: snapshot.mainCharacter.name,
    appearance: snapshot.mainCharacter.appearance
  }
}

function npcIdentity(snapshot: VnPlaySnapshot): VnCharacterIdentitySeed | null {
  const member = snapshot.cast.find((entry) => entry.npcId === snapshot.speakerId)
  if (member === undefined) {
    return null
  }
  return {
    characterKey: member.npcId,
    displayName: member.displayName,
    appearance: member.role
  }
}

function loadingState(placeholder: VnBeatPlaceholder): VnSlotAssetState {
  return {
    slot: placeholder.slot,
    status: 'loading',
    label: placeholder.label,
    fullPrompt: placeholder.fullPrompt
  }
}

function readyState(placeholder: VnBeatPlaceholder, imagePath: string): VnSlotAssetState {
  return {
    slot: placeholder.slot,
    status: 'ready',
    label: placeholder.label,
    fullPrompt: placeholder.fullPrompt,
    imagePath
  }
}

function failedState(placeholder: VnBeatPlaceholder): VnSlotAssetState {
  return {
    slot: placeholder.slot,
    status: 'failed',
    label: placeholder.label,
    fullPrompt: placeholder.fullPrompt
  }
}
