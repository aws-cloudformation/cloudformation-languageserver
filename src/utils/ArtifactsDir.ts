import { existsSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

const RELATIVE_ROOT_DIR = './.aws-cfn-storage';

/**
 * This will create artifacts in the directory where the app is executing
 * In our case this will be the [bundle] directory where the `cfn-lsp-app-standalone.js` file exists
 * @param artifactDir
 */
function getOrCreateAbsolutePath(artifactDir: string | undefined = undefined): string {
    const dir = resolve(__dirname);
    const path = join(dir, RELATIVE_ROOT_DIR, artifactDir ?? '.');

    if (existsSync(path)) {
        return path;
    }

    mkdirSync(path, { recursive: true });
    return path;
}

/**
 * Specify a subdirectory of the root artifacts directory, or undefined to create artifacts in root
 * @param artifactDir
 */
export function pathToArtifact(artifactDir: string | undefined = undefined): string {
    return getOrCreateAbsolutePath(artifactDir);
}
