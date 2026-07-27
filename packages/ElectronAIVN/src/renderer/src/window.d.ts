import type { AivnApi } from '../../shared/gameApi'

declare global {
  interface Window {
    aivn: AivnApi
  }
}

export {}
