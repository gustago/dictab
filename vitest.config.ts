import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/**/*.d.ts'],
      thresholds: {
        lines: 100,
        functions: 100,
        statements: 100,
        branches: 95,
      },
    },
  },
});
