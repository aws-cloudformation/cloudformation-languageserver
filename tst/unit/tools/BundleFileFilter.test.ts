import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

type ShouldCopyExternalFile = (
    relativePath: string,
    externalDependencies: readonly string[],
    platform: NodeJS.Platform,
    arch: string,
) => boolean;

const requireModule = createRequire(__filename);
const { shouldCopyExternalFile } = requireModule('../../../webpack.config.js') as {
    shouldCopyExternalFile: ShouldCopyExternalFile;
};

const externalDependencies = [
    '@opentelemetry/api',
    '@tree-sitter-grammars/tree-sitter-yaml',
    'msgpackr',
    'tree-sitter',
    'tree-sitter-json',
];

function shouldCopy(relativePath: string, platform: NodeJS.Platform = 'darwin', arch = 'arm64'): boolean {
    return shouldCopyExternalFile(relativePath, externalDependencies, platform, arch);
}

describe('Bundle file filter', () => {
    it('keeps runtime JavaScript and source maps', () => {
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/src/index.js')).toBe(true);
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/src/index.js.map')).toBe(true);
    });

    it('excludes alternate OpenTelemetry module builds', () => {
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/esm/index.js')).toBe(false);
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/esm/index.js.map')).toBe(false);
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/esnext/index.js')).toBe(false);
        expect(shouldCopy('/node_modules/@opentelemetry/api/build/esnext/index.js.map')).toBe(false);
    });

    it('keeps only tree-sitter prebuilds compatible with the bundle target', () => {
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-arm64/tree-sitter.node')).toBe(true);
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-x64/tree-sitter.node')).toBe(false);
        expect(
            shouldCopy('/node_modules/tree-sitter-json/prebuilds/linux-x64/tree-sitter-json.node', 'linux', 'x64'),
        ).toBe(true);
        expect(
            shouldCopy(
                '/node_modules/@tree-sitter-grammars/tree-sitter-yaml/prebuilds/win32-arm64/tree-sitter-yaml.node',
                'win32',
                'arm64',
            ),
        ).toBe(true);
    });

    it('supports universal prebuild directories containing the target architecture', () => {
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-x64+arm64/tree-sitter.node')).toBe(true);
    });

    it('excludes msgpackr build and test artifacts while retaining its runtime entry point', () => {
        expect(shouldCopy('/node_modules/msgpackr/dist/node.cjs')).toBe(true);
        expect(shouldCopy('/node_modules/msgpackr/dist/test.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/test.js.map')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/rollup.config.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/test-worker.js')).toBe(false);
    });

    it('retains existing extension and ignored-directory filtering', () => {
        expect(shouldCopy('/node_modules/msgpackr/package.json')).toBe(true);
        expect(shouldCopy('/node_modules/msgpackr/README.md')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/test/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/not-external/index.js')).toBe(false);
    });
});
