import type { EngineCallResult, EngineSummary } from '../shared/engineCatalog.js'

export type DispatchableEngine = {
  id: string
  title: string
  description: string
  listEndpoints: () => Array<{ name: string; description: string }>
  call: (endpoint: string, payload?: unknown) => Promise<unknown>
}

export function buildCatalog(engines: readonly DispatchableEngine[]): EngineSummary[] {
  return engines.map((engine) => ({
    id: engine.id,
    title: engine.title,
    description: engine.description,
    endpoints: engine.listEndpoints().map((endpoint) => ({
      name: endpoint.name,
      description: endpoint.description
    }))
  }))
}

export async function dispatchEngineCall(
  engines: readonly DispatchableEngine[],
  engineId: string,
  endpoint: string,
  payload?: unknown
): Promise<EngineCallResult> {
  const engine = engines.find((entry) => entry.id === engineId)
  if (!engine) {
    throw new Error(`Unknown engine: ${engineId}`)
  }
  const started = Date.now()
  const result = await engine.call(endpoint, payload)
  return {
    engineId,
    endpoint,
    payload,
    durationMs: Date.now() - started,
    result
  }
}
