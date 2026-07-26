import { beforeEach, describe, expect, it } from 'vitest'
import {
  OBJECTIVE_KINDS,
  QUEST_KINDS,
  QuestEngineError,
  WORLD_QUEST_STATUSES,
  clearQuestStores,
  defineQuestTemplate,
  getWorldQuest,
  listWorldQuests,
  putWorldQuest
} from './index.js'

describe('quest template and world-quest model', () => {
  beforeEach(() => {
    clearQuestStores()
  })

  it('locks kind/status/objective enums', () => {
    expect(QUEST_KINDS).toEqual(['main', 'side'])
    expect(WORLD_QUEST_STATUSES).toEqual(['seeded', 'retired'])
    expect(OBJECTIVE_KINDS).toEqual(['talk_to_npc', 'reach_place', 'obtain_item'])
  })

  it('stores templates and world quests with shape invariants', () => {
    const template = defineQuestTemplate({
      templateId: 'template:main',
      kind: 'main',
      title: 'Escort',
      objectives: [
        { objectiveId: 'o1', kind: 'talk_to_npc', targetId: 'npc-1' },
        { objectiveId: 'o2', kind: 'reach_place', targetId: 'place-1' },
        { objectiveId: 'o3', kind: 'obtain_item', targetId: 'item-1' }
      ]
    })
    expect(template.objectives).toHaveLength(3)

    const quest = putWorldQuest({
      questId: 'camp:main:1',
      campaignId: 'camp',
      worldId: 'world',
      templateId: template.templateId,
      kind: 'main',
      status: 'seeded',
      objectives: template.objectives
    })
    expect(getWorldQuest('camp:main:1')).toEqual(quest)
    expect(listWorldQuests('camp')).toEqual([quest])
  })

  it('rejects empty objectives and unknown kinds', () => {
    expect(() =>
      defineQuestTemplate({
        templateId: 'bad',
        kind: 'main',
        objectives: []
      })
    ).toThrowError(QuestEngineError)
  })
})
