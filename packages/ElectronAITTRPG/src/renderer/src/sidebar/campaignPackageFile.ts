import type { CampaignPortablePackage } from '@weaver/dm-engine'

export function buildCampaignExportFilename(campaignId: string): string {
  return `${campaignId}.weaver-campaign.json`
}

export async function parseCampaignPackageFile(file: File): Promise<CampaignPortablePackage> {
  const text = await file.text()
  const parsed: unknown = JSON.parse(text)
  return assertPortablePackage(parsed)
}

export function downloadCampaignPackage(
  campaignId: string,
  pkg: CampaignPortablePackage
): void {
  const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = buildCampaignExportFilename(campaignId)
  anchor.click()
  URL.revokeObjectURL(url)
}

function assertPortablePackage(value: unknown): CampaignPortablePackage {
  if (!isRecord(value)) {
    throw new Error('Portable package must be a JSON object')
  }
  if (typeof value.version !== 'number') {
    throw new Error('Portable package is missing version')
  }
  if (typeof value.campaignId !== 'string' || value.campaignId.trim() === '') {
    throw new Error('Portable package is missing campaignId')
  }
  if (!isRecord(value.slices)) {
    throw new Error('Portable package is missing slices')
  }
  return value as CampaignPortablePackage
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
