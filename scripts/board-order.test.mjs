import { describe, expect, it } from 'vitest'
import { computeWaves, findNumericOrderViolations, parseDependsOn } from './board-order.mjs'

describe('parseDependsOn', () => {
  it('extracts 3-digit ids referenced after **Depends on:** up to **Feeds:**', () => {
    const content =
      '**Depends on:** `021-CharacterEngine-Core-Ability-Model`, `037-NPCEngine-Construction-And-Identity`. **Feeds:** `999-Not-A-Dependency`.'
    expect(parseDependsOn(content)).toEqual(['021', '037'])
  })

  it('returns an empty list when there is no Depends on line', () => {
    expect(parseDependsOn('# EPIC: foo\n\nNo dependency line here.')).toEqual([])
  })

  it('de-duplicates repeated ids', () => {
    const content = '**Depends on:** `021-Foo`, `021-Foo` again.'
    expect(parseDependsOn(content)).toEqual(['021'])
  })

  it('stops at a blank line when there is no explicit Feeds marker', () => {
    const content = '**Depends on:** `021-Foo`.\n\nSome unrelated paragraph mentioning `999-Bar`.'
    expect(parseDependsOn(content)).toEqual(['021'])
  })

  it('treats a Depends span that starts with none as empty even if other epic ids are mentioned', () => {
    const content =
      '**Depends on:** none (foundation epic, parallel to `012-WorldEngine-Chunked-Map-Store`). **Feeds:** `013-RegionalEngine-Map-Segmentation`.'
    expect(parseDependsOn(content)).toEqual([])
  })
})

describe('findNumericOrderViolations', () => {
  it('flags a pending epic that depends on a higher-numbered pending epic', () => {
    const epics = [
      { id: '025', base: '025-A', state: 'backlog', dependsOn: ['026'] },
      { id: '026', base: '026-B', state: 'backlog', dependsOn: [] }
    ]
    expect(findNumericOrderViolations(epics)).toEqual([{ id: '025', dependsOn: '026' }])
  })

  it('does not flag a dependency on a lower-numbered epic', () => {
    const epics = [
      { id: '026', base: '026-B', state: 'backlog', dependsOn: ['025'] },
      { id: '025', base: '025-A', state: 'backlog', dependsOn: [] }
    ]
    expect(findNumericOrderViolations(epics)).toEqual([])
  })

  it('does not flag a dependency that is already done, regardless of number', () => {
    const epics = [
      { id: '010', base: '010-A', state: 'backlog', dependsOn: ['090'] },
      { id: '090', base: '090-B', state: 'done', dependsOn: [] }
    ]
    expect(findNumericOrderViolations(epics)).toEqual([])
  })
})

describe('computeWaves', () => {
  it('orders epics so every dependency lands in an earlier wave', () => {
    const epics = [
      { id: '003', base: '003-C', state: 'backlog', dependsOn: ['001', '002'] },
      { id: '002', base: '002-B', state: 'backlog', dependsOn: ['001'] },
      { id: '001', base: '001-A', state: 'backlog', dependsOn: [] }
    ]
    expect(computeWaves(epics)).toEqual([['001'], ['002'], ['003']])
  })

  it('groups independent epics into the same wave', () => {
    const epics = [
      { id: '001', base: '001-A', state: 'backlog', dependsOn: [] },
      { id: '002', base: '002-B', state: 'backlog', dependsOn: [] }
    ]
    expect(computeWaves(epics)).toEqual([['001', '002']])
  })

  it('treats a done dependency as already satisfied', () => {
    const epics = [
      { id: '001', base: '001-A', state: 'done', dependsOn: [] },
      { id: '002', base: '002-B', state: 'backlog', dependsOn: ['001'] }
    ]
    expect(computeWaves(epics)).toEqual([['002']])
  })

  it('throws a clear error on a circular dependency', () => {
    const epics = [
      { id: '001', base: '001-A', state: 'backlog', dependsOn: ['002'] },
      { id: '002', base: '002-B', state: 'backlog', dependsOn: ['001'] }
    ]
    expect(() => computeWaves(epics)).toThrow(/circular/i)
  })
})
