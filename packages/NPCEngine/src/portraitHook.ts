import {
  generatePortrait as narrationGeneratePortrait,
  type GeneratePortraitDeps
} from '@weaver/narration-engine'
import { getNpc, updateNpcPortrait } from './store.js'
import type {
  CompanionPortraitHookRequest,
  NpcRecord,
  PortraitGenerationRequest,
  PortraitHookDeps,
  PortraitHookRequest,
  PortraitHookResult
} from './types.js'

export function requestNpcPortrait(
  input: PortraitHookRequest,
  deps: PortraitHookDeps = {}
): PortraitHookResult {
  const npc = getNpc(input.npcId)
  if (npc === undefined || !input.settings.generativeTokensEnabled) {
    return result(false, 'npc', input.npcId)
  }
  queuePortrait(requestFor(npc, 'npc', input.prompt, input.settings), input.npcId, deps)
  return result(true, 'npc', input.npcId)
}

export function requestCompanionPortrait(
  input: CompanionPortraitHookRequest,
  deps: PortraitHookDeps = {}
): PortraitHookResult {
  const npc = getNpc(input.companionId)
  if (npc === undefined || !input.settings.generativeTokensEnabled) {
    return result(false, 'companion', input.companionId)
  }
  queuePortrait(requestFor(npc, 'companion', input.prompt, input.settings), input.companionId, deps)
  return result(true, 'companion', input.companionId)
}

function queuePortrait(
  request: PortraitGenerationRequest,
  npcId: string,
  deps: PortraitHookDeps
): void {
  const generate = deps.generatePortrait ?? narrationGeneratePortrait
  void generate(request, portraitDeps(deps))
    .then((image) => {
      if (image.imagePath !== null) {
        updateNpcPortrait(npcId, { imagePath: image.imagePath, provider: image.provider })
      }
    })
    .catch(() => undefined)
}

function portraitDeps(deps: PortraitHookDeps): GeneratePortraitDeps | undefined {
  return deps.providers === undefined ? undefined : { providers: deps.providers }
}

function requestFor(
  npc: NpcRecord,
  subjectKind: 'npc' | 'companion',
  prompt: string,
  settings: PortraitGenerationRequest['settings']
): PortraitGenerationRequest {
  return {
    subjectKind,
    subjectId: npc.npcId,
    prompt,
    campaignId: npc.campaignId,
    settings,
    subjectFacts: {
      race: npc.identity.race.name,
      description: npc.identity.background?.name ?? npc.placeholder.roleHint,
      ...(npc.displayName === undefined ? {} : { name: npc.displayName })
    }
  }
}

function result(
  queued: boolean,
  subjectKind: PortraitHookResult['subjectKind'],
  subjectId: string
): PortraitHookResult {
  return { queued, subjectKind, subjectId }
}
