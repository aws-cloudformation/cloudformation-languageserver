#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, rmSync, mkdirSync, cpSync } from 'fs';
import { join, resolve } from 'path';

const COMMIT_HASH = '33d9931';
const TEMP_DIR = 'temp-cfn-guard';
const OUTPUT_DIR = 'vendor/cfn-guard';

function buildCfnGuard(): void {
    const projectRoot = resolve(__dirname, '..');
    const tempPath = join(projectRoot, TEMP_DIR);
    const outputPath = join(projectRoot, OUTPUT_DIR);

    console.log('Building cfn-guard from commit', COMMIT_HASH);

    // Clean up previous builds
    if (existsSync(tempPath)) {
        rmSync(tempPath, { recursive: true, force: true });
    }
    if (existsSync(outputPath)) {
        rmSync(outputPath, { recursive: true, force: true });
    }

    try {
        // Clone and checkout specific commit
        console.log('Cloning cloudformation-guard repository...');
        execSync(`git clone https://github.com/aws-cloudformation/cloudformation-guard.git ${TEMP_DIR}`, {
            stdio: 'inherit',
            cwd: projectRoot,
        });

        console.log(`Checking out commit ${COMMIT_HASH}...`);
        execSync(`git checkout ${COMMIT_HASH}`, {
            stdio: 'inherit',
            cwd: tempPath,
        });

        // Copy ts-lib files to vendor directory (files are pre-built)
        const tsLibPath = join(tempPath, 'guard', 'ts-lib');
        console.log(`Copying ts-lib files to ${OUTPUT_DIR}...`);
        mkdirSync(outputPath, { recursive: true });

        cpSync(tsLibPath, outputPath, { recursive: true });

        console.log(`cfn-guard copied to ${OUTPUT_DIR}`);
    } catch (error) {
        console.error('Error building cfn-guard:', error);
        process.exit(1);
    } finally {
        // Clean up temp directory
        if (existsSync(tempPath)) {
            rmSync(tempPath, { recursive: true, force: true });
        }
    }
}

if (require.main === module) {
    buildCfnGuard();
}
