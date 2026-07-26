import type { TextCompleter } from '@weaver/narration-engine'
import { classifyPlayerIntent } from '../intents/classifyIntent.js'
import { heuristicRoute } from './heuristicRoute.js'
import { TurnRoutingError, type InterpretIntentInput, type RoutePlan, type TurnRoute } from './types.js'

const ROUTE_PROMPT = [
  'Classify the player turn and choose a route.',
  'Reply with JSON only: {"intent":"short label","route":"commerce|travel|combat|narration"}',
  'Commerce covers buying or selling. Travel covers moving to another place.',
  'Combat covers attacks and maneuvers during an encounter. Narration covers everything else.'
].join(' ')

export async function interpretIntentAndRoute(input: InterpretIntentInput): Promise<RoutePlan> {
  if (input.combatActive) {
    return combatPlan(input.text)
  }
  const heuristic = heuristicRoute(input.text)
  if (heuristic !== null) {
    return heuristic
  }
  return interpretWithLlm(input.text, input.completer)
}

function combatPlan(text: string): RoutePlan {
  return {
    route: 'combat',
    skipLlm: true,
    intent: { kind: 'combat', text }
  }
}

async function interpretWithLlm(text: string, completer: TextCompleter): Promise<RoutePlan> {
  const response = await completer.completeText({
    prompt: `${ROUTE_PROMPT}\nPlayer: ${text}`
  })
  const parsed = parseRouteResponse(response.text)
  return {
    route: parsed.route,
    skipLlm: false,
    intent: { kind: intentKindForRoute(parsed.route, parsed.intent, text), text: parsed.intent }
  }
}

function parseRouteResponse(raw: string): { intent: string; route: TurnRoute } {
  const json = extractJson(raw)
  const route = readRoute(json.route)
  const intent = readIntent(json.intent)
  return { intent, route }
}

function extractJson(raw: string): Record<string, unknown> {
  const trimmed = raw.trim()
  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new TurnRoutingError('DM_TURN_ROUTE_INVALID', 'Intent routing response was not JSON')
  }
  const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>
  return parsed
}

function readRoute(value: unknown): TurnRoute {
  if (value === 'commerce' || value === 'travel' || value === 'combat' || value === 'narration') {
    return value
  }
  throw new TurnRoutingError('DM_TURN_ROUTE_INVALID', `Unknown route: ${String(value)}`)
}

function readIntent(value: unknown): string {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim()
  }
  throw new TurnRoutingError('DM_TURN_ROUTE_INVALID', 'Intent routing response missing intent')
}

function intentKindForRoute(
  route: TurnRoute,
  intent: string,
  sourceText: string
): RoutePlan['intent']['kind'] {
  if (route === 'commerce') {
    const kind = classifyPlayerIntent(sourceText)
    return kind === 'buy' || kind === 'sell' ? kind : classifyPlayerIntent(intent)
  }
  if (route === 'travel') {
    return 'travel'
  }
  if (route === 'combat') {
    return 'combat'
  }
  return 'narration'
}
