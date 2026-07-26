import type { PlayerIntentKind } from './types.js'

const BUY_PATTERN = /\b(buy|purchase)\b/i
const SELL_PATTERN = /\bsell\b/i
const TRAVEL_PATTERN = /\b(travel|journey|head to|go to|walk to)\b/i

export function classifyPlayerIntent(text: string): PlayerIntentKind {
  const trimmed = text.trim()
  if (BUY_PATTERN.test(trimmed)) {
    return 'buy'
  }
  if (SELL_PATTERN.test(trimmed)) {
    return 'sell'
  }
  if (TRAVEL_PATTERN.test(trimmed)) {
    return 'travel'
  }
  return 'narration'
}
