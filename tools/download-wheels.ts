#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, resolve } from 'path';

function downloadWheels(): void {
    const projectRoot = resolve(__dirname, '..');
    const wheelsDir = join(projectRoot, 'assets', 'wheels');

    if (!existsSync(wheelsDir)) {
        mkdirSync(wheelsDir, { recursive: true });
    }

    console.log(`Downloading wheels to: ${wheelsDir}`);

    try {
        execSync('python3 -m pip download --dest ' + wheelsDir + ' --only-binary=:all: cfn-lint', {
            stdio: 'inherit',
            cwd: projectRoot,
        });

        const pyodidePackages = ['pyyaml', 'regex', 'rpds_py', 'pydantic', 'pydantic_core'];

        const wheels = readdirSync(wheelsDir).filter((file) => file.endsWith('.whl'));
        let removedCount = 0;
        let platformSpecificCount = 0;

        for (const wheel of wheels) {
            const wheelPath = join(wheelsDir, wheel);

            const shouldRemove = pyodidePackages.some(
                (pkg) => wheel.startsWith(pkg) || wheel.startsWith(pkg.replace('_', '-')),
            );
            if (shouldRemove) {
                console.log(`Removing (already in Pyodide): ${wheel}`);
                unlinkSync(wheelPath);
                removedCount++;
                continue;
            }

            if (wheel.includes('macosx') || wheel.includes('win32') || wheel.includes('linux')) {
                console.warn(`⚠️  Platform-specific wheel detected: ${wheel}`);
                platformSpecificCount++;
            }
        }

        const finalWheels = readdirSync(wheelsDir).filter((file) => file.endsWith('.whl'));
        console.log(`Final wheel count: ${finalWheels.length} (removed ${removedCount} Pyodide packages)`);

        if (platformSpecificCount > 0) {
            console.warn(`⚠️  Found ${platformSpecificCount} platform-specific wheels that may not work in Pyodide`);
        }

        for (const wheel of finalWheels.sort()) {
            console.log(`  - ${wheel}`);
        }
    } catch (error) {
        console.error('Error downloading wheels:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    downloadWheels();
}
