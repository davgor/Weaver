# NarrationEngine (`@weaver/narration-engine`)

LLM story and visual-token invention **validated** against peer engine data.

## Role

The **only** package allowed to invent narrative prose or generated portrait tokens. Before accepting story claims or portrait prompts, it must check them against world, items, NPCs, enemies, combat (and related) facts from peer engines.

## Boundaries

- May use **LLMEngine** for generation (via orchestration paths owned with DMEngine)
- Owns provider-agnostic NPC/enemy/companion/PC portrait generation rails
- Must **not** invent durable game facts — peers own those
- Must **not** contain Electron UI
- Consumers need `*.contract.test.ts` against the real API

## Status

Exposes `health`, `describeRole`, `generatePortrait`, and `setManualPortrait`. Portrait generation is provider-agnostic (`cloud`, `player2`, `local`), asynchronous, campaign-flag gated, and degrades to `imagePath: null` on disabled generation, invalid subject facts, missing providers, or provider failure.

## Public API

```ts
import { createLocalImageProvider, narrationEngine } from '@weaver/narration-engine'

narrationEngine.health()
await narrationEngine.call('describeRole')
// → { inventsStories: true, inventsVisualTokens: true, validatesAgainst: [...], ... }

await narrationEngine.generatePortrait(
  {
    subjectKind: 'npc',
    subjectId: 'npc-1',
    prompt: 'heroic face token',
    settings: { provider: 'local', generativeTokensEnabled: true },
    subjectFacts: { race: 'elf', description: 'silver-haired scout' }
  },
  { providers: { local: createLocalImageProvider({ runtime }) } }
)

await narrationEngine.setManualPortrait('pc-1', '/uploads/pc-1.png')
```

| Export | Notes |
|--------|--------|
| `narrationEngine` | Singleton `NarrationEngineApi` |
| `generatePortrait` | Shared NPC/enemy/companion/PC generation path |
| `setManualPortrait` | Upload/replace PC portrait alternative to generation |
| `createCloudImageProvider` / `createPlayer2ImageProvider` | Remote-provider adapters with injectable `fetch` |
| `createLocalImageProvider` | Local-runtime adapter with injectable image runtime |
| `buildPortraitPrompt` / `validatePortraitSubject` | Fact-grounded prompt building and lightweight validation hooks |
| `NarrationEngineApi` / `EngineEndpoint` / image types | Types |

No combat damage or item creation happens here except by proposing changes that other engines apply after validating them.

## Scripts

```bash
npm test -- packages/NarrationEngine
npm run build:engines
```
