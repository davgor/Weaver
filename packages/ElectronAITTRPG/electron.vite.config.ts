import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'

const DEV_SERVER_ORIGIN = 'http://localhost:5173'
const DEV_SERVER_WS_ORIGIN = 'ws://localhost:5173'

const PROD_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "connect-src 'self'",
  "img-src 'self' data: file:",
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

const DEV_CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${DEV_SERVER_ORIGIN} ${DEV_SERVER_WS_ORIGIN}`,
  `style-src 'self' 'unsafe-inline'`,
  `connect-src 'self' ${DEV_SERVER_ORIGIN} ${DEV_SERVER_WS_ORIGIN}`,
  "img-src 'self' data: file:",
  "object-src 'none'",
  "base-uri 'none'"
].join('; ')

function cspPlugin(isDev: boolean): Plugin {
  return {
    name: 'inject-csp',
    transformIndexHtml(html) {
      return html.replace('%CSP%', isDev ? DEV_CSP : PROD_CSP)
    }
  }
}

export default defineConfig(({ command }) => {
  const isDev = command === 'serve'
  return {
    main: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve('src/main/index.ts')
          }
        }
      }
    },
    preload: {
      plugins: [externalizeDepsPlugin()],
      build: {
        rollupOptions: {
          input: {
            index: resolve('src/preload/index.ts')
          },
          output: {
            format: 'cjs',
            entryFileNames: '[name].js'
          }
        }
      }
    },
    renderer: {
      root: resolve('src/renderer'),
      build: {
        rollupOptions: {
          input: {
            index: resolve('src/renderer/index.html')
          }
        }
      },
      plugins: [react(), cspPlugin(isDev)]
    }
  }
})
