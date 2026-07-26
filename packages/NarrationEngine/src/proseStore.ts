import type { SceneBlock, SocialLine } from './proseTypes.js'

const socialLines: SocialLine[] = []
const sceneBlocks: SceneBlock[] = []
let nextId = 1

export function clearNarrationStore(): void {
  socialLines.length = 0
  sceneBlocks.length = 0
  nextId = 1
}

export function projectSocial(): SocialLine[] {
  return socialLines.map(copySocial)
}

export function projectScene(): SceneBlock[] {
  return sceneBlocks.map(copyScene)
}

export function appendSocialLine(
  input: Omit<SocialLine, 'id' | 'at'> & { at?: number }
): SocialLine {
  const line: SocialLine = {
    id: `social-${nextId}`,
    kind: input.kind,
    speakerId: input.speakerId,
    text: input.text,
    at: input.at ?? Date.now()
  }
  nextId += 1
  socialLines.push(line)
  return copySocial(line)
}

export function appendSceneBlock(input: { text: string; at?: number }): SceneBlock {
  const block: SceneBlock = {
    id: `scene-${nextId}`,
    text: input.text,
    at: input.at ?? Date.now()
  }
  nextId += 1
  sceneBlocks.push(block)
  return copyScene(block)
}

function copySocial(line: SocialLine): SocialLine {
  return { ...line }
}

function copyScene(block: SceneBlock): SceneBlock {
  return { ...block }
}
