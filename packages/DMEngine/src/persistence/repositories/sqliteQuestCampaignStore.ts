import {
  createMemoryQuestCampaignStore,
  type QuestCampaignStore,
  type QuestTemplate,
  type WorldQuest
} from '@weaver/quest-engine'
import type { SqliteDatabase } from '../migrationRunner.js'

type TemplateRow = { template_id: string; payload_json: string }
type WorldQuestRow = { quest_id: string; campaign_id: string; payload_json: string }

export function createSqliteQuestCampaignStore(db: SqliteDatabase): QuestCampaignStore {
  const memory = createMemoryQuestCampaignStore()
  hydrateTemplates(db, memory)
  hydrateWorldQuests(db, memory)
  return wrapWriteThrough(db, memory)
}

function hydrateTemplates(db: SqliteDatabase, memory: QuestCampaignStore): void {
  const rows = db
    .prepare('SELECT template_id, payload_json FROM quest_templates ORDER BY template_id')
    .all() as TemplateRow[]
  for (const row of rows) {
    memory.saveQuestTemplate(JSON.parse(row.payload_json) as QuestTemplate)
  }
}

function hydrateWorldQuests(db: SqliteDatabase, memory: QuestCampaignStore): void {
  const rows = db
    .prepare('SELECT quest_id, campaign_id, payload_json FROM world_quests ORDER BY quest_id')
    .all() as WorldQuestRow[]
  for (const row of rows) {
    memory.putWorldQuest(JSON.parse(row.payload_json) as WorldQuest)
  }
}

function wrapWriteThrough(db: SqliteDatabase, memory: QuestCampaignStore): QuestCampaignStore {
  return {
    saveQuestTemplate: (template) => {
      const saved = memory.saveQuestTemplate(template)
      persistTemplate(db, saved)
      return saved
    },
    getQuestTemplate: (templateId) => memory.getQuestTemplate(templateId),
    listQuestTemplates: () => memory.listQuestTemplates(),
    putWorldQuest: (quest) => {
      const saved = memory.putWorldQuest(quest)
      persistWorldQuest(db, saved)
      return saved
    },
    getWorldQuest: (questId) => memory.getWorldQuest(questId),
    listWorldQuests: (campaignId) => memory.listWorldQuests(campaignId),
    deleteWorldQuest: (questId) => {
      const deleted = memory.deleteWorldQuest(questId)
      db.prepare('DELETE FROM world_quests WHERE quest_id = ?').run(questId)
      return deleted
    },
    clearWorldQuestsForCampaign: (campaignId) => {
      const cleared = memory.clearWorldQuestsForCampaign(campaignId)
      db.prepare('DELETE FROM world_quests WHERE campaign_id = ?').run(campaignId)
      return cleared
    },
    clearQuestStores: () => {
      memory.clearQuestStores()
      db.prepare('DELETE FROM quest_templates').run()
      db.prepare('DELETE FROM world_quests').run()
    }
  }
}

function persistTemplate(db: SqliteDatabase, template: QuestTemplate): void {
  db.prepare(
    `INSERT INTO quest_templates (template_id, payload_json)
     VALUES (?, ?)
     ON CONFLICT(template_id) DO UPDATE SET payload_json = excluded.payload_json`
  ).run(template.templateId, JSON.stringify(template))
}

function persistWorldQuest(db: SqliteDatabase, quest: WorldQuest): void {
  db.prepare(
    `INSERT INTO world_quests (quest_id, campaign_id, payload_json)
     VALUES (?, ?, ?)
     ON CONFLICT(quest_id) DO UPDATE SET
       campaign_id = excluded.campaign_id,
       payload_json = excluded.payload_json`
  ).run(quest.questId, quest.campaignId, JSON.stringify(quest))
}
