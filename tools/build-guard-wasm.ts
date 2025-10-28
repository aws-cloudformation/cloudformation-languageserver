#!/usr/bin/env node

/**
 * Script to build cfn-guard WASM module from source
 * This script clones the cfn-guard repository, checks out a specific tag,
 * builds the WASM module using the guard directory's existing build setup,
 * and copies the generated files to our assets directory
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, copyFileSync, writeFileSync, rmSync } from 'fs';
import { join } from 'path';
import * as readline from 'readline';

// Configuration
const GUARD_VERSION = '3.1.2'; // Version tag to checkout and build

// Directory structure:
// PROJECT_ROOT = /path/to/project (where package.json lives)
// TEMP_DIR = /path/to/project/tmp (temporary build directory)
// GUARD_REPO = /path/to/project/tmp/cloudformation-guard (cloned repo)
// ASSETS_DIR = /path/to/project/src/services/guard/assets/wasm (output)
const PROJECT_ROOT = join(__dirname, '..');
const TEMP_DIR = join(PROJECT_ROOT, 'tmp');
const GUARD_REPO = join(TEMP_DIR, 'cloudformation-guard');
const ASSETS_DIR = join(PROJECT_ROOT, 'src', 'services', 'guard', 'assets');

/**
 * Check if a command exists in the system PATH
 */
function commandExists(command: string): boolean {
    try {
        execSync(`command -v ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

/**
 * Execute a command and log it
 */
function execCommand(command: string, cwd?: string): void {
    console.log(`Executing: ${command}`);
    execSync(command, {
        stdio: 'inherit',
        cwd: cwd ?? process.cwd(),
    });
}

/**
 * Ask user for confirmation
 */
function askConfirmation(question: string): Promise<boolean> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(`${question} (y/N): `, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * Main build function
 */
async function buildGuardWasm(): Promise<void> {
    try {
        console.log('Building cfn-guard WASM module...');
        console.log(`Project root: ${PROJECT_ROOT}`);
        console.log(`Temporary directory: ${TEMP_DIR}`);
        console.log(`Output directory: ${ASSETS_DIR}`);

        if (!existsSync(TEMP_DIR)) {
            mkdirSync(TEMP_DIR, { recursive: true });
        }

        if (existsSync(GUARD_REPO)) {
            console.log('Updating cloudformation-guard repository...');
            execCommand('git fetch --all --tags', GUARD_REPO);
        } else {
            console.log('Cloning cloudformation-guard repository...');
            execCommand(`git clone https://github.com/aws-cloudformation/cloudformation-guard.git "${GUARD_REPO}"`);
        }

        console.log(`Checking out version ${GUARD_VERSION}...`);
        execCommand(`git checkout ${GUARD_VERSION}`, GUARD_REPO);

        const guardDir = join(GUARD_REPO, 'guard');

        if (!existsSync(guardDir)) {
            console.error(`Error: Guard directory not found at ${guardDir}`);
            console.error('The cloudformation-guard repository structure may have changed.');
            process.exit(1);
        }

        // Check if the guard directory has its own package.json with wasm-pack
        const guardPackageJson = join(guardDir, 'package.json');
        if (!existsSync(guardPackageJson)) {
            console.error(`Error: No package.json found in guard directory at ${guardPackageJson}`);
            console.error('The guard directory should contain its own build configuration.');
            process.exit(1);
        }

        if (!commandExists('npm')) {
            console.error('Error: npm is required but not installed.');
            process.exit(1);
        }

        console.log('Installing npm dependencies in guard directory...');
        execCommand('npm install', guardDir);

        console.log('Building WASM module using guard directory build setup...');
        execCommand('npm run build', guardDir);

        const tsLibDir = join(guardDir, 'ts-lib');
        const guardJs = join(tsLibDir, 'guard.js');
        const guardWasm = join(tsLibDir, 'guard_bg.wasm');
        const guardDts = join(tsLibDir, 'guard.d.ts');

        if (!existsSync(guardJs) || !existsSync(guardWasm)) {
            console.error('Error: WASM build failed - expected files not found');
            process.exit(1);
        }

        if (!existsSync(ASSETS_DIR)) {
            mkdirSync(ASSETS_DIR, { recursive: true });
        }

        console.log('Copying WASM files to assets directory...');
        copyFileSync(guardJs, join(ASSETS_DIR, 'guard.js'));
        copyFileSync(guardWasm, join(ASSETS_DIR, 'guard_bg.wasm'));

        if (existsSync(guardDts)) {
            copyFileSync(guardDts, join(ASSETS_DIR, 'guard.d.ts'));
        }
        const packageJson = {
            name: 'cfn-guard-wasm',
            version: GUARD_VERSION,
            description: 'CloudFormation Guard WASM module',
            main: 'guard.js',
            types: 'guard.d.ts',
            files: ['guard.js', 'guard_bg.wasm', 'guard.d.ts'],
        };

        writeFileSync(join(ASSETS_DIR, 'package.json'), JSON.stringify(packageJson, null, 2) + '\n');

        console.log('WASM module built successfully!');
        console.log(`Files copied to: ${ASSETS_DIR}`);

        const shouldCleanup = await askConfirmation('Remove temporary directory?');
        if (shouldCleanup) {
            rmSync(TEMP_DIR, { recursive: true, force: true });
            console.log('Temporary directory removed.');
        }

        console.log('Done!');
    } catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}

// Run the build if this script is executed directly
if (require.main === module) {
    buildGuardWasm().catch(console.error);
}

export { buildGuardWasm };
