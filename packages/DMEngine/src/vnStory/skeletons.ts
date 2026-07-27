import type { VnGenerationState, VnStoryGenerationStageId } from './types.js'

export function buildVnStageSkeleton(
  stage: VnStoryGenerationStageId,
  state: VnGenerationState
): string {
  switch (stage) {
    case 'premise':
      return premiseSkeleton(state)
    case 'acts':
      return actsSkeleton(state.actCount)
    case 'cast':
      return castSkeleton(castSlotCount(state.actCount))
    case 'opening':
      return openingSkeleton()
    case 'overview':
      return overviewSkeleton()
    case 'persist':
      return persistSkeleton()
  }
}

export function castSlotCount(actCount: number): number {
  return Math.max(2, Math.min(actCount + 1, 5))
}

function premiseSkeleton(state: VnGenerationState): string {
  const mc = state.input.mainCharacter
  return [
    'Summarize the visual-novel premise for player review.',
    `Premise: ${state.input.premise}`,
    `Main character: ${mc.name} — ${mc.personality}; ${mc.appearance}`,
    '{{PREMISE_SUMMARY}}'
  ].join('\n')
}

function actsSkeleton(actCount: number): string {
  const lines = [
    `Outline ${actCount} acts for a short visual-novel story.`,
    'For each act, fill Title: and Summary: lines inside the labeled block.'
  ]
  for (let index = 1; index <= actCount; index += 1) {
    lines.push(`{{ACT_${index}}}`)
  }
  return lines.join('\n')
}

function castSkeleton(castCount: number): string {
  const lines = [
    `Invent ${castCount} supporting cast NPCs.`,
    'For each, fill Name:, Role:, and Bio: lines inside the labeled block.'
  ]
  for (let index = 1; index <= castCount; index += 1) {
    lines.push(`{{CAST_${index}}}`)
  }
  return lines.join('\n')
}

function openingSkeleton(): string {
  return [
    'Write the opening beat the player sees before act one.',
    '{{OPENING_BEAT}}'
  ].join('\n')
}

function overviewSkeleton(): string {
  return [
    'Compose a short player-facing overview of the whole story.',
    '{{OVERVIEW_PROSE}}'
  ].join('\n')
}

function persistSkeleton(): string {
  return [
    'Confirm draft persistence for the visual-novel story catalog.',
    '{{PERSIST_SUMMARY}}'
  ].join('\n')
}
