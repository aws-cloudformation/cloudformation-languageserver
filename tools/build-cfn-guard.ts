#!/usr/bin/env node

import { execFileSync } from 'child_process';
import { createHash } from 'crypto';
import { cpSync, createWriteStream, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { basename, dirname, join, resolve } from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import axios from 'axios';

const GITHUB_REPOSITORY = 'aws-cloudformation/cloudformation-guard';
const LATEST_RELEASE_URL = `https://api.github.com/repos/${GITHUB_REPOSITORY}/releases/latest`;
const OUTPUT_DIR = 'vendor/cfn-guard';
const EXCLUDED_OUTPUT_ENTRY_NAMES = new Set(['README.md', '__tests__']);
const REQUIRED_PACKAGE_FILES = ['guard_bg.wasm', 'guard.d.ts', 'guard.js', 'index.d.ts', 'index.js', 'package.json'];
const STABLE_VERSION_PATTERN = /^v?([0-9]+\.[0-9]+\.[0-9]+)$/;
const SHA256_DIGEST_PATTERN = /^sha256:([0-9a-f]{64})$/;

interface GitHubReleaseAsset {
    name: string;
    url: string;
    digest: string | null;
}

interface GitHubRelease {
    tag_name: string;
    draft: boolean;
    prerelease: boolean;
    assets: GitHubReleaseAsset[];
}

interface GuardReleaseAsset {
    tag: string;
    version: string;
    name: string;
    url: string;
    sha256: string;
}

function githubHeaders(accept: string): Record<string, string> {
    const headers: Record<string, string> = {
        Accept: accept,
        'User-Agent': 'cloudformation-languageserver-maintenance',
        'X-GitHub-Api-Version': '2022-11-28',
    };
    const token = process.env.GH_TOKEN;
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }
    return headers;
}

// eslint-disable-next-line unicorn/no-exports-in-scripts
export function parseGuardRelease(release: GitHubRelease): GuardReleaseAsset {
    if (release.draft || release.prerelease) {
        throw new Error(`Latest cfn-guard release ${release.tag_name} is not a published stable release.`);
    }

    const versionMatch = STABLE_VERSION_PATTERN.exec(release.tag_name);
    if (!versionMatch) {
        throw new Error(`Latest cfn-guard release is not a stable version tag: ${release.tag_name}`);
    }

    const version = versionMatch[1];
    const assetName = `cfn-guard-ts-lib-${version}.tgz`;
    const matchingAssets = release.assets.filter((asset) => asset.name === assetName);
    if (matchingAssets.length !== 1) {
        throw new Error(`Expected exactly one ${assetName} asset, found ${matchingAssets.length}.`);
    }

    const asset = matchingAssets[0];
    const digestMatch = asset.digest ? SHA256_DIGEST_PATTERN.exec(asset.digest) : undefined;
    if (!digestMatch) {
        throw new Error(`Release asset ${assetName} does not have a valid SHA-256 digest.`);
    }

    const expectedAssetUrlPattern = new RegExp(
        `^https://api\\.github\\.com/repos/${GITHUB_REPOSITORY}/releases/assets/[0-9]+$`,
    );
    if (!expectedAssetUrlPattern.test(asset.url)) {
        throw new Error(`Release asset ${assetName} has an unexpected download URL.`);
    }

    return {
        tag: release.tag_name,
        version,
        name: assetName,
        url: asset.url,
        sha256: digestMatch[1],
    };
}

function verifySha256(content: Buffer, expectedSha256: string): void {
    const actualSha256 = createHash('sha256').update(content).digest('hex');
    if (actualSha256 !== expectedSha256) {
        throw new Error(
            `Downloaded cfn-guard asset SHA-256 mismatch: expected ${expectedSha256}, got ${actualSha256}.`,
        );
    }
}

function readPackageVersion(packagePath: string): string {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: unknown };
    if (typeof packageJson.version !== 'string' || !STABLE_VERSION_PATTERN.test(packageJson.version)) {
        throw new Error(`Unable to read a stable cfn-guard version from ${packagePath}.`);
    }
    return packageJson.version.replace(/^v/, '');
}

async function fetchLatestRelease(): Promise<GitHubRelease> {
    const response = await axios.get<GitHubRelease>(LATEST_RELEASE_URL, {
        headers: githubHeaders('application/vnd.github+json'),
    });
    return response.data;
}

async function downloadReleaseAsset(asset: GuardReleaseAsset, outputPath: string): Promise<void> {
    const response = await axios.get<Readable>(asset.url, {
        headers: githubHeaders('application/octet-stream'),
        maxRedirects: 5,
        responseType: 'stream',
    });
    await pipeline(response.data, createWriteStream(outputPath));
}

function npmExecutable(): string {
    return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function extractNpmPackage(archivePath: string, installPath: string): string {
    execFileSync(
        npmExecutable(),
        [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            '--no-package-lock',
            '--prefix',
            installPath,
            archivePath,
        ],
        { stdio: 'inherit' },
    );
    return join(installPath, 'node_modules', 'cfn-guard');
}

function stageVendorPackage(sourcePath: string, stagingPath: string, expectedVersion: string): void {
    rmSync(stagingPath, { recursive: true, force: true });
    cpSync(sourcePath, stagingPath, {
        recursive: true,
        filter: (sourceEntryPath) => !EXCLUDED_OUTPUT_ENTRY_NAMES.has(basename(sourceEntryPath)),
    });

    const downloadedVersion = readPackageVersion(join(stagingPath, 'package.json'));
    if (downloadedVersion !== expectedVersion) {
        throw new Error(`Downloaded cfn-guard version ${downloadedVersion} does not match release ${expectedVersion}.`);
    }

    for (const requiredFile of REQUIRED_PACKAGE_FILES) {
        if (!existsSync(join(stagingPath, requiredFile))) {
            throw new Error(`Downloaded cfn-guard package is missing ${requiredFile}.`);
        }
    }
}

function updatePackageLock(projectRoot: string): void {
    execFileSync(npmExecutable(), ['install', '--package-lock-only', '--ignore-scripts', '--no-audit', '--no-fund'], {
        cwd: projectRoot,
        stdio: 'inherit',
    });
}

function replaceVendorPackage(projectRoot: string, stagingPath: string, temporaryPath: string): void {
    const outputPath = join(projectRoot, OUTPUT_DIR);
    const backupPath = join(dirname(outputPath), '.cfn-guard-backup');
    const packageLockPath = join(projectRoot, 'package-lock.json');
    const packageLockBackupPath = join(temporaryPath, 'package-lock.json');
    const hadExistingPackage = existsSync(outputPath);

    rmSync(backupPath, { recursive: true, force: true });
    cpSync(packageLockPath, packageLockBackupPath);

    if (hadExistingPackage) {
        renameSync(outputPath, backupPath);
    }

    try {
        renameSync(stagingPath, outputPath);
        updatePackageLock(projectRoot);
        rmSync(backupPath, { recursive: true, force: true });
    } catch (error) {
        rmSync(outputPath, { recursive: true, force: true });
        if (hadExistingPackage) {
            renameSync(backupPath, outputPath);
        }
        cpSync(packageLockBackupPath, packageLockPath);
        throw error;
    }
}

async function updateCfnGuard(): Promise<void> {
    const projectRoot = resolve(__dirname, '..');
    const outputPath = join(projectRoot, OUTPUT_DIR);
    const currentVersion = readPackageVersion(join(outputPath, 'package.json'));
    const releaseAsset = parseGuardRelease(await fetchLatestRelease());

    if (currentVersion === releaseAsset.version) {
        console.log(`cfn-guard is already current at ${releaseAsset.tag}.`);
        return;
    }

    const temporaryPath = mkdtempSync(join(tmpdir(), 'cfn-guard-'));
    const archivePath = join(temporaryPath, releaseAsset.name);
    const installPath = join(temporaryPath, 'install');
    const stagingPath = join(dirname(outputPath), '.cfn-guard-next');

    try {
        console.log(`Downloading cfn-guard TypeScript library ${releaseAsset.version}...`);
        await downloadReleaseAsset(releaseAsset, archivePath);
        verifySha256(readFileSync(archivePath), releaseAsset.sha256);

        mkdirSync(installPath, { recursive: true });
        const extractedPackagePath = extractNpmPackage(archivePath, installPath);
        stageVendorPackage(extractedPackagePath, stagingPath, releaseAsset.version);
        replaceVendorPackage(projectRoot, stagingPath, temporaryPath);
        console.log(`Updated cfn-guard from ${currentVersion} to ${releaseAsset.version}.`);
    } finally {
        rmSync(stagingPath, { recursive: true, force: true });
        rmSync(temporaryPath, { recursive: true, force: true });
    }
}

if (require.main === module) {
    updateCfnGuard().catch((error: unknown) => {
        console.error('Failed to update cfn-guard:', error);
        process.exitCode = 1;
    });
}
