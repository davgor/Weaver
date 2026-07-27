import {
  defineQuestTemplate,
  getQuestTemplate,
  getWorldQuest,
  listQuestTemplates,
  listWorldQuests,
  putWorldQuest,
  unbindQuestCampaignStore
} from '@weaver/quest-engine'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { createCampaignSession, openCampaignSession } from '../campaignSession.js'

describe('quest campaign store contract', () => {
  afterEach(() => {
    unbindQuestCampaignStore()
  })

  it('round-trips quest templates and world quests through SQLite reopen', () => {
    withCampaignPath((filePath) => {
      const created = createCampaignSession({ campaignId: 'quest-camp', filePath })
      const template = defineQuestTemplate({
        templateId: 'template:escort',
        kind: 'main',
        title: 'Escort the Envoy',
        brief: 'Keep the envoy safe.',
        objectives: [{ objectiveId: 'talk', kind: 'talk_to_npc', targetId: 'npc-envoy' }]
      })
      const quest = putWorldQuest({
        questId: 'quest-1',
        campaignId: 'quest-camp',
        worldId: 'world-1',
        templateId: template.templateId,
        kind: 'main',
        status: 'seeded',
        title: template.title,
        brief: template.brief,
        objectives: template.objectives
      })
      created.close()

      unbindQuestCampaignStore()
      expect(listQuestTemplates()).toEqual([])
      expect(listWorldQuests()).toEqual([])

      const opened = openCampaignSession({ campaignId: 'quest-camp', filePath })
      expect(getQuestTemplate(template.templateId)).toEqual(template)
      expect(getWorldQuest(quest.questId)).toEqual(quest)
      expect(listQuestTemplates()).toEqual([template])
      expect(listWorldQuests('quest-camp')).toEqual([quest])
      opened.close()
    })
  })
})

function withCampaignPath(run: (filePath: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'dm-quest-store-'))
  try {
    run(join(root, 'campaign.sqlite'))
  } finally {
    rmSync(root, { force: true, recursive: true })
  }
}
