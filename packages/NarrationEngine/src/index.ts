export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type NarrationEngineApi = {
  id: 'NarrationEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/narration-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
    {
      name: 'describeRole',
      description: 'Describe LLM narration + validation responsibilities',
      invoke: () => ({
        inventsStories: true,
        validatesAgainst: ['world', 'items', 'npcs', 'enemies', 'combat'],
        note: 'Narration invents prose; facts must be validated with peer engine data.'
      })
    },
  ]
}

export const narrationEngine: NarrationEngineApi = {
  id: 'NarrationEngine',
  title: 'Narration Engine',
  description: 'LLM story invention validated against engine data',
  health() {
    return { ok: true, package: PACKAGE_NAME, version: VERSION }
  },
  listEndpoints() {
    return buildEndpoints()
  },
  async call(endpoint: string, payload?: unknown) {
    const match = buildEndpoints().find((e) => e.name === endpoint)
    if (!match) {
      throw new Error(`Unknown endpoint: ${endpoint}`)
    }
    return await match.invoke(payload)
  }
}
