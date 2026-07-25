export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export type EnemyEngineApi = {
  id: 'EnemyEngine'
  title: string
  description: string
  health: () => { ok: true; package: string; version: string }
  listEndpoints: () => EngineEndpoint[]
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

const PACKAGE_NAME = '@weaver/enemy-engine'
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

export const enemyEngine: EnemyEngineApi = {
  id: 'EnemyEngine',
  title: 'Enemy Engine',
  description: 'Construct enemies for combat encounters',
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
