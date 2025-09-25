import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config';

export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['tst/integration/**/*.test.ts', 'tst/e2e/**/*.test.ts'],
  },
});
