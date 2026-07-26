import { replaceNpc, requireNpc } from './store.js'
import type { NpcRecord, SelectSocialRespondersInput, UpdateNpcSpeakingStyleInput } from './types.js'

export function updateNpcSpeakingStyle(input: UpdateNpcSpeakingStyleInput): NpcRecord {
  const npc = requireNpc(input.npcId)
  if (npc.identity.nonSpeaking) {
    return replaceNpc(removeSpeakingStyle(npc))
  }
  return replaceNpc({
    ...npc,
    speakingStyle: {
      tone: input.speakingStyle.tone,
      vocabulary: [...input.speakingStyle.vocabulary]
    }
  })
}

export function selectSocialResponders(input: SelectSocialRespondersInput): string[] {
  const candidates = input.presentNpcIds.map(readSpeakingNpc).filter(isNpcRecord)
  const relevant = candidates.filter((npc) => isRelevant(npc, input))
  return relevant.length > 0 ? relevant.map((npc) => npc.npcId) : fallbackResponder(candidates)
}

function readSpeakingNpc(npcId: string): NpcRecord | undefined {
  const npc = requireNpc(npcId)
  return npc.identity.nonSpeaking ? undefined : npc
}

function isRelevant(npc: NpcRecord, input: SelectSocialRespondersInput): boolean {
  return (
    npc.npcId === input.addressedTarget ||
    isMentionedNpc(npc.npcId, input.recentContext?.mentionedNpcIds) ||
    hasMentionedFaction(npc, input.recentContext?.mentionedFactionIds)
  )
}

function fallbackResponder(candidates: readonly NpcRecord[]): string[] {
  const first = candidates[0]
  return first === undefined ? [] : [first.npcId]
}

function isMentionedNpc(npcId: string, mentionedNpcIds: readonly string[] | undefined): boolean {
  return mentionedNpcIds?.includes(npcId) ?? false
}

function hasMentionedFaction(npc: NpcRecord, mentionedFactionIds: readonly string[] | undefined): boolean {
  return mentionedFactionIds?.some((factionId) => npc.factionIds.includes(factionId)) ?? false
}

function removeSpeakingStyle(npc: NpcRecord): NpcRecord {
  const { speakingStyle: _speakingStyle, ...withoutSpeakingStyle } = npc
  return withoutSpeakingStyle
}

function isNpcRecord(npc: NpcRecord | undefined): npc is NpcRecord {
  return npc !== undefined
}
