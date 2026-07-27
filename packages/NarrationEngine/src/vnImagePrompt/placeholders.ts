import {
  buildVnBackgroundPrompt,
  type BuildVnBackgroundPromptInput
} from './backgroundPrompt.js'
import {
  buildVnCharacterPrompt,
  type BuildVnCharacterPromptInput
} from './characterPrompt.js'
import type { VnImagePrompt } from './types.js'

export type VnPlaceholderSlot = 'mc' | 'npc' | 'background'

export type VnBeatPlaceholder = VnImagePrompt & {
  slot: VnPlaceholderSlot
}

export type BuildVnBeatPlaceholdersInput = {
  mc: BuildVnCharacterPromptInput
  npc?: BuildVnCharacterPromptInput
  background: BuildVnBackgroundPromptInput
}

export function buildVnBeatPlaceholders(
  input: BuildVnBeatPlaceholdersInput
): readonly VnBeatPlaceholder[] {
  const mc = withSlot('mc', buildVnCharacterPrompt(input.mc))
  const background = withSlot('background', buildVnBackgroundPrompt(input.background))

  if (input.npc === undefined) {
    return [mc, background]
  }

  return [mc, withSlot('npc', buildVnCharacterPrompt(input.npc)), background]
}

function withSlot(slot: VnPlaceholderSlot, prompt: VnImagePrompt): VnBeatPlaceholder {
  return { slot, label: prompt.label, fullPrompt: prompt.fullPrompt }
}
