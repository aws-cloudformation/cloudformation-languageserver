import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tst/**/*.test.ts'],
        exclude: ['**/node_modules/**', '**/out/**'],
        setupFiles: ['tst/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['cobertura', 'html', 'text'],
            include: ['src/**/*.{js,ts}'],
            enabled: true,
            thresholds: {
                statements: 85,
                branches: 85,
                functions: 85,
                lines: 85,
            },
            exclude: [
                'src/ai/**',
                'src/services/cfnLint/pyodide-worker.ts',
                'src/telemetry/OTELInstrumentation.ts',
                'src/telemetry/TelemetryService.ts',
                'src/services/guard/assets/**',
            ],
        },
        pool: 'forks', // Run tests in separate processes for better isolation
        isolate: true, // Ensure each test file runs in isolation
        testTimeout: 30000, // Increase timeout for longer-running tests
    },
});
