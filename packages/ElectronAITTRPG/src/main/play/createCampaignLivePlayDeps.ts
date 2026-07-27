import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  advanceTravelDays,
  listCharacterLocations,
  setCharacterLocation
} from '@weaver/character-engine'
import { createJsonEncounterStore } from '@weaver/combat-engine'
import {
  assertCampaignStoresBound,
  createStoreCombatTurnApi,
  getActiveCampaignSession,
  openCampaignSession,
  type CampaignSession,
  type ResolveTurnDeps,
  type TurnPersistRecord
} from '@weaver/dm-engine'
import { clampProposedPrice, itemEngine } from '@weaver/item-engine'
import { getNpc, listNpcLocations } from '@weaver/npc-engine'
import type { TextCompleter } from '@weaver/narration-engine'
import {
  resolveCampaignDataRoot,
  resolveCampaignFilePath
} from '../campaigns/campaignDisk.js'
import { hydrateDurableAutosaves } from './durableAutosave.js'

export type CreateCampaignLivePlayDepsInput = {
  campaignId: string
  characterId: string
  campaignsRoot: string
  textCompleter: TextCompleter
}

export type CampaignLivePlayDeps = {
  session: CampaignSession
  resolveTurnDeps: ResolveTurnDeps
}

export class CampaignLivePlayError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CampaignLivePlayError'
  }
}

export function createCampaignLivePlayDeps(
  input: CreateCampaignLivePlayDepsInput
): CampaignLivePlayDeps {
  const campaignId = requireCampaignId(input.campaignId)
  const characterId = requireCharacterId(input.characterId)
  const session = ensureOpenSession(input.campaignsRoot, campaignId)
  assertCampaignStoresBound()
  const dataRoot = resolveCampaignDataRoot(input.campaignsRoot, campaignId)
  return {
    session,
    resolveTurnDeps: buildResolveTurnDeps(input.textCompleter, dataRoot, characterId)
  }
}

export function ensureOpenSession(campaignsRoot: string, campaignId: string): CampaignSession {
  const active = getActiveCampaignSession()
  if (active?.campaignId === campaignId) return active
  active?.close()
  try {
    const session = openCampaignSession({
      campaignId,
      filePath: resolveCampaignFilePath(campaignsRoot, campaignId)
    })
    hydrateDurableAutosaves(resolveCampaignDataRoot(campaignsRoot, campaignId))
    return session
  } catch (error) {
    throw new CampaignLivePlayError(
      `Unable to open campaign "${campaignId}": ${errorMessage(error)}`
    )
  }
}

function buildResolveTurnDeps(
  completer: TextCompleter,
  dataRoot: string,
  characterId: string
): ResolveTurnDeps {
  const store = createJsonEncounterStore({ dataRoot })
  return {
    completer,
    currency: {
      credit: (id, amount) => itemEngine.credit(id, amount),
      debit: (id, amount) => itemEngine.debit(id, amount),
      getBalance: (id) => itemEngine.getBalance(id),
      clampProposedPrice
    },
    travel: { advanceTravelDays, setCharacterLocation },
    destinations: {
      isGenerated: () => true,
      resolvePlacement: (destinationId) => ({
        regionId: destinationId,
        placeId: destinationId,
        locationKind: 'settlement'
      })
    },
    narration: {
      llm: completer,
      npcs: { getNpc },
      items: { hasItem: (itemId) => characterHasItem(characterId, itemId) },
      locations: { isKnownLocation: isKnownPlayLocation }
    },
    combat: createStoreCombatTurnApi(store),
    persist: (record) => persistTurnRecord(dataRoot, record)
  }
}

function characterHasItem(characterId: string, itemId: string): boolean {
  try {
    const inventory = itemEngine.listInventory(characterId)
    if (inventory.held.some((view) => matchesItem(view.instance, itemId))) return true
    return equippedViews(inventory.equipped).some((view) => matchesItem(view.instance, itemId))
  } catch {
    return false
  }
}

function equippedViews(equipped: {
  mainHand?: { instance: { id: string; templateId: string; customName?: string } }
  offHand?: { instance: { id: string; templateId: string; customName?: string } }
  shield?: { instance: { id: string; templateId: string; customName?: string } }
  armor?: { instance: { id: string; templateId: string; customName?: string } }
  accessories: Array<{ instance: { id: string; templateId: string; customName?: string } }>
}): Array<{ instance: { id: string; templateId: string; customName?: string } }> {
  const views = [...equipped.accessories]
  for (const slot of [equipped.mainHand, equipped.offHand, equipped.shield, equipped.armor]) {
    if (slot !== undefined) views.push(slot)
  }
  return views
}

function matchesItem(
  instance: { id: string; templateId: string; customName?: string },
  itemId: string
): boolean {
  return (
    instance.id === itemId ||
    instance.templateId === itemId ||
    instance.customName === itemId
  )
}

function isKnownPlayLocation(name: string): boolean {
  const needle = name.trim().toLowerCase()
  if (needle.length === 0) return false
  for (const location of listCharacterLocations()) {
    if (matchesLocationName(location.regionId, location.placeId, needle)) return true
  }
  for (const location of listNpcLocations()) {
    if (matchesLocationName(location.regionId, location.placeId, needle)) return true
  }
  return false
}

function matchesLocationName(
  regionId: string,
  placeId: string | undefined,
  needle: string
): boolean {
  if (regionId.toLowerCase() === needle) return true
  return placeId !== undefined && placeId.toLowerCase() === needle
}

function persistTurnRecord(dataRoot: string, record: TurnPersistRecord): void {
  const turnsDir = join(dataRoot, 'turns')
  mkdirSync(turnsDir, { recursive: true })
  const stamp = new Date().toISOString().replaceAll(':', '-')
  const fileName = `${stamp}-${safeFileToken(record.characterId)}-${record.route}.json`
  writeFileSync(join(turnsDir, fileName), `${JSON.stringify(record, null, 2)}\n`, 'utf8')
}

function requireCampaignId(campaignId: string): string {
  if (campaignId.trim().length === 0) {
    throw new CampaignLivePlayError('campaignId is required to open live play deps')
  }
  return campaignId
}

function requireCharacterId(characterId: string): string {
  if (characterId.trim().length === 0) {
    throw new CampaignLivePlayError('characterId is required to open live play deps')
  }
  return characterId
}

function safeFileToken(value: string): string {
  return value.replace(/[^a-z0-9._-]+/gi, '_')
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
