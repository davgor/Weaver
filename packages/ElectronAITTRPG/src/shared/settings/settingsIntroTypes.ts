export type SettingsIntroSnapshot = {
  needed: boolean
  dismissed: boolean
  ready: boolean
  reason: string | null
}

export type SettingsIntroApi = {
  get: () => Promise<SettingsIntroSnapshot>
  dismiss: () => Promise<SettingsIntroSnapshot>
}
