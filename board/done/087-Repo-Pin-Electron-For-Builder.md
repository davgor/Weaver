# EPIC: Pin Electron version for electron-builder packaging

Deploy `package:win` fails because both Electron app packages declare `"electron": "^42.6.0"`. electron-builder requires an exact Electron version to download platform binaries and refuses to resolve a range from `package.json`.

## Acceptance criteria

- [x] `@weaver/electron-aittrpg` and `@weaver/electron-admin` declare an exact (non-range) `electron` version in `devDependencies`
- [x] A unit test asserts both Electron packages keep `electron` pinned exactly (no `^` / `~` / `*` / `x`)
- [x] `npm test`, `npm run lint`, `npm run build`, `npm run deadcode`, and `npm run ci:act` pass
