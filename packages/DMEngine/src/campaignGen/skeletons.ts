import type { CampaignGenerationInput, CampaignGenerationStageId, GenerationState } from './types.js'

export function buildStageSkeleton(stage: CampaignGenerationStageId, state: GenerationState): string {
  switch (stage) {
    case 'canon':
      return canonSkeleton(state.input)
    case 'pantheon':
      return pantheonSkeleton()
    case 'world':
      return worldSkeleton()
    case 'factions':
      return factionsSkeleton()
    case 'regions':
      return regionsSkeleton(state.input.regionCount)
    case 'npcs':
      return npcsSkeleton(state.input.npcsPerRegion)
    case 'bestiary':
      return bestiarySkeleton()
    case 'story':
      return storySkeleton()
    case 'persist':
      return persistSkeleton()
  }
}

function canonSkeleton(input: CampaignGenerationInput): string {
  const premise = input.premise ?? 'No premise provided.'
  return [
    'Canon facts for the campaign premise.',
    `Premise: ${premise}`,
    '{{CANON}}'
  ].join('\n')
}

function pantheonSkeleton(): string {
  return [
    'Campaign pantheon outline.',
    '{{PANTHEON}}'
  ].join('\n')
}

function worldSkeleton(): string {
  return [
    'World generation summary grounded in the canon and pantheon.',
    '{{WORLD_SUMMARY}}'
  ].join('\n')
}

function factionsSkeleton(): string {
  return [
    'Primary faction to seed through NPCEngine.',
    'Name: {{FACTION_NAME}}',
    'Purpose: {{FACTION_PURPOSE}}'
  ].join('\n')
}

function regionsSkeleton(regionCount: number): string {
  return [
    `Guidance for ${regionCount} deterministic regions.`,
    '{{REGION_GUIDANCE}}'
  ].join('\n')
}

function npcsSkeleton(npcsPerRegion: number): string {
  return [
    `NPC style guidance for ${npcsPerRegion} NPCs per region.`,
    '{{NPC_STYLE}}'
  ].join('\n')
}

function bestiarySkeleton(): string {
  return [
    'Bestiary flavor attached to deterministic enemy facts.',
    '{{BESTIARY_FLAVOR}}'
  ].join('\n')
}

function storySkeleton(): string {
  return [
    'Opening story premise for the validated campaign.',
    '{{STORY_PREMISE}}'
  ].join('\n')
}

function persistSkeleton(): string {
  return [
    'Persistence summary for the campaign catalog seed.',
    '{{PERSIST_SUMMARY}}'
  ].join('\n')
}
