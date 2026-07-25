# LLMEngine (`@weaver/llm-engine`)

Local LLM runtime controller for Weaver.

## Role

Owns model install lifecycle and chat completion against a pinned local model. Electron UIs prompt download/status; **NarrationEngine** / **DMEngine** use completion for invention and orchestration. This package does **not** invent game facts or own campaign rules.

## Model & backend

| Setting | Value |
|---------|--------|
| Default model | Qwen2.5 7B Instruct, Q4_K_M (`QWEN_2_5_7B_INSTRUCT_Q4_K_M` / `DEFAULT_MODEL`) |
| Preferred backend | Vulkan, then CPU fallback (`resolvePreferredBackend`) |
| Runtime | `node-llama-cpp` (optional dependency) via `createNodeLlamaRuntime` |
| Default data dir | `.weaver-llm` (`defaultLlmDataDir` / `createDefaultLlmEngine`) |

## Boundaries

- No combat/world/item invention
- No Electron imports in the library core — apps call the published API
- Consumers need `*.contract.test.ts` when they call this package

## Status

Implemented enough for install status, backend probe, install with progress, and `complete` chat. Default singleton `llmEngine` is used by Electron admin endpoint exercise. Next up: epic [019](../../board/backlog/019-LLMEngine-Text-Passthrough-API.md) reshapes `complete` into a plain `completeText({ prompt, context })` → text passthrough (no JSON/tool modes); epics [067](../../board/backlog/067-LLMEngine-Multi-Cloud-Provider-Adapters.md)/[068](../../board/backlog/068-LLMEngine-Usage-Metering.md) add Claude/OpenAI/Gemini/Grok/Player2 adapters and usage metering behind that same contract.

## Public API

```ts
import {
  llmEngine,
  createLlmEngine,
  createDefaultLlmEngine,
  DEFAULT_MODEL,
  resolvePreferredBackend
} from '@weaver/llm-engine'

await llmEngine.getStatus()
await llmEngine.resolveBackend()
await llmEngine.install((p) => { /* progress */ })
await llmEngine.complete({ messages: [{ role: 'user', content: 'Hi' }] })
await llmEngine.dispose()
```

| Export | Notes |
|--------|--------|
| `llmEngine` | Default singleton |
| `createLlmEngine` / `createDefaultLlmEngine` | Factories |
| `createNodeLlamaRuntime`, `probeVulkanWithNodeLlama` | Runtime wiring |
| `fetchDownloader`, `nodeFileStore`, `defaultLlmDataDir` | Node I/O helpers |
| `DEFAULT_MODEL`, `QWEN_2_5_7B_INSTRUCT_Q4_K_M` | Catalog |
| Types | `LlmEngineApi`, `LlmStatus`, `ChatRequest` / `ChatResponse`, etc. |

Admin-facing endpoints also include `health`, `getStatus`, `resolveBackend`, `install`, `complete` via `listEndpoints` / `call`.

## Scripts

```bash
npm test -- packages/LLMEngine
npm run build:engines
```
