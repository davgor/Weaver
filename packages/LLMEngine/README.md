# LLMEngine (`@weaver/llm-engine`)

Local LLM runtime controller for Weaver.

## Role

Owns model install lifecycle and raw text passthrough completion against a pinned local model. Electron UIs prompt download/status; **NarrationEngine** / **DMEngine** build prompts and consume raw text for invention and orchestration. This package does **not** invent game facts, parse structured output, call tools, or own campaign rules.

## Model & backend

| Setting | Value |
|---------|--------|
| Default model | Qwen2.5 7B Instruct, Q4_K_M (`QWEN_2_5_7B_INSTRUCT_Q4_K_M` / `DEFAULT_MODEL`) |
| Preferred backend | Vulkan, then CPU fallback (`resolvePreferredBackend`) |
| Runtime | `node-llama-cpp` (optional dependency) via `createNodeLlamaRuntime` |
| Default data dir | `.weaver-llm` (`defaultLlmDataDir` / `createDefaultLlmEngine`) |

## Boundaries

- No combat/world/item invention
- No JSON/schema/tool/function-calling modes in the public generation contract
- No Electron imports in the library core — apps call the published API
- Consumers need `*.contract.test.ts` when they call this package

## Generation contract

`completeText` is the core generation API:

```ts
await llmEngine.completeText({
  prompt: 'Continue the scene in one paragraph.',
  context: 'Validated world/NPC/combat facts supplied by the caller.',
  maxTokens: 160
})
// => { text: string, backend: 'vulkan' | 'cpu' }
```

Callers own all prompt construction and any parsing, validation, retry, or multi-step orchestration. **NarrationEngine** is responsible for story prose invention and validation against peer engine data. **DMEngine** is responsible for any "LLM chose an API call" loop by combining `completeText` responses with real peer engine APIs. Deterministic engines do not call LLMEngine.

## Status

Implemented enough for install status, backend probe, install with progress, and `completeText` raw text passthrough. Default singleton `llmEngine` is used by Electron admin endpoint exercise. Epics [067](../../board/backlog/067-LLMEngine-Multi-Cloud-Provider-Adapters.md)/[068](../../board/backlog/068-LLMEngine-Usage-Metering.md) add Claude/OpenAI/Gemini/Grok/Player2 adapters and usage metering behind that same contract.

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
await llmEngine.completeText({ prompt: 'Hi' })
await llmEngine.dispose()
```

| Export | Notes |
|--------|--------|
| `llmEngine` | Default singleton |
| `createLlmEngine` / `createDefaultLlmEngine` | Factories |
| `createNodeLlamaRuntime`, `probeVulkanWithNodeLlama` | Runtime wiring |
| `fetchDownloader`, `nodeFileStore`, `defaultLlmDataDir` | Node I/O helpers |
| `DEFAULT_MODEL`, `QWEN_2_5_7B_INSTRUCT_Q4_K_M` | Catalog |
| Types | `LlmEngineApi`, `LlmStatus`, `TextRequest` / `TextResponse`, etc. |

Admin-facing endpoints also include `health`, `getStatus`, `resolveBackend`, `install`, `completeText` via `listEndpoints` / `call`.

`complete` / `ChatRequest` remain only as a deprecated compatibility wrapper that maps system messages to `context` and the latest user message to `prompt`.

## Future consumer contract tests

When these packages first call LLMEngine, add consumer contract tests in the consumer package against the real `@weaver/llm-engine` public export:

- `packages/NarrationEngine/src/contracts/llmEngine.contract.test.ts` — pin import path, `completeText({ prompt, context? })`, raw `{ text, backend }`, and installed-gate assumptions used by narration.
- `packages/DMEngine/src/contracts/llmEngine.contract.test.ts` — pin the same passthrough contract for DM orchestration loops, with no expectation that LLMEngine emits tool calls or engine-call envelopes.

Those tests belong with the future consumers, not in LLMEngine, and should arrive with the actual NarrationEngine / DMEngine call sites.

## Scripts

```bash
npm test -- packages/LLMEngine
npm run build:engines
```
