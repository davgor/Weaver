import type { WeaverAdminApi } from '../../shared/engineCatalog'

declare global {
  interface Window {
    weaverAdmin: WeaverAdminApi
  }
}

export {}
