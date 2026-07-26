import { TEMPLATE_IDS, type StarterItemTemplateId } from './templateCatalog.js'

export const STARTING_GEAR_CATALOG_VERSION = '1.0.0'
export const STARTING_GEAR_ARCHETYPES = ['Fighter', 'Rogue', 'Mage', 'Cleric', 'Ranger'] as const
export const EXPECTED_ACTION_ENGINE_ACTION_IDS = ['ice_bolt', 'hamstring_strike'] as const

export type StartingGearArchetype = (typeof STARTING_GEAR_ARCHETYPES)[number]
export type StarterActionId = (typeof EXPECTED_ACTION_ENGINE_ACTION_IDS)[number]

export type StartingLoadoutItem = {
  templateId: StarterItemTemplateId
  quantity: number
}

export type StartingLoadout = {
  archetype: StartingGearArchetype
  catalogVersion: string
  items: StartingLoadoutItem[]
  actionIds: StarterActionId[]
}

const STARTING_LOADOUTS: Readonly<Record<StartingGearArchetype, Omit<StartingLoadout, 'catalogVersion'>>> = {
  Fighter: {
    archetype: 'Fighter',
    items: [
      { templateId: TEMPLATE_IDS.shortSword, quantity: 1 },
      { templateId: TEMPLATE_IDS.roundShield, quantity: 1 },
      { templateId: TEMPLATE_IDS.chainShirt, quantity: 1 },
      { templateId: TEMPLATE_IDS.healingPotion, quantity: 1 }
    ],
    actionIds: ['hamstring_strike']
  },
  Rogue: {
    archetype: 'Rogue',
    items: [
      { templateId: TEMPLATE_IDS.dagger, quantity: 2 },
      { templateId: TEMPLATE_IDS.leatherArmor, quantity: 1 },
      { templateId: TEMPLATE_IDS.thievesTools, quantity: 1 },
      { templateId: TEMPLATE_IDS.travelerCloak, quantity: 1 }
    ],
    actionIds: ['hamstring_strike']
  },
  Mage: {
    archetype: 'Mage',
    items: [
      { templateId: TEMPLATE_IDS.apprenticeStaff, quantity: 1 },
      { templateId: TEMPLATE_IDS.spellFocusCrystal, quantity: 1 },
      { templateId: TEMPLATE_IDS.healingPotion, quantity: 1 }
    ],
    actionIds: ['ice_bolt']
  },
  Cleric: {
    archetype: 'Cleric',
    items: [
      { templateId: TEMPLATE_IDS.clericMace, quantity: 1 },
      { templateId: TEMPLATE_IDS.roundShield, quantity: 1 },
      { templateId: TEMPLATE_IDS.holySymbol, quantity: 1 },
      { templateId: TEMPLATE_IDS.healingPotion, quantity: 2 }
    ],
    actionIds: ['ice_bolt']
  },
  Ranger: {
    archetype: 'Ranger',
    items: [
      { templateId: TEMPLATE_IDS.longbow, quantity: 1 },
      { templateId: TEMPLATE_IDS.dagger, quantity: 1 },
      { templateId: TEMPLATE_IDS.leatherArmor, quantity: 1 },
      { templateId: TEMPLATE_IDS.rangerMap, quantity: 1 },
      { templateId: TEMPLATE_IDS.ropeBundle, quantity: 1 }
    ],
    actionIds: ['hamstring_strike']
  }
}

function cloneLoadout(loadout: Omit<StartingLoadout, 'catalogVersion'>): StartingLoadout {
  return {
    archetype: loadout.archetype,
    catalogVersion: STARTING_GEAR_CATALOG_VERSION,
    items: loadout.items.map((item) => ({ ...item })),
    actionIds: [...loadout.actionIds]
  }
}

export function isStartingGearArchetype(value: unknown): value is StartingGearArchetype {
  return typeof value === 'string' && STARTING_GEAR_ARCHETYPES.some((archetype) => archetype === value)
}

export function getStartingLoadout(archetype: StartingGearArchetype): StartingLoadout {
  return cloneLoadout(STARTING_LOADOUTS[archetype])
}
