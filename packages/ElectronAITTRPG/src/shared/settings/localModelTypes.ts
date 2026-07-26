import type { InstallProgress, LlmStatus } from '@weaver/llm-engine'

export type LocalModelStatus = LlmStatus

export type LocalModelInstallProgress = InstallProgress

export const LOCAL_MODEL_INSTALL_EVENT_CHANNEL = 'settings:localModelInstallProgress'
