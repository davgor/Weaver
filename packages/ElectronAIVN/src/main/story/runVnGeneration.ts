import { setCampaignRaceRoster } from '@weaver/character-engine'
import {
  clearNpcPlaceholderStore,
  ensureNpcPlaceholders
} from '@weaver/civilization-engine'
import {
  createCampaign,
  permanentizeVnStory,
  runVnStoryGeneration,
  type VnStoryGenerationDeps,
  type VnStoryGenerationInput,
  type VnStoryGenerationResult
} from '@weaver/dm-engine'
import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'
import {
  appendNpcMemory,
  clearNpcStore,
  constructNpc,
  queryNpcGroundingContext
} from '@weaver/npc-engine'

export function createLiveVnStoryDeps(completer: TextCompleter): VnStoryGenerationDeps {
  return {
    narration: { fillAndValidate },
    completer,
    civilization: { ensureNpcPlaceholders },
    npc: { constructNpc, appendNpcMemory, queryNpcGroundingContext },
    character: { setCampaignRaceRoster },
    campaign: { createCampaign }
  }
}

export async function invokeRunVnStoryGeneration(
  input: VnStoryGenerationInput,
  deps: VnStoryGenerationDeps
): Promise<VnStoryGenerationResult> {
  clearNpcStore()
  clearNpcPlaceholderStore()
  setCampaignRaceRoster(input.campaignId, [{ raceId: 'human', name: 'Human' }])
  return runVnStoryGeneration(input, deps)
}

export { permanentizeVnStory }
