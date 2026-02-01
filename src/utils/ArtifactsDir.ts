import { resolve, join } from 'path';

const RELATIVE_ROOT_DIR = '.aws-cfn-storage';

/**
 * This will create artifacts in the directory where the app is executing
 * In our case this will be the [bundle] directory where the `cfn-lsp-app-standalone.js` file exists
 * @param artifactDir
 */
function getAbsolutePath(artifactDir: string | undefined = undefined): string {
    const dir = resolve(__dirname);
    let path: string;
    if (artifactDir) {
        path = join(dir, RELATIVE_ROOT_DIR, artifactDir);
    } else {
        path = join(dir, RELATIVE_ROOT_DIR);
    }

    return path;
}

export function legacyPathToArtifact(artifactDir: string | undefined = undefined): string {
    return getAbsolutePath(artifactDir);
}
