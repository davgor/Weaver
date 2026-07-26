import { describe, expect, it } from 'vitest'
import { partitionQuestLog } from './questPartition.js'

describe('quest partition', () => {
  it('splits main and side quests without mutating order within each kind', () => {
    const partitioned = partitionQuestLog([
      { questId: 'm1', kind: 'main', status: 'active', title: 'Save the Keep' },
      { questId: 's1', kind: 'side', status: 'complete' },
      { questId: 'm2', kind: 'main', status: 'failed' },
      { questId: 's2', kind: 'side', status: 'active', title: 'Herbs' }
    ])
    expect(partitioned.mainQuests.map((q) => q.questId)).toEqual(['m1', 'm2'])
    expect(partitioned.sideQuests.map((q) => q.questId)).toEqual(['s1', 's2'])
  })
})
