export type EngineEndpoint = {
  name: string
  description: string
}

export type EngineSummary = {
  id: string
  title: string
  description: string
  endpoints: EngineEndpoint[]
}

export type EngineCallResult = {
  engineId: string
  endpoint: string
  payload?: unknown
  durationMs: number
  result: unknown
}

export type WeaverAdminApi = {
  listEngines: () => Promise<EngineSummary[]>
  callEndpoint: (engineId: string, endpoint: string, payload?: unknown) => Promise<EngineCallResult>
}
