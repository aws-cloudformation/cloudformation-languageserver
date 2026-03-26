import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    testTimeout: 6 * 60 * 60 * 1000,
    hookTimeout: 60 * 1000,
    coverage: {
      enabled: false, // Disable coverage for performance tests
    },
    pool: 'forks',
    logHeapUsage: true,
    reporters: ['verbose'],
    include: ['tst/long-running/**/*.test.ts'],
    setupFiles: ['tst/long-running/setup.ts'],
  },
});
