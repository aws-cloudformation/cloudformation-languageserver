import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('wheel download utility', () => {
    const testWheelsDir = join(process.cwd(), 'node_modules', '.cache', 'test-wheels');

    beforeEach(() => {
        if (existsSync(testWheelsDir)) {
            rmSync(testWheelsDir, { recursive: true, force: true });
        }
        mkdirSync(testWheelsDir, { recursive: true });
    });

    afterEach(() => {
        if (existsSync(testWheelsDir)) {
            rmSync(testWheelsDir, { recursive: true, force: true });
        }
    });

    it('should download cfn-lint and dependencies', () => {
        execSync(`python3 -m pip download --dest ${testWheelsDir} --only-binary=:all: cfn-lint`, {
            stdio: 'pipe',
        });

        const wheels = readdirSync(testWheelsDir).filter((file) => file.endsWith('.whl'));
        expect(wheels.length).toBeGreaterThan(0);

        const cfnLintWheels = wheels.filter((wheel) => wheel.startsWith('cfn_lint-'));
        expect(cfnLintWheels.length).toBe(1);
    });

    it('should identify Pyodide packages for exclusion', () => {
        execSync(`python3 -m pip download --dest ${testWheelsDir} --only-binary=:all: cfn-lint`, {
            stdio: 'pipe',
        });

        const wheels = readdirSync(testWheelsDir).filter((file) => file.endsWith('.whl'));
        const pyodidePackages = ['pyyaml', 'regex', 'rpds_py', 'pydantic', 'pydantic_core'];

        const foundPyodidePackages = wheels.filter((wheel) =>
            pyodidePackages.some((pkg) => wheel.startsWith(pkg) || wheel.startsWith(pkg.replace('_', '-'))),
        );

        expect(foundPyodidePackages.length).toBeGreaterThan(0);
    });
});
