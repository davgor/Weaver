import type { SheetQuestEntry } from './types.js'

export function partitionQuestLog(quests: readonly SheetQuestEntry[]): {
  mainQuests: SheetQuestEntry[]
  sideQuests: SheetQuestEntry[]
} {
  return {
    mainQuests: quests.filter((quest) => quest.kind === 'main'),
    sideQuests: quests.filter((quest) => quest.kind === 'side')
  }
}
