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
                statements: 88,
                branches: 82,
                functions: 90,
                lines: 88,
            },
            exclude: [
                'src/services/cfnLint/pyodide-worker.ts',
                'src/telemetry/OTELInstrumentation.ts',
                'src/telemetry/TelemetryService.ts',
                'src/services/guard/assets/**',
            ],
        },
        isolate: true, // Ensure each test file runs in isolation
        maxWorkers: 4,
        execArgv: ['--max-old-space-size=4096'],
        testTimeout: 30000, // Increase timeout for longer-running tests
    },
});
