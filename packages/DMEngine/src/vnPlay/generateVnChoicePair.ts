import { fillAndValidate, type TextCompleter } from '@weaver/narration-engine'

export type GenerateVnChoicePairInput = {
  personality: string
  beatText: string
  appearance?: string
  seed?: string
}

export type GenerateVnChoicePairResult =
  | { ok: true; options: [string, string]; errors: [] }
  | { ok: false; options?: undefined; errors: string[] }

const CHOICE_SKELETON = '{{OPTION_A}}\n{{OPTION_B}}'

/**
 * Two personality-grounded player choices for the VN interaction panel.
 * Electron always adds a third free-text control; invention stays in Narration fill.
 */
export async function generateVnChoicePair(
  input: GenerateVnChoicePairInput,
  completer: TextCompleter
): Promise<GenerateVnChoicePairResult> {
  const result = await fillAndValidate(
    {
      skeleton: CHOICE_SKELETON,
      facts: buildFacts(input),
      stage: [
        'vn.choicePair',
        'Propose exactly two short player choices grounded in personality and the current beat.',
        'Each option is something the main character might say or do next.'
      ].join('\n'),
      ...(input.seed !== undefined ? { seed: input.seed } : {})
    },
    completer
  )
  const optionA = result.filled.OPTION_A?.trim()
  const optionB = result.filled.OPTION_B?.trim()
  if (!result.ok || optionA === undefined || optionB === undefined || optionA.length === 0 || optionB.length === 0) {
    return { ok: false, errors: result.errors.length > 0 ? result.errors : ['Missing OPTION_A/OPTION_B'] }
  }
  return { ok: true, options: [optionA, optionB], errors: [] }
}

function buildFacts(input: GenerateVnChoicePairInput): Record<string, string> {
  const facts: Record<string, string> = {
    personality: input.personality,
    beatText: input.beatText
  }
  if (input.appearance !== undefined && input.appearance.trim().length > 0) {
    facts.appearance = input.appearance
  }
  return facts
}
