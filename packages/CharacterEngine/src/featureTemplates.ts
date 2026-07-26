import { type ArchetypeId } from './archetypes.js'
import { CharacterEngineError } from './errors.js'

export type FeatureKind = 'archetype_feature' | 'passive_feature' | 'custom_feature'

export type FeatureTemplateId = string

export type FeatureTemplateOptions = {
  level: number
}

export type ComputedFeature = {
  featureId: string
  templateId: FeatureTemplateId
  kind: FeatureKind
  mechanicalEffects: Record<string, number>
  grantedActionIds: string[]
}

type FeatureTemplateDefinition = {
  templateId: FeatureTemplateId
  kind: FeatureKind
  archetypes: readonly ArchetypeId[]
  scale: (level: number) => Record<string, number>
  grantedActionIds: readonly string[]
}

const TEMPLATE_DEFINITIONS: Readonly<Record<FeatureTemplateId, FeatureTemplateDefinition>> = {
  'fighter.second_wind': {
    templateId: 'fighter.second_wind',
    kind: 'passive_feature',
    archetypes: ['Fighter'],
    scale: () => ({ bonusHitPoints: 5 }),
    grantedActionIds: []
  },
  'fighter.action_surge': {
    templateId: 'fighter.action_surge',
    kind: 'archetype_feature',
    archetypes: ['Fighter'],
    scale: (level) => ({ extraActionsPerRest: level >= 6 ? 2 : 1 }),
    grantedActionIds: []
  },
  'rogue.sneak_attack': {
    templateId: 'rogue.sneak_attack',
    kind: 'archetype_feature',
    archetypes: ['Rogue'],
    scale: (level) => ({ bonusDamageDice: Math.max(1, Math.floor((level + 1) / 2)) }),
    grantedActionIds: []
  },
  'rogue.cunning_action': {
    templateId: 'rogue.cunning_action',
    kind: 'passive_feature',
    archetypes: ['Rogue'],
    scale: () => ({ bonusMovementFeet: 10 }),
    grantedActionIds: []
  },
  'mage.arcane_focus': {
    templateId: 'mage.arcane_focus',
    kind: 'passive_feature',
    archetypes: ['Mage'],
    scale: (level) => ({ spellDcBonus: level >= 6 ? 2 : 1 }),
    grantedActionIds: []
  },
  'mage.frost_adept': {
    templateId: 'mage.frost_adept',
    kind: 'archetype_feature',
    archetypes: ['Mage'],
    scale: (level) => ({ spellDamageBonus: level >= 5 ? 2 : 1 }),
    grantedActionIds: ['ice_bolt']
  },
  'cleric.divine_blessing': {
    templateId: 'cleric.divine_blessing',
    kind: 'passive_feature',
    archetypes: ['Cleric'],
    scale: () => ({ healingBonus: 2 }),
    grantedActionIds: []
  },
  'cleric.channel_divinity': {
    templateId: 'cleric.channel_divinity',
    kind: 'archetype_feature',
    archetypes: ['Cleric'],
    scale: (level) => ({ channelUses: level >= 6 ? 2 : 1 }),
    grantedActionIds: ['ice_bolt']
  },
  'ranger.hunters_mark': {
    templateId: 'ranger.hunters_mark',
    kind: 'archetype_feature',
    archetypes: ['Ranger'],
    scale: (level) => ({ markedDamageBonus: level >= 5 ? 2 : 1 }),
    grantedActionIds: []
  },
  'ranger.natural_explorer': {
    templateId: 'ranger.natural_explorer',
    kind: 'passive_feature',
    archetypes: ['Ranger'],
    scale: () => ({ travelSpeedBonus: 1 }),
    grantedActionIds: []
  },
  'emergent.custom_passive': {
    templateId: 'emergent.custom_passive',
    kind: 'custom_feature',
    archetypes: ['Fighter', 'Rogue', 'Mage', 'Cleric', 'Ranger'],
    scale: (level) => ({ situationalBonus: Math.max(1, Math.floor(level / 2)) }),
    grantedActionIds: []
  }
}

const FALLBACK_TEMPLATE_BY_ARCHETYPE: Readonly<Record<ArchetypeId, FeatureTemplateId>> = {
  Fighter: 'fighter.second_wind',
  Rogue: 'rogue.cunning_action',
  Mage: 'mage.arcane_focus',
  Cleric: 'cleric.divine_blessing',
  Ranger: 'ranger.natural_explorer'
}

let nextFeatureId = 1

export function isFeatureTemplateId(value: unknown): value is FeatureTemplateId {
  return typeof value === 'string' && value in TEMPLATE_DEFINITIONS
}

export function listArchetypeFeatureTemplates(archetype: ArchetypeId): FeatureTemplateId[] {
  return Object.values(TEMPLATE_DEFINITIONS)
    .filter((template) => template.archetypes.includes(archetype) && template.kind !== 'custom_feature')
    .map((template) => template.templateId)
    .sort()
}

export function getFallbackTemplateId(archetype: ArchetypeId): FeatureTemplateId {
  return FALLBACK_TEMPLATE_BY_ARCHETYPE[archetype]
}

export function computeFeatureFromTemplate(
  templateId: FeatureTemplateId,
  opts: FeatureTemplateOptions
): ComputedFeature {
  const template = TEMPLATE_DEFINITIONS[templateId]
  if (template === undefined) {
    throw new CharacterEngineError('FEATURE_TEMPLATE_INVALID', `Unknown template: ${templateId}`)
  }
  assertPositiveLevel(opts.level)
  return {
    featureId: createFeatureId(templateId),
    templateId: template.templateId,
    kind: template.kind,
    mechanicalEffects: template.scale(opts.level),
    grantedActionIds: [...template.grantedActionIds]
  }
}

function createFeatureId(templateId: FeatureTemplateId): string {
  const id = `${templateId}-${nextFeatureId}`
  nextFeatureId += 1
  return id
}

function assertPositiveLevel(level: number): void {
  if (!Number.isInteger(level) || level < 1) {
    throw new CharacterEngineError('FEATURE_TEMPLATE_INVALID', 'level must be a positive integer')
  }
}
