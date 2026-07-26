import {
  formatTokenCount,
  formatUsd,
  type TimeRangePreset,
  type UsageProviderRow,
  type UsagePurposeRow
} from '../../shared/llmUsageDashboard'
import { useLlmUsageDashboard } from './useLlmUsageDashboard'

const RANGE_OPTIONS: Array<{ id: TimeRangePreset; label: string }> = [
  { id: '24h', label: 'Last 24h' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
  { id: 'all', label: 'All time' }
]

type DashboardState = ReturnType<typeof useLlmUsageDashboard>

export function LlmUsageDashboard() {
  const dashboard = useLlmUsageDashboard()

  return (
    <section className="usage-dashboard" aria-label="LLM usage dashboard">
      <UsageDashboardHeader dashboard={dashboard} />
      {dashboard.error && <p className="status error">{dashboard.error}</p>}
      <div className="usage-grid">
        <ActiveProviderCard dashboard={dashboard} />
        <PurposeUsageCard dashboard={dashboard} />
        <ProviderUsageCard dashboard={dashboard} />
      </div>
    </section>
  )
}

function UsageDashboardHeader({ dashboard }: { dashboard: DashboardState }) {
  return (
    <div className="usage-header">
      <div>
        <h2>LLM usage</h2>
        <p className="usage-lede">
          Aggregated from LLMEngine metering by purpose, provider, and selected time range.
        </p>
      </div>
      <div className="usage-actions">
        <label className="range-picker">
          <span>Time range</span>
          <select
            value={dashboard.rangePreset}
            disabled={dashboard.state === 'loading'}
            onChange={(event) => void dashboard.onRangeChange(event.target.value as TimeRangePreset)}
          >
            {RANGE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary"
          disabled={dashboard.state === 'loading'}
          onClick={() => void dashboard.onRefresh()}
        >
          Refresh
        </button>
      </div>
    </div>
  )
}

function ActiveProviderCard({ dashboard }: { dashboard: DashboardState }) {
  return (
    <article className="usage-card provider-card">
      <h3>Active provider</h3>
      {dashboard.providerSummary ? (
        <>
          <dl className="provider-facts">
            <div>
              <dt>Provider</dt>
              <dd>{dashboard.providerSummary.providerLabel}</dd>
            </div>
            <div>
              <dt>Model</dt>
              <dd>{dashboard.providerSummary.modelLabel}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{dashboard.providerSummary.statusLabel}</dd>
            </div>
            <div>
              <dt>Backend</dt>
              <dd>{dashboard.providerSummary.backendLabel ?? '—'}</dd>
            </div>
          </dl>
          <p className="provider-detail">{dashboard.providerSummary.detail}</p>
          <div className="provider-actions">
            <button
              type="button"
              disabled={dashboard.checkingConnection}
              onClick={() => void dashboard.onCheckConnection()}
            >
              {dashboard.checkingConnection ? 'Checking…' : 'Check connection'}
            </button>
            {dashboard.connectionCheck && (
              <span className="connection-result">
                {new Date(dashboard.connectionCheck.checkedAt).toLocaleString()} · backend{' '}
                {dashboard.connectionCheck.backend}
              </span>
            )}
          </div>
        </>
      ) : (
        <p className="status">Loading provider status…</p>
      )}
    </article>
  )
}

function PurposeUsageCard({ dashboard }: { dashboard: DashboardState }) {
  return (
    <article className="usage-card">
      <h3>By purpose</h3>
      {dashboard.state === 'loading' && <p className="status">Loading usage…</p>}
      {dashboard.state !== 'loading' && dashboard.purposeRows.length === 0 && (
        <p className="status">No usage recorded for this range.</p>
      )}
      {dashboard.purposeRows.length > 0 && (
        <UsageTable rows={dashboard.purposeRows} totals={dashboard.purposeTotals} />
      )}
    </article>
  )
}

function ProviderUsageCard({ dashboard }: { dashboard: DashboardState }) {
  return (
    <article className="usage-card">
      <h3>By provider</h3>
      {dashboard.state === 'loading' && <p className="status">Loading usage…</p>}
      {dashboard.state !== 'loading' && dashboard.providerRows.length === 0 && (
        <p className="status">No usage recorded for this range.</p>
      )}
      {dashboard.providerRows.length > 0 && <ProviderTable rows={dashboard.providerRows} />}
    </article>
  )
}

type UsageTableProps = {
  rows: UsagePurposeRow[]
  totals: UsagePurposeRow
}

function UsageTable({ rows, totals }: UsageTableProps) {
  return (
    <div className="usage-table-wrap">
      <table className="usage-table">
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Events</th>
            <th>Prompt</th>
            <th>Completion</th>
            <th>Total tokens</th>
            <th>Est. cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.purpose}>
              <td>{row.purpose}</td>
              <td>{formatTokenCount(row.eventCount)}</td>
              <td>{formatTokenCount(row.promptTokens)}</td>
              <td>{formatTokenCount(row.completionTokens)}</td>
              <td>{formatTokenCount(row.totalTokens)}</td>
              <td>{formatUsd(row.estimatedCostUsd)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td>{totals.purpose}</td>
            <td>{formatTokenCount(totals.eventCount)}</td>
            <td>{formatTokenCount(totals.promptTokens)}</td>
            <td>{formatTokenCount(totals.completionTokens)}</td>
            <td>{formatTokenCount(totals.totalTokens)}</td>
            <td>{formatUsd(totals.estimatedCostUsd)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ProviderTable({ rows }: { rows: UsageProviderRow[] }) {
  return (
    <div className="usage-table-wrap">
      <table className="usage-table">
        <thead>
          <tr>
            <th>Provider</th>
            <th>Models</th>
            <th>Events</th>
            <th>Total tokens</th>
            <th>Est. cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.provider}>
              <td>{row.provider}</td>
              <td>{row.models.join(', ')}</td>
              <td>{formatTokenCount(row.eventCount)}</td>
              <td>{formatTokenCount(row.totalTokens)}</td>
              <td>{formatUsd(row.estimatedCostUsd)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
