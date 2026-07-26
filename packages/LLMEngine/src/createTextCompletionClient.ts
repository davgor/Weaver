import { createProviderRuntime, type ProviderFetch } from './providerRuntime.js'
import {
  resolveProviderConfig,
  type ProviderEnv,
  type ProviderSettings
} from './providerConfig.js'
import type { RetryOptions } from './retry.js'
import type { LlmRuntime } from './types.js'
import type { UsageMeter } from './usageTypes.js'

export type CreateTextCompletionClientOptions = {
  settings?: ProviderSettings
  env?: ProviderEnv
  fetch?: ProviderFetch
  localRuntime?: LlmRuntime
  retry?: RetryOptions
  meter?: UsageMeter
}

export function createTextCompletionClient(
  options: CreateTextCompletionClientOptions = {}
): LlmRuntime {
  const config = resolveProviderConfig(options.settings, options.env)
  return createProviderRuntime(config, {
    ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    ...(options.localRuntime === undefined ? {} : { localRuntime: options.localRuntime }),
    ...(options.retry === undefined ? {} : { retry: options.retry }),
    ...(options.meter === undefined ? {} : { meter: options.meter })
  })
}
