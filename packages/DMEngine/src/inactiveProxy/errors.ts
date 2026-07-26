export type InactiveProxyErrorCode =
  | 'DM_INACTIVE_PROXY_INPUT_INVALID'
  | 'DM_INACTIVE_PROXY_TARGET_ACTIVE'

export class InactiveProxyError extends Error {
  readonly code: InactiveProxyErrorCode

  constructor(code: InactiveProxyErrorCode, message: string) {
    super(message)
    this.name = 'InactiveProxyError'
    this.code = code
  }
}
