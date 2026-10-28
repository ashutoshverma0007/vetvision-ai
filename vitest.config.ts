import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    environmentMatchGlobs: [
      ['apps/web/**', 'happy-dom']
    ],
    setupFiles: ['./apps/web/test/setup.ts'],
    include: [
      'tests/**/*.spec.ts',
      'apps/*/test/**/*.spec.ts',
      'apps/*/test/**/*.spec.tsx',
      'apps/web/src/**/*.spec.tsx'
    ]
  }
});
