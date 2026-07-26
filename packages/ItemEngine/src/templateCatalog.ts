import type { ItemService } from './itemService.js'
import type { ItemTemplate } from './types.js'

export const ITEM_TEMPLATE_CATALOG_VERSION = '1.0.0'

export const TEMPLATE_IDS = {
  shortSword: 'template.short_sword',
  roundShield: 'template.round_shield',
  chainShirt: 'template.chain_shirt',
  leatherArmor: 'template.leather_armor',
  longbow: 'template.longbow',
  dagger: 'template.dagger',
  thievesTools: 'template.thieves_tools',
  apprenticeStaff: 'template.apprentice_staff',
  spellFocusCrystal: 'template.spell_focus_crystal',
  clericMace: 'template.cleric_mace',
  holySymbol: 'template.holy_symbol',
  healingPotion: 'template.healing_potion',
  antidoteVial: 'template.antidote_vial',
  silverLocket: 'template.silver_locket',
  travelerCloak: 'template.traveler_cloak',
  ropeBundle: 'template.rope_bundle',
  rangerMap: 'template.ranger_map',
  carvedBoneTrinket: 'template.carved_bone_trinket'
} as const

export type StarterItemTemplateId = (typeof TEMPLATE_IDS)[keyof typeof TEMPLATE_IDS]

type TemplateRegistry = Pick<ItemService, 'defineTemplate' | 'getTemplate'>

const STARTER_ITEM_TEMPLATES: readonly ItemTemplate[] = [
  {
    id: TEMPLATE_IDS.shortSword,
    name: 'Short Sword',
    description: 'A reliable one-handed blade for close combat.',
    equipmentSlots: ['mainHand', 'offHand'],
    tags: ['weapon', 'melee', 'starter']
  },
  {
    id: TEMPLATE_IDS.roundShield,
    name: 'Round Shield',
    description: 'A strapped wooden shield with an iron boss.',
    equipmentSlots: ['shield'],
    tags: ['shield', 'starter']
  },
  {
    id: TEMPLATE_IDS.chainShirt,
    name: 'Chain Shirt',
    description: 'Interlocking rings over a padded gambeson.',
    equipmentSlots: ['armor'],
    tags: ['armor', 'medium', 'starter']
  },
  {
    id: TEMPLATE_IDS.leatherArmor,
    name: 'Leather Armor',
    description: 'Quiet boiled leather armor for scouting and travel.',
    equipmentSlots: ['armor'],
    tags: ['armor', 'light', 'starter']
  },
  {
    id: TEMPLATE_IDS.longbow,
    name: 'Longbow',
    description: 'A tall hunting bow with a waxed string.',
    equipmentSlots: ['mainHand'],
    tags: ['weapon', 'ranged', 'starter']
  },
  {
    id: TEMPLATE_IDS.dagger,
    name: 'Dagger',
    description: 'A balanced utility blade.',
    equipmentSlots: ['mainHand', 'offHand'],
    tags: ['weapon', 'melee', 'light', 'starter']
  },
  {
    id: TEMPLATE_IDS.thievesTools,
    name: "Thieves' Tools",
    description: 'Lock picks, probes, and narrow tension bars.',
    tags: ['tool', 'rogue', 'starter']
  },
  {
    id: TEMPLATE_IDS.apprenticeStaff,
    name: 'Apprentice Staff',
    description: 'A plain staff marked with novice spellwork.',
    equipmentSlots: ['mainHand'],
    tags: ['weapon', 'focus', 'mage', 'starter']
  },
  {
    id: TEMPLATE_IDS.spellFocusCrystal,
    name: 'Spell Focus Crystal',
    description: 'A cloudy crystal suitable for channeling cantrips.',
    tags: ['focus', 'mage', 'starter']
  },
  {
    id: TEMPLATE_IDS.clericMace,
    name: 'Cleric Mace',
    description: 'A compact mace etched with simple vows.',
    equipmentSlots: ['mainHand'],
    tags: ['weapon', 'melee', 'cleric', 'starter']
  },
  {
    id: TEMPLATE_IDS.holySymbol,
    name: 'Holy Symbol',
    description: 'A modest icon used for rites and vows.',
    tags: ['focus', 'cleric', 'starter']
  },
  {
    id: TEMPLATE_IDS.healingPotion,
    name: 'Healing Potion',
    description: 'A stoppered red restorative draught.',
    tags: ['consumable', 'potion', 'healing', 'loot']
  },
  {
    id: TEMPLATE_IDS.antidoteVial,
    name: 'Antidote Vial',
    description: 'A bitter vial brewed for common venoms.',
    tags: ['consumable', 'potion', 'loot']
  },
  {
    id: TEMPLATE_IDS.silverLocket,
    name: 'Silver Locket',
    description: 'A tarnished keepsake with space for a tiny portrait.',
    equipmentSlots: ['accessories'],
    tags: ['trinket', 'accessory', 'loot']
  },
  {
    id: TEMPLATE_IDS.travelerCloak,
    name: 'Traveler Cloak',
    description: 'A weather-stained cloak with hidden inner pockets.',
    tags: ['gear', 'starter', 'loot']
  },
  {
    id: TEMPLATE_IDS.ropeBundle,
    name: 'Rope Bundle',
    description: 'Fifty feet of hemp rope.',
    tags: ['gear', 'starter', 'loot']
  },
  {
    id: TEMPLATE_IDS.rangerMap,
    name: 'Ranger Map',
    description: 'A waterproof map annotated with trail signs.',
    tags: ['gear', 'ranger', 'starter']
  },
  {
    id: TEMPLATE_IDS.carvedBoneTrinket,
    name: 'Carved Bone Trinket',
    description: 'A palm-sized token carved with a local warding sign.',
    tags: ['trinket', 'loot']
  }
]

function cloneTemplate(template: ItemTemplate): ItemTemplate {
  const copy: ItemTemplate = { id: template.id, name: template.name }
  if (template.description !== undefined) copy.description = template.description
  if (template.equipmentSlots !== undefined) copy.equipmentSlots = [...template.equipmentSlots]
  if (template.tags !== undefined) copy.tags = [...template.tags]
  return copy
}

function ensureTemplate(service: TemplateRegistry, template: ItemTemplate): void {
  try {
    service.getTemplate(template.id)
  } catch {
    service.defineTemplate(template)
  }
}

export function getItemTemplateCatalog(): ItemTemplate[] {
  return STARTER_ITEM_TEMPLATES.map(cloneTemplate)
}

export function seedItemTemplateCatalog(service: TemplateRegistry): ItemTemplate[] {
  const templates = getItemTemplateCatalog()
  for (const template of templates) ensureTemplate(service, template)
  return templates
}
