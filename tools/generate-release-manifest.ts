#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { rcompare } from 'semver';

type GHRelease = {
    tag_name: string;
    assets: {
        name: string;
        url: string;
        size: number;
        digest?: string;
    }[];
};

type TargetContent = {
    filename: string;
    url: string;
    hashes: string[];
    bytes: number;
};

type Target = {
    platform: string;
    arch: string;
    nodejs?: string;
    contents: TargetContent[];
};

type Version = {
    serverVersion: string;
    latest: boolean;
    isDelisted: boolean;
    targets: Target[];
};

const ENVIRONMENTS = ['alpha', 'beta', 'prod'];
const RELEASES_PER_ENV = 2;

function getEnvFromTag(tag: string): string {
    for (const env of ENVIRONMENTS) {
        if (tag.includes(`-${env}`)) return env;
    }
    return 'prod';
}

function fetchReleases(): GHRelease[] {
    const output = execSync(
        'gh release list --repo aws-cloudformation/cloudformation-languageserver --limit 100 --json tagName',
        { encoding: 'utf8' },
    );
    const releases = JSON.parse(output);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return releases.map((r: any): GHRelease => {
        const assetsOutput = execSync(
            `gh api repos/aws-cloudformation/cloudformation-languageserver/releases/tags/${r.tagName}`,
            { encoding: 'utf8' },
        );
        const assetsData = JSON.parse(assetsOutput);

        return {
            tag_name: r.tagName,
            assets: assetsData.assets.map((a: any) => ({
                name: a.name,
                url: a.browser_download_url,
                size: a.size,
                digest: a.digest,
            })),
        };
    });
}

export function parseTarget(filename: string): { platform: string; arch: string; nodejs?: string } | null {
    // eslint-disable-next-line security/detect-unsafe-regex
    const match = filename.match(/^cloudformation-languageserver-(.*)-(.*)-(x64|arm64)(?:-node(\d+))?\.zip$/);
    return match ? { platform: match[2], arch: match[3], nodejs: match[4] } : null;
}

function generateManifest() {
    const releases = fetchReleases();
    const envReleases: Record<string, GHRelease[]> = {};

    for (const release of releases) {
        const env = getEnvFromTag(release.tag_name);
        if (env) {
            envReleases[env] = envReleases[env] || [];
            envReleases[env].push(release);
        }
    }

    for (const env of ENVIRONMENTS) {
        if (envReleases[env]) {
            envReleases[env].sort((a, b) => rcompare(a.tag_name, b.tag_name));
        }
    }

    const manifest: Record<string, any> = {
        manifestSchemaVersion: '1.0',
        artifactId: 'aws-cloudformation-languageserver',
        artifactDescription: 'AWS CloudFormation Language Server',
        isManifestDeprecated: false,
    };

    for (const env of ENVIRONMENTS) {
        const envVersions = envReleases[env]?.slice(0, RELEASES_PER_ENV) || [];
        const versions: Version[] = [];

        for (const [i, release] of envVersions.entries()) {
            const targets: Target[] = [];
            const targetMap = new Map<string, Target>();

            for (const asset of release.assets) {
                const target = parseTarget(asset.name);
                if (!target) continue;

                const key = `${target.platform}-${target.arch}-${target.nodejs ?? 'unknown'}`;
                if (!targetMap.has(key)) {
                    targetMap.set(key, { ...target, contents: [] });
                }

                targetMap.get(key)!.contents.push({
                    filename: asset.name,
                    url: asset.url,
                    hashes: asset.digest ? [asset.digest] : [],
                    bytes: asset.size,
                });
            }

            for (const target of targetMap.values()) {
                targets.push(target);
                if (target.platform === 'win32') {
                    targets.push({ ...target, platform: 'windows' });
                }
            }

            versions.push({
                serverVersion: release.tag_name.replace('v', ''),
                latest: i === 0,
                isDelisted: false,
                targets,
            });
        }

        manifest[env] = versions;
    }

    writeFileSync('assets/release-manifest.json', JSON.stringify(manifest, null, 2));
    console.log('Manifest generated: assets/release-manifest.json');
}

generateManifest();
