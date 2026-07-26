import { useCallback, useEffect, useState } from 'react'
import {
  aggregateUsageByProvider,
  buildActiveProviderSummary,
  buildUsageTimeRange,
  sumPurposeRows,
  type ActiveProviderSummary,
  type TimeRangePreset,
  type UsageEventSnapshot,
  type UsageProviderRow,
  type UsagePurposeRow
} from '../../shared/llmUsageDashboard'

type LoadState = 'loading' | 'ready' | 'error'

type ConnectionCheck = {
  checkedAt: string
  backend: string
}

function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

async function fetchUsageData(preset: TimeRangePreset) {
  const range = buildUsageTimeRange(preset)
  const [purposeResult, eventsResult] = await Promise.all([
    window.weaverAdmin.callEndpoint('LLMEngine', 'queryUsageByPurpose', range),
    window.weaverAdmin.callEndpoint('LLMEngine', 'listUsageEvents', range)
  ])
  const purposes = purposeResult.result as UsagePurposeRow[]
  const events = eventsResult.result as UsageEventSnapshot[]
  return { purposes, providerRows: aggregateUsageByProvider(events) }
}

async function fetchProviderSummary(): Promise<ActiveProviderSummary> {
  const [statusResult, modelResult] = await Promise.all([
    window.weaverAdmin.callEndpoint('LLMEngine', 'getStatus'),
    window.weaverAdmin.callEndpoint('LLMEngine', 'getModelSpec')
  ])
  const status = statusResult.result as {
    phase: string
    backend: string | null
    model: { id: string; displayName: string }
    error: string | null
  }
  const model = modelResult.result as { id: string; displayName: string }
  return buildActiveProviderSummary({
    phase: status.phase,
    backend: status.backend,
    model,
    error: status.error
  })
}

async function resolveBackendConnection(): Promise<ConnectionCheck> {
  const backendResult = await window.weaverAdmin.callEndpoint('LLMEngine', 'resolveBackend')
  return { checkedAt: new Date().toISOString(), backend: String(backendResult.result) }
}

async function loadFullDashboard(preset: TimeRangePreset) {
  const [summary, usage] = await Promise.all([fetchProviderSummary(), fetchUsageData(preset)])
  return { summary, ...usage }
}

async function runDashboardLoad(
  task: () => Promise<void>,
  setState: (state: LoadState) => void,
  setError: (error: string | null) => void
) {
  setState('loading')
  setError(null)
  try {
    await task()
    setState('ready')
  } catch (err) {
    setError(toErrorMessage(err))
    setState('error')
  }
}

async function runConnectionCheck(
  setConnectionCheck: (check: ConnectionCheck) => void,
  setProviderSummary: (summary: ActiveProviderSummary) => void,
  setError: (error: string | null) => void,
  setCheckingConnection: (checking: boolean) => void
) {
  setCheckingConnection(true)
  setError(null)
  try {
    const [check, summary] = await Promise.all([resolveBackendConnection(), fetchProviderSummary()])
    setConnectionCheck(check)
    setProviderSummary(summary)
  } catch (err) {
    setError(toErrorMessage(err))
  } finally {
    setCheckingConnection(false)
  }
}

export function useLlmUsageDashboard() {
  const [rangePreset, setRangePreset] = useState<TimeRangePreset>('7d')
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [providerSummary, setProviderSummary] = useState<ActiveProviderSummary | null>(null)
  const [purposeRows, setPurposeRows] = useState<UsagePurposeRow[]>([])
  const [providerRows, setProviderRows] = useState<UsageProviderRow[]>([])
  const [connectionCheck, setConnectionCheck] = useState<ConnectionCheck | null>(null)
  const [checkingConnection, setCheckingConnection] = useState(false)

  const loadDashboard = useCallback(async () => {
    await runDashboardLoad(async () => {
      const { summary, purposes, providerRows: rows } = await loadFullDashboard(rangePreset)
      setProviderSummary(summary)
      setPurposeRows(purposes)
      setProviderRows(rows)
    }, setState, setError)
  }, [rangePreset])

  useEffect(() => {
    void loadDashboard()
  }, [loadDashboard])

  const onRangeChange = useCallback(async (preset: TimeRangePreset) => {
    setRangePreset(preset)
    await runDashboardLoad(async () => {
      const { purposes, providerRows: rows } = await fetchUsageData(preset)
      setPurposeRows(purposes)
      setProviderRows(rows)
    }, setState, setError)
  }, [])

  const onCheckConnection = useCallback(async () => {
    await runConnectionCheck(setConnectionCheck, setProviderSummary, setError, setCheckingConnection)
  }, [])

  return {
    state, error, rangePreset, providerSummary, purposeRows, providerRows,
    purposeTotals: sumPurposeRows(purposeRows), connectionCheck, checkingConnection,
    onRangeChange, onCheckConnection, onRefresh: loadDashboard
  }
}
