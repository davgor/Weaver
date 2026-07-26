import {
  generateScene,
  projectScene,
  projectSocial,
  streamSocial,
  type NarrationPeers
} from '@weaver/narration-engine'
import type {
  BranchResolution,
  NarrationFacts,
  TurnNarrationOutcome,
  TurnProjections,
  TurnRoute
} from '../types.js'

export function resolveNarrationBranch(playerText: string): BranchResolution {
  return { kind: 'narration', text: playerText }
}

export function buildTurnNarrationPrompt(facts: NarrationFacts): string {
  const lines = [
    'Narrate the resolved turn outcome using only these mechanical facts.',
    `Player action: ${facts.playerText}`,
    `Route: ${facts.route}`,
    `Resolution: ${JSON.stringify(facts.resolution)}`
  ]
  return lines.join('\n')
}

export async function narrateTurnOutcome(
  input: {
    route: TurnRoute
    resolution: BranchResolution
    playerText: string
    socialSpeakerId?: string
  },
  narration: NarrationPeers
): Promise<{ narration: TurnNarrationOutcome; projections: TurnProjections }> {
  if (input.route === 'narration' && input.socialSpeakerId !== undefined) {
    return narrateSocial(input, narration)
  }
  return narrateScene(input, narration)
}

async function narrateScene(
  input: {
    route: TurnRoute
    resolution: BranchResolution
    playerText: string
  },
  narration: NarrationPeers
): Promise<{ narration: TurnNarrationOutcome; projections: TurnProjections }> {
  const prompt = buildTurnNarrationPrompt({
    route: input.route,
    resolution: input.resolution,
    playerText: input.playerText
  })
  const outcome = await generateScene({ prompt }, narration)
  if (outcome.status === 'persisted') {
    return {
      narration: { kind: 'scene', status: 'persisted', prose: outcome.prose },
      projections: { scene: projectScene(), social: projectSocial() }
    }
  }
  return {
    narration: { kind: 'scene', status: 'rejected' },
    projections: { scene: projectScene(), social: projectSocial() }
  }
}

async function narrateSocial(
  input: {
    resolution: BranchResolution
    playerText: string
    socialSpeakerId?: string
  },
  narration: NarrationPeers
): Promise<{ narration: TurnNarrationOutcome; projections: TurnProjections }> {
  const speakerId = input.socialSpeakerId ?? 'npc-unknown'
  const prompt = buildTurnNarrationPrompt({
    route: 'narration',
    resolution: input.resolution,
    playerText: input.playerText
  })
  let prose = ''
  let status: TurnNarrationOutcome['status'] = 'silent'
  for await (const event of streamSocial(
    { prompt, speakerId, kind: 'npc' },
    narration
  )) {
    if (event.type === 'chunk' && event.text.length > 0) {
      prose += event.text
      status = 'persisted'
    }
    if (event.type === 'rejected') {
      status = 'rejected'
    }
  }
  return {
    narration: { kind: 'social', status, ...(prose.length > 0 ? { prose } : {}) },
    projections: { scene: projectScene(), social: projectSocial() }
  }
}
