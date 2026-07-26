import { resolvePreferredBackend, type BackendProbe, type LocalLlmBackend } from './backend.js'
import { DEFAULT_MODEL, type ModelSpec } from './modelCatalog.js'
import type {
  CreateRuntime,
  Downloader,
  FileStore,
  InstallProgress,
  LlmRuntime,
  LlmStatus
} from './types.js'

export type InstallControllerOptions = {
  dataDir: string
  model?: ModelSpec
  files: FileStore
  downloader: Downloader
  probe: BackendProbe
}

function modelPathFor(files: FileStore, dataDir: string, model: ModelSpec): string {
  return files.join(dataDir, 'models', model.filename)
}

export async function readInstallStatus(options: InstallControllerOptions): Promise<LlmStatus> {
  const model = options.model ?? DEFAULT_MODEL
  const modelPath = modelPathFor(options.files, options.dataDir, model)
  const present = await options.files.exists(modelPath)
  if (!present) {
    return emptyStatus(model, 'not_installed')
  }
  const backend = await resolvePreferredBackend(options.probe)
  return {
    phase: 'ready',
    backend,
    model,
    modelPath,
    error: null,
    bytesDownloaded: model.approxBytes,
    bytesTotal: model.approxBytes
  }
}

export async function installModel(
  options: InstallControllerOptions,
  onProgress?: (progress: InstallProgress) => void
): Promise<LlmStatus> {
  const model = options.model ?? DEFAULT_MODEL
  const modelPath = modelPathFor(options.files, options.dataDir, model)
  if (await options.files.exists(modelPath)) {
    return readInstallStatus(options)
  }
  await options.files.ensureDir(options.files.join(options.dataDir, 'models'))
  const report = onProgress ?? (() => undefined)
  try {
    await options.downloader.download(model.downloadUrl, modelPath, report)
  } catch (error) {
    return {
      phase: 'error',
      backend: null,
      model,
      modelPath: null,
      error: errorMessage(error),
      bytesDownloaded: 0,
      bytesTotal: model.approxBytes
    }
  }
  return readInstallStatus(options)
}

export async function ensureRuntime(
  options: InstallControllerOptions,
  createRuntime: CreateRuntime,
  cached: LlmRuntime | null
): Promise<{ runtime: LlmRuntime; backend: LocalLlmBackend; modelPath: string }> {
  const status = await readInstallStatus(options)
  if (status.phase !== 'ready' || !status.modelPath || !status.backend) {
    throw new Error('LLM model is not installed')
  }
  if (cached) {
    return { runtime: cached, backend: status.backend, modelPath: status.modelPath }
  }
  const runtime = await createRuntime({
    modelPath: status.modelPath,
    backend: status.backend
  })
  return { runtime, backend: status.backend, modelPath: status.modelPath }
}

function emptyStatus(model: ModelSpec, phase: 'not_installed'): LlmStatus {
  return {
    phase,
    backend: null,
    model,
    modelPath: null,
    error: null,
    bytesDownloaded: 0,
    bytesTotal: model.approxBytes
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
