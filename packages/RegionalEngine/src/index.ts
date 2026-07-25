export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type RegionalEngineApi = {
  id: 'RegionalEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/regional-engine'
const VERSION = '0.1.0'

function buildEndpoints(): EngineEndpoint[] {
  return [
    {
      name: 'health',
      description: 'Return package health metadata',
      invoke: () => ({ ok: true as const, package: PACKAGE_NAME, version: VERSION })
    },
  ]
}

export const regionalEngine: RegionalEngineApi = {
  id: 'RegionalEngine',
  title: 'Regional Engine',
  description: 'Deterministic map segmentation and region stats for WorldEngine worlds',
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
