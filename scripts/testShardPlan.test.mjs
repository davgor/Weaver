import { describe, expect, it } from 'vitest'
import { medianTimingMs, planTestShards } from './testShardPlan.mjs'

describe('planTestShards', () => {
  it('returns a single empty shard when there are no files', () => {
    expect(planTestShards({ files: [] })).toEqual({
      shardCount: 1,
      shards: [[]],
      estimatesMs: [0]
    })
  })

  it('balances files across shards by estimated duration', () => {
    const plan = planTestShards({
      files: ['a.test.ts', 'b.test.ts', 'c.test.ts'],
      timings: { 'a.test.ts': 40_000, 'b.test.ts': 40_000, 'c.test.ts': 1_000 },
      targetMs: 50_000
    })
    expect(plan.shardCount).toBe(2)
    expect(plan.shards.flat().sort()).toEqual(['a.test.ts', 'b.test.ts', 'c.test.ts'])
  })
})

describe('medianTimingMs', () => {
  it('returns fallback when empty', () => {
    expect(medianTimingMs({}, 500)).toBe(500)
  })
})
