export type LocalModelBackend = 'vulkan' | 'cpu'
export type LocalModelStatusPhase = 'missing' | 'installing' | 'ready' | 'error'

export interface BackendChoiceOption {
  value: LocalModelBackend
  label: string
  description: string
}

export const BACKEND_CHOICE_OPTIONS: readonly BackendChoiceOption[] = [
  {
    value: 'vulkan',
    label: 'GPU (Vulkan)',
    description: 'Recommended when a compatible GPU is available.'
  },
  {
    value: 'cpu',
    label: 'CPU',
    description: 'Most compatible fallback for local inference.'
  }
]

export function selectBackend(
  current: LocalModelBackend,
  requested: LocalModelBackend,
  disabled: boolean
): LocalModelBackend {
  return disabled ? current : requested
}

export function isBackendChoiceDisabled(
  statusPhase: LocalModelStatusPhase,
  installing: boolean
): boolean {
  return statusPhase === 'installing' || installing
}
