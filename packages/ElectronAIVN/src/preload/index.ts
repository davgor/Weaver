import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import type {
  AivnApi,
  AivnInstallProgress,
  AivnLocalModelStatus,
  BootProgressUpdate,
  FirstRunSnapshot,
  LocalBackendPreference,
  PlayVnStoryResult,
  StartupBootSnapshot,
  SubmitVnPlayActionRequest,
  VnPlaySnapshot,
  VnSavedGameSummary,
  VnStoryDraft,
  VnStoryReviewSnapshot
} from '../shared/gameApi.js'
import {
  LLM_INSTALL_PROGRESS_CHANNEL,
  STARTUP_BOOT_PROGRESS_CHANNEL
} from '../shared/llmTypes.js'

const api: AivnApi = {
  windowControls: {
    minimize: (): void => ipcRenderer.send('window:minimize'),
    maximize: (): void => ipcRenderer.send('window:maximize'),
    close: (): void => ipcRenderer.send('window:close')
  },
  startup: {
    getBoot: (): Promise<StartupBootSnapshot> => ipcRenderer.invoke('startup:getBoot'),
    onBootProgress: (listener: (update: BootProgressUpdate) => void) =>
      subscribe<BootProgressUpdate>(STARTUP_BOOT_PROGRESS_CHANNEL, listener)
  },
  llm: {
    getStatus: (): Promise<AivnLocalModelStatus> => ipcRenderer.invoke('llm:getStatus'),
    install: (): Promise<AivnLocalModelStatus> => ipcRenderer.invoke('llm:install'),
    onInstallProgress: (listener: (progress: AivnInstallProgress) => void) =>
      subscribe<AivnInstallProgress>(LLM_INSTALL_PROGRESS_CHANNEL, listener),
    getBackend: (): Promise<LocalBackendPreference | null> => ipcRenderer.invoke('llm:getBackend'),
    setBackend: (backend: LocalBackendPreference): Promise<LocalBackendPreference> =>
      ipcRenderer.invoke('llm:setBackend', backend)
  },
  firstRun: {
    get: (): Promise<FirstRunSnapshot> => ipcRenderer.invoke('firstRun:get'),
    dismiss: (): Promise<FirstRunSnapshot> => ipcRenderer.invoke('firstRun:dismiss')
  },
  story: {
    startGeneration: (draft: VnStoryDraft): Promise<VnStoryReviewSnapshot> =>
      ipcRenderer.invoke('vnStory:startGeneration', draft),
    getReview: (): Promise<VnStoryReviewSnapshot | null> => ipcRenderer.invoke('vnStory:getReview'),
    confirmReview: (): Promise<VnStoryReviewSnapshot> => ipcRenderer.invoke('vnStory:confirmReview'),
    backToEdit: (): Promise<void> => ipcRenderer.invoke('vnStory:backToEdit'),
    play: (): Promise<PlayVnStoryResult> => ipcRenderer.invoke('vnStory:play'),
    listSavedGames: (): Promise<VnSavedGameSummary[]> => ipcRenderer.invoke('vnStory:listSavedGames')
  },
  play: {
    open: (campaignId: string): Promise<VnPlaySnapshot> =>
      ipcRenderer.invoke('vnPlay:open', campaignId),
    submitAction: (request: SubmitVnPlayActionRequest): Promise<VnPlaySnapshot> =>
      ipcRenderer.invoke('vnPlay:submitAction', request)
  },
  app: {
    getVersion: (): Promise<string> => ipcRenderer.invoke('app:getVersion')
  }
}

contextBridge.exposeInMainWorld('aivn', api)

function subscribe<T>(channel: string, listener: (payload: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, payload: T): void => {
    listener(payload)
  }
  ipcRenderer.on(channel, handler)
  return () => {
    ipcRenderer.removeListener(channel, handler)
  }
}
