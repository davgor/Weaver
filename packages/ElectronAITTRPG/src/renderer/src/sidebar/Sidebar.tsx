import { useRef, useState } from 'react'
import type { CampaignSummary } from '../../../shared/gameApi'
import {
  buildCampaignExportFilename,
  downloadCampaignPackage,
  parseCampaignPackageFile
} from './campaignPackageFile'
import './sidebar.css'

interface SidebarProps {
  campaigns: CampaignSummary[]
  onNewCampaign: () => void
  onOpenCampaign: (campaignId: string) => void
  onCampaignsChanged?: () => void | Promise<void>
}

interface CampaignActionContext {
  onCampaignsChanged?: () => void | Promise<void>
  setBusy: (busy: boolean) => void
  setStatusMessage: (message: string | null) => void
}

export function Sidebar(props: SidebarProps): JSX.Element {
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const selectedCampaign = props.campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null
  const actionContext: CampaignActionContext = {
    onCampaignsChanged: props.onCampaignsChanged,
    setBusy,
    setStatusMessage
  }

  return (
    <aside className="sidebar" aria-label="Campaigns">
      <div className="sidebar-header">Campaigns</div>
      <CampaignList
        campaigns={props.campaigns}
        selectedCampaignId={selectedCampaignId}
        onSelect={setSelectedCampaignId}
        onOpenCampaign={props.onOpenCampaign}
      />
      {statusMessage === null ? null : <p className="sidebar-status">{statusMessage}</p>}
      <ImportExportActions
        busy={busy}
        importInputRef={importInputRef}
        selectedCampaign={selectedCampaign}
        actionContext={actionContext}
        onNewCampaign={props.onNewCampaign}
        onClearSelection={() => setSelectedCampaignId(null)}
        onSelectCampaign={setSelectedCampaignId}
      />
    </aside>
  )
}

function CampaignList(props: {
  campaigns: CampaignSummary[]
  selectedCampaignId: string | null
  onSelect: (campaignId: string) => void
  onOpenCampaign: (campaignId: string) => void
}): JSX.Element {
  if (props.campaigns.length === 0) {
    return (
      <p className="sidebar-empty">No campaigns yet. Create one to generate a world and begin.</p>
    )
  }

  return (
    <ul className="sidebar-campaign-list">
      {props.campaigns.map((campaign) => (
        <li key={campaign.id}>
          <button
            type="button"
            className={campaignButtonClass(campaign.id, props.selectedCampaignId)}
            onClick={() => {
              props.onSelect(campaign.id)
              props.onOpenCampaign(campaign.id)
            }}
          >
            <span className="sidebar-campaign-name">{campaign.name}</span>
            <span className="sidebar-campaign-last-played">
              {campaign.lastPlayedAt ?? 'Never played'}
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function ImportExportActions(props: {
  busy: boolean
  importInputRef: React.RefObject<HTMLInputElement | null>
  selectedCampaign: CampaignSummary | null
  actionContext: CampaignActionContext
  onNewCampaign: () => void
  onClearSelection: () => void
  onSelectCampaign: (campaignId: string) => void
}): JSX.Element {
  return (
    <>
      <footer className="sidebar-footer">
        <CampaignRailButtons
          busy={props.busy}
          selectedCampaign={props.selectedCampaign}
          actionContext={props.actionContext}
          onImportClick={() => props.importInputRef.current?.click()}
          onClearSelection={props.onClearSelection}
        />
        <button type="button" onClick={props.onNewCampaign}>
          New Campaign
        </button>
      </footer>
      <CampaignImportInput
        importInputRef={props.importInputRef}
        actionContext={props.actionContext}
        onSelectCampaign={props.onSelectCampaign}
      />
    </>
  )
}

function CampaignRailButtons(props: {
  busy: boolean
  selectedCampaign: CampaignSummary | null
  actionContext: CampaignActionContext
  onImportClick: () => void
  onClearSelection: () => void
}): JSX.Element {
  return (
    <div className="sidebar-footer-actions">
      <button
        type="button"
        className="campaigns-rail-import-button"
        disabled={props.busy}
        onClick={props.onImportClick}
      >
        Import
      </button>
      <button
        type="button"
        className="campaigns-rail-action"
        disabled={props.busy || props.selectedCampaign === null}
        onClick={() => void exportSelectedCampaign(props.selectedCampaign, props.actionContext)}
      >
        Export
      </button>
      <button
        type="button"
        className="campaigns-rail-delete"
        disabled={props.busy || props.selectedCampaign === null}
        onClick={() =>
          void deleteSelectedCampaign({
            campaign: props.selectedCampaign,
            ...props.actionContext,
            clearSelection: props.onClearSelection
          })
        }
      >
        Delete
      </button>
    </div>
  )
}

function CampaignImportInput(props: {
  importInputRef: React.RefObject<HTMLInputElement | null>
  actionContext: CampaignActionContext
  onSelectCampaign: (campaignId: string) => void
}): JSX.Element {
  return (
    <input
      ref={props.importInputRef}
      className="sidebar-import-input"
      type="file"
      accept=".json,application/json"
      onChange={(event) =>
        void importCampaignFile({
          input: event.currentTarget,
          ...props.actionContext,
          setSelectedCampaignId: props.onSelectCampaign
        })
      }
    />
  )
}

function campaignButtonClass(campaignId: string, selectedCampaignId: string | null): string {
  return selectedCampaignId === campaignId
    ? 'sidebar-campaign-button sidebar-campaign-button-selected'
    : 'sidebar-campaign-button'
}

async function exportSelectedCampaign(
  campaign: CampaignSummary | null,
  ctx: CampaignActionContext
): Promise<void> {
  if (campaign === null) return
  ctx.setBusy(true)
  ctx.setStatusMessage(null)
  try {
    const pkg = await window.aiTtrpg.campaigns.export({ campaignId: campaign.id })
    downloadCampaignPackage(campaign.id, pkg)
    ctx.setStatusMessage(`Exported ${buildCampaignExportFilename(campaign.id)}`)
  } catch (error) {
    ctx.setStatusMessage(readErrorMessage(error))
  } finally {
    ctx.setBusy(false)
  }
}

async function deleteSelectedCampaign(options: {
  campaign: CampaignSummary | null
  onCampaignsChanged?: () => void | Promise<void>
  setBusy: (busy: boolean) => void
  setStatusMessage: (message: string | null) => void
  clearSelection: () => void
}): Promise<void> {
  if (options.campaign === null) return
  const confirmed = window.confirm(
    `Delete campaign "${options.campaign.name}"? This cannot be undone.`
  )
  if (!confirmed) return

  options.setBusy(true)
  options.setStatusMessage(null)
  try {
    await window.aiTtrpg.campaigns.delete({ campaignId: options.campaign.id })
    options.clearSelection()
    await options.onCampaignsChanged?.()
    options.setStatusMessage(`Deleted ${options.campaign.name}`)
  } catch (error) {
    options.setStatusMessage(readErrorMessage(error))
  } finally {
    options.setBusy(false)
  }
}

async function importCampaignFile(options: {
  input: HTMLInputElement
  onCampaignsChanged?: () => void | Promise<void>
  setBusy: (busy: boolean) => void
  setStatusMessage: (message: string | null) => void
  setSelectedCampaignId: (campaignId: string) => void
}): Promise<void> {
  const file = options.input.files?.[0]
  options.input.value = ''
  if (file === undefined) return

  options.setBusy(true)
  options.setStatusMessage(null)
  try {
    const pkg = await parseCampaignPackageFile(file)
    const result = await window.aiTtrpg.campaigns.import({ package: pkg })
    options.setSelectedCampaignId(result.campaignId)
    await options.onCampaignsChanged?.()
    options.setStatusMessage(`Imported ${result.name}`)
  } catch (error) {
    options.setStatusMessage(readErrorMessage(error))
  } finally {
    options.setBusy(false)
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return 'Campaign action failed'
}
