import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
      // pavimento anti-regressione (misurato 100/94/100/100 il 4 ago 2026)
      thresholds: {
        statements: 98,
        branches: 92,
        functions: 98,
        lines: 98,
      },
    },
  },
})
