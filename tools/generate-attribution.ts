import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

execSync('npm sbom --sbom-format spdx > sbom/sbom.json');
const sbomJson = JSON.parse(readFileSync(join(__dirname, '..', 'sbom', 'sbom.json'), 'utf8'));
const LspPackageName = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).name;

type SbomJsonPackage = {
    name: string;
    SPDXID: string;
    versionInfo: string;
    downloadLocation: string;
    licenseDeclared: string;
};

const packages = (sbomJson.packages as SbomJsonPackage[])
    .filter((pkg) => pkg.name !== LspPackageName)
    .sort((a, b) => a.name.localeCompare(b.name))
    // eslint-disable-next-line unicorn/no-array-reduce
    .reduce((unique, pkg) => {
        if (
            !unique.some(
                (p) =>
                    p.name === pkg.name &&
                    p.SPDXID === pkg.SPDXID &&
                    p.versionInfo === pkg.versionInfo &&
                    p.downloadLocation === pkg.downloadLocation &&
                    p.licenseDeclared === pkg.licenseDeclared,
            )
        ) {
            unique.push(pkg);
        }
        return unique;
    }, [] as SbomJsonPackage[]);

const header = 'Name,SPDXID,Version,DownloadLocation,License\n';
const rows = packages
    .map((pkg) =>
        [pkg.name, pkg.SPDXID, pkg.versionInfo, pkg.downloadLocation, pkg.licenseDeclared]
            .map((v) => `"${v}"`)
            .join(','),
    )
    .join('\n');

writeFileSync(join(__dirname, '..', 'sbom', 'sbom.csv'), header + rows);

execSync('generate-attribution', { cwd: join(__dirname, '..') });

const attribution = readFileSync(join(__dirname, '..', 'oss-attribution', 'attribution.txt'), 'utf8');
const sections = attribution.split('\n\n** ').slice(1);
const sorted = sections.sort((a, b) => {
    const nameA = a.split(';')[0];
    const nameB = b.split(';')[0];
    return nameA.localeCompare(nameB);
});
const header2 = attribution.split('\n\n** ')[0];
writeFileSync(join(__dirname, '..', 'THIRD-PARTY-LICENSES.txt'), header2 + '\n\n** ' + sorted.join('\n\n** '));
