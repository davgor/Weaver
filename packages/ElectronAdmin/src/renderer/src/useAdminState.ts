import { useEffect, useState } from 'react'
import type { EngineCallResult, EngineSummary } from '../../shared/engineCatalog'

type LoadState = 'loading' | 'ready' | 'error'

export function useAdminState() {
  const [engines, setEngines] = useState<EngineSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [state, setState] = useState<LoadState>('loading')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [lastResult, setLastResult] = useState<EngineCallResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const list = await window.weaverAdmin.listEngines()
        if (cancelled) return
        setEngines(list)
        setSelectedId(list[0]?.id ?? null)
        setState('ready')
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setState('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selected = engines.find((engine) => engine.id === selectedId) ?? null

  function onSelect(id: string) {
    setSelectedId(id)
    setLastResult(null)
    setError(null)
  }

  async function onRun(endpoint: string, payload?: unknown) {
    if (!selected) return
    setBusy(true)
    setError(null)
    try {
      setLastResult(await window.weaverAdmin.callEndpoint(selected.id, endpoint, payload))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return { engines, selected, selectedId, state, error, busy, lastResult, onSelect, onRun }
}
