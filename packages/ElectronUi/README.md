# @weaver/electron-ui

Shared renderer-safe presentation chrome for Weaver Electron games.

This package exports React components and pure helpers only. It does not import Electron main/preload
modules or any engine package; consumers wire IPC and local model callbacks themselves.

## JavaScript exports

```ts
import {
  BackendChoice,
  FirstRunIntroShell,
  LoadingScreen,
  LocalModelInstallPanel,
  TITLEBAR_DRAG_REGION_CLASS,
  TITLEBAR_NO_DRAG_CLASS,
  Titlebar,
  WindowControls,
  isBackendChoiceDisabled,
  selectBackend
} from '@weaver/electron-ui'
```

## CSS exports

Import styles from the consuming renderer entrypoint or stylesheet. Components intentionally do not
import CSS from TSX so the package can build with `tsc`.

```ts
import '@weaver/electron-ui/theme.css'
import '@weaver/electron-ui/loading.css'
import '@weaver/electron-ui/titlebar.css'
import '@weaver/electron-ui/localModel.css'
import '@weaver/electron-ui/intro.css'
```

## Titlebar drag regions

`Titlebar` places brand content in `TITLEBAR_DRAG_REGION_CLASS` (`titlebar-drag-region`) and the
controls in `TITLEBAR_NO_DRAG_CLASS` (`titlebar-no-drag`). Consumers composing custom titlebar
content can reuse those constants so Electron frameless windows keep the expected drag/no-drag
regions.
