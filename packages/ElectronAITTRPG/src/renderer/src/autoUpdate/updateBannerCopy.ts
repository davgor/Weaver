export function formatAvailableCopy(currentVersion: string, availableVersion?: string): string {
  if (!availableVersion) return 'Update available'
  return `Update available: v${currentVersion} → v${availableVersion}`
}

export function formatDownloadingCopy(percent?: number, availableVersion?: string): string {
  const label = availableVersion ? `v${availableVersion}` : 'update'
  if (percent === undefined) return `Downloading ${label}…`
  return `Downloading ${label}… ${percent}%`
}
