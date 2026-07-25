# EPIC: ElectronAITTRPG game UI package

Stand up `packages/ElectronAITTRPG` (`@weaver/electron-aittrpg`) as the AI-TTRPG game client in this monorepo. Mirror the **UI and icons** from [AI-DND-Matrix](https://github.com/davgor/AI-DND-Matrix) (frameless chrome, theme, brand mark, empty campaign shell) while depending on Weaver engine packages for future play logic. ElectronEngine remains the DEV admin panel.

## Acceptance criteria

- [x] `packages/ElectronAITTRPG` exists as a workspace package with electron-vite main/preload/renderer layout
- [x] App icons (`build/icon.ico`, `build/icon.png`) and in-app brand mark match AI-DND-Matrix assets
- [x] Product display name is `AI-TTRPG`; theme/titlebar/sidebar empty shell visually mirrors Matrix chrome
- [x] Package depends on Weaver engine workspaces (`@weaver/*-engine`) for reuse
- [x] Unit tests cover branding constants and icon path helpers (TDD); `npm test` / `lint` / `build` / `deadcode` / `act` pass
- [x] README documents the game package vs admin (`ElectronEngine`); `npm run dev:aittrpg` launches the game UI
