#!/usr/bin/env node

import { execSync } from 'child_process';
import {
    existsSync,
    mkdirSync,
    openSync,
    readFileSync,
    readSync,
    closeSync,
    readdirSync,
    rmSync,
    unlinkSync,
} from 'fs';
import { join, resolve } from 'path';

// Packages managed by Pyodide that need wasm32 wheels from the Pyodide CDN
// Note: ssl is excluded — it's a system shared library that must use loadPackage
const PYODIDE_PACKAGES = ['micropip', 'pyyaml', 'regex', 'rpds-py', 'pydantic', 'pydantic-core'];

function downloadWheels(): void {
    const projectRoot = resolve(__dirname, '..');
    const wheelsDir = join(projectRoot, 'assets', 'wheels');

    rmSync(wheelsDir, { recursive: true, force: true });
    mkdirSync(wheelsDir, { recursive: true });

    console.log(`Downloading wheels to: ${wheelsDir}`);

    try {
        // 1. Download cfn-lint and pure Python dependencies via pip
        execSync('python3 -m pip download --dest ' + wheelsDir + ' --only-binary=:all: cfn-lint', {
            stdio: 'inherit',
            cwd: projectRoot,
        });

        // 2. Remove host-platform wheels for Pyodide-managed packages (pip gets the wrong arch)
        const wheels = readdirSync(wheelsDir).filter((file) => file.endsWith('.whl'));
        let removedCount = 0;

        for (const wheel of wheels) {
            const shouldRemove = PYODIDE_PACKAGES.some((pkg) => {
                const normalized = pkg.replace('-', '_');
                return wheel.startsWith(normalized) || wheel.startsWith(pkg);
            });
            if (shouldRemove) {
                console.log(`Removing host-platform wheel: ${wheel}`);
                unlinkSync(join(wheelsDir, wheel));
                removedCount++;
            }
        }
        console.log(`Removed ${removedCount} host-platform wheels`);

        // 3. Download correct wasm32 wheels from Pyodide CDN for offline fallback
        const lockfilePath = join(projectRoot, 'node_modules', 'pyodide', 'pyodide-lock.json');
        if (existsSync(lockfilePath)) {
            const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'));
            const pyodidePkg = JSON.parse(
                readFileSync(join(projectRoot, 'node_modules', 'pyodide', 'package.json'), 'utf8'),
            );
            const pyodideVersion = pyodidePkg.version as string;
            const baseUrl = `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`;

            console.log(`Downloading wasm32 wheels from Pyodide CDN (v${pyodideVersion})...`);

            for (const pkg of PYODIDE_PACKAGES) {
                const pkgInfo = lockfile.packages?.[pkg];
                if (!pkgInfo) {
                    console.warn(`⚠️  Package ${pkg} not found in pyodide-lock.json`);
                    continue;
                }

                const fileName = pkgInfo.file_name;
                const destPath = join(wheelsDir, fileName);
                const url = `${baseUrl}${fileName}`;

                try {
                    console.log(`  Downloading: ${fileName}`);
                    execSync(`curl -sfL -o "${destPath}" "${url}"`, { stdio: 'inherit' });

                    // Verify it's a valid zip (wheels are zip files)
                    const header = Buffer.alloc(4);
                    const fd = openSync(destPath, 'r');
                    readSync(fd, header, 0, 4, 0);
                    closeSync(fd);
                    if (header[0] !== 0x50 || header[1] !== 0x4b) {
                        unlinkSync(destPath);
                        console.error(`  Downloaded file is not a valid wheel (bad magic bytes), removed: ${fileName}`);
                    }
                } catch (e) {
                    console.error(`  Failed to download ${fileName}: ${e}`);
                    if (existsSync(destPath)) unlinkSync(destPath);
                }
            }
        } else {
            console.warn('⚠️  pyodide-lock.json not found, skipping wasm32 wheel download');
        }

        // 4. Summary
        const finalWheels = readdirSync(wheelsDir).filter((file) => file.endsWith('.whl'));
        let platformSpecificCount = 0;
        for (const wheel of finalWheels) {
            if (
                (wheel.includes('macosx') || wheel.includes('win32') || wheel.includes('linux')) &&
                !wheel.includes('pyodide') &&
                !wheel.includes('wasm32')
            ) {
                console.warn(`⚠️  Platform-specific wheel detected: ${wheel}`);
                platformSpecificCount++;
            }
        }

        console.log(`Final wheel count: ${finalWheels.length}`);
        if (platformSpecificCount > 0) {
            console.warn(`⚠️  Found ${platformSpecificCount} platform-specific wheels that may not work in Pyodide`);
        }

        for (const wheel of finalWheels.toSorted()) {
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
