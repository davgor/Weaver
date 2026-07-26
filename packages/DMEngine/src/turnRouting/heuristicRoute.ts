import { classifyPlayerIntent } from '../intents/classifyIntent.js'
import type { RoutePlan } from './types.js'

export function heuristicRoute(text: string): RoutePlan | null {
  const kind = classifyPlayerIntent(text)
  if (kind === 'buy' || kind === 'sell') {
    return {
      route: 'commerce',
      skipLlm: true,
      intent: { kind, text }
    }
  }
  if (kind === 'travel') {
    return {
      route: 'travel',
      skipLlm: true,
      intent: { kind: 'travel', text }
    }
  }
  return null
}
