import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tst/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/out/**'],
    coverage: {
      provider: 'v8',
      reporter: ['cobertura', 'html', 'text'],
      include: ['src/**/*.{js,ts}'],
      enabled: true,
    },
    pool: 'forks', // Run tests in separate processes for better isolation
    isolate: true, // Ensure each test file runs in isolation
    testTimeout: 30000, // Increase timeout for longer-running tests
  },
});
