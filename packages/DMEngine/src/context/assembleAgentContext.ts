import { formatAlwaysOnGrounding } from './alwaysOnGrounding.js'
import {
  ContextBudgetExceededError,
  estimateTokens,
  truncateToTokenBudget
} from './tokenBudget.js'
import type {
  AssembleAgentContextInput,
  AssembleAgentContextResult,
  RagContextChunk
} from './types.js'

const ALWAYS_ON_HEADER = '=== ALWAYS-ON GROUNDING ==='
const RAG_HEADER = '=== RAG CONTEXT ==='
const EXTRAS_HEADER = '=== EXTRAS ==='

export function assembleAgentContext(
  input: AssembleAgentContextInput
): AssembleAgentContextResult {
  const alwaysOnSection = buildAlwaysOnSection(input.alwaysOn)
  const alwaysOnTokens = estimateTokens(alwaysOnSection)

  if (alwaysOnTokens > input.maxTokens) {
    return resolveOversizedAlwaysOn(input, alwaysOnSection, alwaysOnTokens)
  }

  return assembleWithinBudget(input, alwaysOnSection, alwaysOnTokens)
}

function buildAlwaysOnSection(alwaysOn: AssembleAgentContextInput['alwaysOn']): string {
  const alwaysOnText = formatAlwaysOnGrounding(alwaysOn)
  return alwaysOnText.length > 0 ? `${ALWAYS_ON_HEADER}\n${alwaysOnText}` : ''
}

function resolveOversizedAlwaysOn(
  input: AssembleAgentContextInput,
  alwaysOnSection: string,
  alwaysOnTokens: number
): AssembleAgentContextResult {
  if (input.hardFailOnBudgetExceeded) {
    throw new ContextBudgetExceededError(
      `Always-on grounding requires ${alwaysOnTokens} tokens but budget is ${input.maxTokens}`
    )
  }

  const truncatedAlwaysOn = truncateToTokenBudget(alwaysOnSection, input.maxTokens)
  return {
    prompt: truncatedAlwaysOn,
    tokenCount: estimateTokens(truncatedAlwaysOn),
    truncated: true,
    ragIncluded: 0
  }
}

function assembleWithinBudget(
  input: AssembleAgentContextInput,
  alwaysOnSection: string,
  alwaysOnTokens: number
): AssembleAgentContextResult {
  const sections: string[] = alwaysOnSection.length > 0 ? [alwaysOnSection] : []
  let usedTokens = alwaysOnTokens
  let truncated = false

  const ragSection = buildBoundedSection({
    header: RAG_HEADER,
    items: input.ragChunks.map((chunk) => chunk.text),
    remainingTokens: input.maxTokens - usedTokens
  })
  truncated = truncated || ragSection.includedCount < input.ragChunks.length
  if (ragSection.text.length > 0) {
    sections.push(ragSection.text)
    usedTokens += ragSection.tokenCount
  }

  const extras = input.extras ?? []
  const extrasSection = buildBoundedSection({
    header: EXTRAS_HEADER,
    items: extras,
    remainingTokens: input.maxTokens - usedTokens
  })
  truncated = truncated || extrasSection.includedCount < extras.length
  if (extrasSection.text.length > 0) {
    sections.push(extrasSection.text)
  }

  const prompt = sections.join('\n\n')
  return {
    prompt,
    tokenCount: estimateTokens(prompt),
    truncated,
    ragIncluded: ragSection.includedCount
  }
}

function buildBoundedSection(input: {
  header: string
  items: string[]
  remainingTokens: number
}): { text: string; tokenCount: number; includedCount: number } {
  if (input.remainingTokens <= 0 || input.items.length === 0) {
    return { text: '', tokenCount: 0, includedCount: 0 }
  }

  const headerPrefix = `${input.header}\n`
  const headerTokens = estimateTokens(headerPrefix)
  if (headerTokens > input.remainingTokens) {
    return { text: '', tokenCount: 0, includedCount: 0 }
  }

  let budget = input.remainingTokens - headerTokens
  const included: string[] = []

  for (const item of input.items) {
    const separator = included.length > 0 ? '\n\n' : ''
    const candidate = `${separator}${item}`
    const candidateTokens = estimateTokens(candidate)
    if (candidateTokens <= budget) {
      included.push(item)
      budget -= candidateTokens
      continue
    }

    const partial = fitPartialChunk(candidate, budget)
    if (partial.length > 0) {
      included.push(partial.startsWith('\n\n') ? partial.slice(2) : partial)
    }
    break
  }

  if (included.length === 0) {
    return { text: '', tokenCount: 0, includedCount: 0 }
  }

  const text = `${headerPrefix}${included.join('\n\n')}`
  return {
    text,
    tokenCount: estimateTokens(text),
    includedCount: included.length
  }
}

function fitPartialChunk(text: string, budgetTokens: number): string {
  if (budgetTokens <= 0) {
    return ''
  }

  let low = 0
  let high = text.length
  let best = ''

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    const slice = text.slice(0, mid)
    if (estimateTokens(slice) <= budgetTokens) {
      best = slice
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  return best
}

export type { RagContextChunk }
