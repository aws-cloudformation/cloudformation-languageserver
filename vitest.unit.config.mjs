import { defineConfig } from 'vitest/config';
import baseConfig from './vitest.config.mjs';

export default defineConfig({
    ...baseConfig,
    test: {
        ...baseConfig.test,
        include: ['tst/unit/**/*.test.ts'],
    },
});
