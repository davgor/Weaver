export type EngineEndpoint = {
  name: string
  description: string
  invoke: (payload?: unknown) => Promise<unknown> | unknown
}

export const PACKAGE_NAME = '@weaver/civilization-engine'
export const VERSION = '0.1.0'
