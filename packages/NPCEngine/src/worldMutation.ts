import { replaceNpc, requireNpc } from './store.js'
import type { NpcRecord, NpcWorldMutation } from './types.js'

export function applyNpcWorldMutation(npcId: string, mutation: NpcWorldMutation): NpcRecord {
  const npc = requireNpc(npcId)
  return replaceNpc({ ...npc, worldStatus: mutation.kind })
}
