import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'packages/*/src/**/*.test.ts',
      'packages/*/src/**/*.test.tsx',
      'scripts/**/*.test.mjs'
    ],
    environment: 'node',
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      // Product packages + unit-tested scripts. Electron wiring and CI shard/deadcode
      // CLIs stay out of the denominator (operational glue / separate workflows).
      all: false,
      include: ['packages/*/src/**/*.{ts,tsx}', 'scripts/**/*.mjs'],
      exclude: [
        '**/*.{test,spec}.{ts,tsx,mjs}',
        '**/*.d.ts',
        '**/main/index.ts',
        '**/preload/**',
        '**/renderer/**',
        '**/logger.ts',
        'scripts/deadcode-check.mjs',
        'scripts/deadcode-refresh.mjs',
        'scripts/discoverTestFiles.mjs',
        'scripts/merge-test-timings.mjs',
        'scripts/migrate.mjs',
        'scripts/run-test-shard.mjs',
        'scripts/test-plan-ci.mjs'
      ],
      reporter: ['text', 'json-summary'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
