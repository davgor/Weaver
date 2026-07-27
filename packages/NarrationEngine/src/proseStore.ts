import type { SceneBlock, SocialLine } from './proseTypes.js'

export type AppendSocialLineInput = Omit<SocialLine, 'id' | 'at'> & { at?: number }
export type AppendSceneBlockInput = { text: string; at?: number }
export type NarrationProjectionSnapshot = {
  socialLines: readonly SocialLine[]
  sceneBlocks: readonly SceneBlock[]
}

export type NarrationProjectionStore = {
  clearNarrationStore: () => void
  projectSocial: () => SocialLine[]
  projectScene: () => SceneBlock[]
  appendSocialLine: (input: AppendSocialLineInput) => SocialLine
  appendSceneBlock: (input: AppendSceneBlockInput) => SceneBlock
  restoreNarrationProjections: (snapshot: NarrationProjectionSnapshot) => void
}

export type MemoryNarrationProjectionStoreOptions = Partial<NarrationProjectionSnapshot> & {
  nextId?: number
}

let activeStore: NarrationProjectionStore = createMemoryNarrationProjectionStore()
let boundCampaignId: string | null = null

export function createMemoryNarrationProjectionStore(
  options: MemoryNarrationProjectionStoreOptions = {}
): NarrationProjectionStore {
  const socialLines = (options.socialLines ?? []).map(copySocial)
  const sceneBlocks = (options.sceneBlocks ?? []).map(copyScene)
  let nextId = options.nextId ?? nextIdAfter([...socialLines, ...sceneBlocks])

  return {
    clearNarrationStore() {
      socialLines.length = 0
      sceneBlocks.length = 0
      nextId = 1
    },
    projectSocial: () => socialLines.map(copySocial),
    projectScene: () => sceneBlocks.map(copyScene),
    appendSocialLine(input) {
      const line = buildSocialLine(input, nextId)
      nextId += 1
      socialLines.push(copySocial(line))
      return copySocial(line)
    },
    appendSceneBlock(input) {
      const block = buildSceneBlock(input, nextId)
      nextId += 1
      sceneBlocks.push(copyScene(block))
      return copyScene(block)
    },
    restoreNarrationProjections(snapshot) {
      socialLines.length = 0
      sceneBlocks.length = 0
      socialLines.push(...snapshot.socialLines.map(copySocial))
      sceneBlocks.push(...snapshot.sceneBlocks.map(copyScene))
      nextId = nextIdAfter([...socialLines, ...sceneBlocks])
    }
  }
}

export function clearNarrationStore(): void {
  activeStore.clearNarrationStore()
}

export function projectSocial(): SocialLine[] {
  return activeStore.projectSocial()
}

export function projectScene(): SceneBlock[] {
  return activeStore.projectScene()
}

export function appendSocialLine(input: AppendSocialLineInput): SocialLine {
  return activeStore.appendSocialLine(input)
}

export function appendSceneBlock(input: AppendSceneBlockInput): SceneBlock {
  return activeStore.appendSceneBlock(input)
}

export function restoreNarrationProjections(snapshot: NarrationProjectionSnapshot): void {
  activeStore.restoreNarrationProjections(snapshot)
}

export function bindNarrationCampaignStore(
  campaignId: string,
  store: NarrationProjectionStore
): void {
  activeStore = store
  boundCampaignId = campaignId
}

export function unbindNarrationCampaignStore(): void {
  activeStore = createMemoryNarrationProjectionStore()
  boundCampaignId = null
}

export function isNarrationCampaignStoreBound(): boolean {
  return boundCampaignId !== null
}

function buildSocialLine(input: AppendSocialLineInput, id: number): SocialLine {
  return {
    id: `social-${id}`,
    kind: input.kind,
    speakerId: input.speakerId,
    text: input.text,
    at: input.at ?? Date.now()
  }
}

function buildSceneBlock(input: AppendSceneBlockInput, id: number): SceneBlock {
  return {
    id: `scene-${id}`,
    text: input.text,
    at: input.at ?? Date.now()
  }
}

function nextIdAfter(records: ReadonlyArray<SocialLine | SceneBlock>): number {
  const ids = records.map((record) => numericIdSuffix(record.id))
  return Math.max(0, ...ids) + 1
}

function numericIdSuffix(id: string): number {
  const suffix = id.split('-').at(-1)
  const value = suffix === undefined ? Number.NaN : Number(suffix)
  return Number.isInteger(value) && value > 0 ? value : 0
}

function copySocial(line: SocialLine): SocialLine {
  return { ...line }
}

function copyScene(block: SceneBlock): SceneBlock {
  return { ...block }
}
