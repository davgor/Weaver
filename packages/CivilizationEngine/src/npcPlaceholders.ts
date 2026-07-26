export const NPC_ROLE_HINTS = [
  'resident',
  'farmer',
  'guard',
  'merchant',
  'lord',
  'mayor'
] as const

export type NpcRoleHint = (typeof NPC_ROLE_HINTS)[number]
export type NpcPlaceholderStatus = 'unassigned' | 'assigned'

export type NpcPlaceholderSlot = {
  slotId: string
  civilizationId: string
  worldId: string
  regionId: string
  roleHint: NpcRoleHint
  status: NpcPlaceholderStatus
  assignedNpcId?: string
  priority?: number
  districtTag?: string
}

export type EnsureNpcPlaceholdersInput = {
  worldId: string
  civilizationId: string
  regionId: string
  roleHints: readonly NpcRoleHint[]
}

export type ListUnassignedFilter = {
  regionId?: string
  roleHint?: NpcRoleHint
  civilizationId?: string
}

const slotsByWorld = new Map<string, Map<string, NpcPlaceholderSlot>>()

export function clearNpcPlaceholderStore(): void {
  slotsByWorld.clear()
}

export function assertRoleHint(value: string): asserts value is NpcRoleHint {
  if (!NPC_ROLE_HINTS.some((hint) => hint === value)) {
    throw new Error(`Unknown NPC role hint: ${value}`)
  }
}

export function copySlot(slot: NpcPlaceholderSlot): NpcPlaceholderSlot {
  return { ...slot }
}

export function matchesUnassignedFilter(
  slot: NpcPlaceholderSlot,
  filter: ListUnassignedFilter
): boolean {
  if (filter.regionId !== undefined && slot.regionId !== filter.regionId) return false
  if (filter.roleHint !== undefined && slot.roleHint !== filter.roleHint) return false
  if (filter.civilizationId !== undefined && slot.civilizationId !== filter.civilizationId) {
    return false
  }
  return true
}

export function applyClaim(slot: NpcPlaceholderSlot, npcId: string): NpcPlaceholderSlot {
  if (slot.status === 'assigned') {
    throw new Error(`NPC placeholder ${slot.slotId} is already assigned`)
  }
  if (npcId.trim().length === 0) {
    throw new Error('npcId is required to claim an NPC placeholder')
  }
  return { ...slot, status: 'assigned', assignedNpcId: npcId }
}

export function applyRelease(slot: NpcPlaceholderSlot): NpcPlaceholderSlot {
  const next = { ...slot, status: 'unassigned' as const }
  delete next.assignedNpcId
  return next
}

export function buildSlotId(
  civilizationId: string,
  roleHint: NpcRoleHint,
  sequence: number
): string {
  return `${civilizationId}:${roleHint}:${sequence}`
}

function readWorldSlots(worldId: string): Map<string, NpcPlaceholderSlot> {
  const existing = slotsByWorld.get(worldId)
  if (existing !== undefined) return existing
  const created = new Map<string, NpcPlaceholderSlot>()
  slotsByWorld.set(worldId, created)
  return created
}

function requireSlot(worldId: string, slotId: string): NpcPlaceholderSlot {
  const slot = readWorldSlots(worldId).get(slotId)
  if (slot === undefined) throw new Error(`NPC placeholder not found: ${slotId}`)
  return slot
}

/** In-memory helper retained for peer packages; service APIs persist via SQLite. */
export function ensureNpcPlaceholders(
  input: EnsureNpcPlaceholdersInput
): NpcPlaceholderSlot[] {
  const worldSlots = readWorldSlots(input.worldId)
  const created: NpcPlaceholderSlot[] = []
  for (const roleHint of input.roleHints) {
    assertRoleHint(roleHint)
    const slotId = buildSlotId(input.civilizationId, roleHint, worldSlots.size + 1)
    const slot: NpcPlaceholderSlot = {
      slotId,
      civilizationId: input.civilizationId,
      worldId: input.worldId,
      regionId: input.regionId,
      roleHint,
      status: 'unassigned'
    }
    worldSlots.set(slotId, slot)
    created.push(copySlot(slot))
  }
  return created
}

export function listNpcPlaceholders(
  worldId: string,
  civilizationId: string
): NpcPlaceholderSlot[] {
  return [...readWorldSlots(worldId).values()]
    .filter((slot) => slot.civilizationId === civilizationId)
    .map(copySlot)
}

export function listUnassignedNpcPlaceholders(
  worldId: string,
  filter: ListUnassignedFilter = {}
): NpcPlaceholderSlot[] {
  return [...readWorldSlots(worldId).values()]
    .filter((slot) => slot.status === 'unassigned')
    .filter((slot) => matchesUnassignedFilter(slot, filter))
    .map(copySlot)
}

export function claimNpcPlaceholder(
  worldId: string,
  slotId: string,
  npcId: string
): NpcPlaceholderSlot {
  const slot = requireSlot(worldId, slotId)
  const claimed = applyClaim(slot, npcId)
  worldSlotsSet(worldId, claimed)
  return copySlot(claimed)
}

export function releaseNpcPlaceholder(worldId: string, slotId: string): NpcPlaceholderSlot {
  const slot = requireSlot(worldId, slotId)
  const released = applyRelease(slot)
  worldSlotsSet(worldId, released)
  return copySlot(released)
}

function worldSlotsSet(worldId: string, slot: NpcPlaceholderSlot): void {
  readWorldSlots(worldId).set(slot.slotId, slot)
}
