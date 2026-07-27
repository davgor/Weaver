import {
  buildVnBeatPlaceholders,
  type VnBeatPlaceholder,
  type VnExpression,
  type VnStance
} from '@weaver/narration-engine'
import type { VnMainCharacterBrief, VnStoryCastMember } from '@weaver/dm-engine'
import type { VnPlayMode } from '../../shared/play/types.js'

export type BuildPlayPlaceholdersInput = {
  campaignId: string
  mainCharacter: VnMainCharacterBrief
  beatText: string
  mode: VnPlayMode
  speakerId: string | null
  cast: VnStoryCastMember[]
  mcStance?: VnStance
  mcExpression?: VnExpression
  npcStance?: VnStance
  npcExpression?: VnExpression
}

export function buildPlayPlaceholders(input: BuildPlayPlaceholdersInput): VnBeatPlaceholder[] {
  const mc = {
    identity: {
      characterKey: `${input.campaignId}-vn-mc`,
      displayName: input.mainCharacter.name,
      appearance: input.mainCharacter.appearance
    },
    stance: input.mcStance ?? ('Standing' as const),
    expression: input.mcExpression ?? ('Neutral' as const)
  }
  const npcMember = input.cast.find((member) => member.npcId === input.speakerId)
  const background = {
    kind: 'adaptive' as const,
    locationLabel: input.mode === 'npc' ? 'Dialogue' : 'Scene',
    sceneDescriptors: [input.beatText.slice(0, 160)]
  }
  if (npcMember === undefined) {
    return buildVnBeatPlaceholders({ mc, background })
  }
  return buildVnBeatPlaceholders({
    mc,
    npc: {
      identity: {
        characterKey: npcMember.npcId,
        displayName: npcMember.displayName,
        appearance: npcMember.role
      },
      stance: input.npcStance ?? 'Standing',
      expression: input.npcExpression ?? 'Neutral'
    },
    background
  })
}
