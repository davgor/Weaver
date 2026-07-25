# 014 — Boot Weaver Admin via `npm run admin`

Rename the root admin bootstrap from `npm run dev` to `npm run admin` so the admin panel command matches the product name (parallel to `npm run ai-ttrpg` for the game client).

## Acceptance criteria

- [x] Root `preadmin` / `admin` run ensure-dev then launch `@weaver/electron-admin` (replaces `predev` / `dev`)
- [x] README and ensure-dev docs refer to `npm run admin` for the admin panel
- [x] A unit test locks the root package.json script wiring; `npm test` / `lint` / `build` / `deadcode` / `act` pass
