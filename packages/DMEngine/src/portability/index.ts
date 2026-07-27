export { PORTABLE_PACKAGE_VERSION } from './schemaVersion.js'
export {
  ONBOARDING_CAMPAIGN_SLICE_VERSION,
  bindOnboardingStore,
  createMemoryOnboardingStore,
  createSqliteOnboardingStore,
  exportOnboardingCampaignSlice,
  getActiveOnboardingStore,
  importOnboardingCampaignSlice,
  isOnboardingStoreBound,
  unbindOnboardingStore
} from '../persistence/repositories/sqliteOnboardingStore.js'
export type {
  OnboardingCampaignSlice,
  OnboardingRecordWrite,
  OnboardingStore,
  OnboardingStoredRecord
} from '../persistence/repositories/sqliteOnboardingStore.js'
export {
  createDefaultCampaignPortabilityDeps,
  exportCampaignPackage,
  type CampaignPortabilityDeps,
  type ExportCampaignPackageInput
} from './exportCampaign.js'
export {
  createDefaultCampaignImportDeps,
  importCampaignPackage,
  type CampaignImportDeps,
  type ImportCampaignPackageInput
} from './importCampaign.js'
export {
  PortabilitySchemaError,
  type CampaignPortablePackage,
  type CampaignPortablePackageInput,
  type CampaignPortablePackageV1,
  type CampaignPortablePackageV2,
  type CampaignPortabilityContext
} from './types.js'
