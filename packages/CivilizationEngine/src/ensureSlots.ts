import type { CivilizationStore } from './store/civilizationStore.js'
import { capacityForKind, slotTargetForPopulation } from './kindRules.js'
import {
  assertRoleHint,
  buildSlotId,
  copySlot,
  type EnsureNpcPlaceholdersInput,
  type NpcPlaceholderSlot
} from './npcPlaceholders.js'
import type { CivilizationRecord, CivilizationRegionalReader } from './types.js'

function nowIso(): string {
  return new Date().toISOString()
}

function cellsFor(
  store: CivilizationStore,
  worldId: string,
  civilizationId: string
): { x: number; y: number }[] {
  return store.listClaimedCells(worldId).filter((cell) => {
    return store.getAt(worldId, cell.x, cell.y)?.civilizationId === civilizationId
  })
}

function createMissingSlots(args: {
  record: CivilizationRecord
  roleHints: readonly EnsureNpcPlaceholdersInput['roleHints'][number][]
  existingCount: number
  needed: number
}): NpcPlaceholderSlot[] {
  const created: NpcPlaceholderSlot[] = []
  for (let i = 0; i < args.needed; i++) {
    const roleHint = args.roleHints[i % args.roleHints.length]
    if (!roleHint) continue
    assertRoleHint(roleHint)
    created.push({
      slotId: buildSlotId(args.record.civilizationId, roleHint, args.existingCount + created.length + 1),
      civilizationId: args.record.civilizationId,
      worldId: args.record.worldId,
      regionId: args.record.regionId,
      roleHint,
      status: 'unassigned'
    })
  }
  return created
}

export function ensureSlotsForRecord(args: {
  store: CivilizationStore
  regional: CivilizationRegionalReader
  record: CivilizationRecord
  roleHints?: EnsureNpcPlaceholdersInput['roleHints']
}): NpcPlaceholderSlot[] {
  const summary = args.regional.getRegionSummary(args.record.worldId, args.record.regionId)
  if (!summary) throw new Error(`Region not found: ${args.record.regionId}`)
  const capacity = capacityForKind(summary, args.record.kind)
  const roleHints = args.roleHints ?? capacity.roleHints
  const target = slotTargetForPopulation(capacity, args.record.population)
  const existing = args.store.listSlots(args.record.worldId, args.record.civilizationId)
  const assigned = existing.filter((slot) => slot.status === 'assigned')
  const unassigned = existing.filter((slot) => slot.status === 'unassigned')
  const needed = Math.max(target, assigned.length) - existing.length
  const created = createMissingSlots({
    record: args.record,
    roleHints: [...roleHints],
    existingCount: existing.length,
    needed
  })
  if (created.length > 0) args.store.saveSlots(created)
  const keepUnassigned = Math.max(0, target - assigned.length)
  if (unassigned.length > keepUnassigned) {
    args.store.deleteUnassignedSlots(
      args.record.worldId,
      args.record.civilizationId,
      keepUnassigned
    )
  }
  const finalSlots = args.store.listSlots(args.record.worldId, args.record.civilizationId)
  args.store.saveCivilization(
    {
      ...args.record,
      npcSlotCount: finalSlots.length,
      npcSlotsAssigned: finalSlots.filter((slot) => slot.status === 'assigned').length,
      updatedAt: nowIso()
    },
    cellsFor(args.store, args.record.worldId, args.record.civilizationId)
  )
  return finalSlots.map(copySlot)
}
