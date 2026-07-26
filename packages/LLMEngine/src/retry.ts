export type RetryClassifier = (error: unknown, attempt: number) => boolean
export type Sleep = (ms: number) => Promise<void>

export type RetryOptions = {
  maxAttempts?: number
  initialDelayMs?: number
  maxDelayMs?: number
  factor?: number
  sleep?: Sleep
  shouldRetry?: RetryClassifier
}

const DEFAULT_MAX_ATTEMPTS = 1
const DEFAULT_INITIAL_DELAY_MS = 100
const DEFAULT_MAX_DELAY_MS = 1_000
const DEFAULT_FACTOR = 2

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const maxAttempts = positiveInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS)
  const sleep = options.sleep ?? defaultSleep
  const shouldRetry = options.shouldRetry ?? (() => true)
  let delayMs = positiveNumber(options.initialDelayMs, DEFAULT_INITIAL_DELAY_MS)

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation()
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error
      }
      await sleep(delayMs)
      delayMs = nextDelay(delayMs, options)
    }
  }

  throw new Error('Retry loop exhausted without a result')
}

function nextDelay(current: number, options: RetryOptions): number {
  const factor = positiveNumber(options.factor, DEFAULT_FACTOR)
  const maxDelayMs = positiveNumber(options.maxDelayMs, DEFAULT_MAX_DELAY_MS)
  return Math.min(current * factor, maxDelayMs)
}

function positiveInteger(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) return fallback
  return Math.floor(value)
}

function positiveNumber(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) return fallback
  return value
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
