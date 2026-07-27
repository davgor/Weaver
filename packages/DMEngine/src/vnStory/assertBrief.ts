import {
  VN_STORY_ACT_COUNT_DEFAULT,
  VN_STORY_ACT_COUNT_MAX,
  VN_STORY_ACT_COUNT_MIN,
  type VnMainCharacterBrief,
  type VnStoryBrief,
  type VnStoryGenerationInput
} from './types.js'

export type AssertedVnStoryBrief = VnStoryBrief & {
  actCount: number
  mainCharacter: VnMainCharacterBrief
}

export function assertVnStoryBrief(brief: VnStoryBrief): AssertedVnStoryBrief {
  assertText(brief.premise, 'premise')
  assertMainCharacter(brief.mainCharacter)
  return {
    premise: brief.premise.trim(),
    mainCharacter: trimMainCharacter(brief.mainCharacter),
    actCount: resolveActCount(brief.actCount)
  }
}

export function assertVnStoryGenerationInput(
  input: VnStoryGenerationInput
): AssertedVnStoryBrief & VnStoryGenerationInput {
  assertText(input.campaignId, 'campaignId')
  assertText(input.dataRoot, 'dataRoot')
  assertText(input.campaignFilePath, 'campaignFilePath')
  const brief = assertVnStoryBrief(input)
  return { ...input, ...brief }
}

function assertMainCharacter(mc: VnMainCharacterBrief): void {
  assertText(mc.name, 'mainCharacter.name')
  assertText(mc.personality, 'mainCharacter.personality')
  assertText(mc.appearance, 'mainCharacter.appearance')
}

function trimMainCharacter(mc: VnMainCharacterBrief): VnMainCharacterBrief {
  return {
    name: mc.name.trim(),
    personality: mc.personality.trim(),
    appearance: mc.appearance.trim()
  }
}

function resolveActCount(actCount: number | undefined): number {
  if (actCount === undefined) return VN_STORY_ACT_COUNT_DEFAULT
  assertRange(actCount, VN_STORY_ACT_COUNT_MIN, VN_STORY_ACT_COUNT_MAX, 'actCount')
  return actCount
}

function assertText(value: string, label: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`)
  }
}

function assertRange(value: number, min: number, max: number, label: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer from ${min} to ${max}`)
  }
}
