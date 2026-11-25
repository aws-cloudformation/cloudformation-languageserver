import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';

type ShouldCopyExternalFile = (
    relativePath: string,
    externalDependencies: readonly string[],
    platform: NodeJS.Platform,
) => boolean;

const requireModule = createRequire(__filename);
const { shouldCopyExternalFile } = requireModule('../../../webpack.config.js') as {
    shouldCopyExternalFile: ShouldCopyExternalFile;
};

const externalDependencies = [
    '@opentelemetry/api',
    '@standard-schema/spec',
    '@tree-sitter-grammars/tree-sitter-yaml',
    'example',
    'msgpackr',
    'tree-sitter',
    'tree-sitter-json',
];

function shouldCopy(relativePath: string, platform: NodeJS.Platform = 'darwin'): boolean {
    return shouldCopyExternalFile(relativePath, externalDependencies, platform);
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

    it('keeps tree-sitter prebuilds for the bundle platform across architectures', () => {
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-arm64/tree-sitter.node')).toBe(true);
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-x64/tree-sitter.node')).toBe(true);
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/linux-arm64/tree-sitter.node')).toBe(false);
        expect(shouldCopy('/node_modules/tree-sitter-json/prebuilds/linux-x64/tree-sitter-json.node', 'linux')).toBe(
            true,
        );
        expect(
            shouldCopy(
                '/node_modules/@tree-sitter-grammars/tree-sitter-yaml/prebuilds/win32-arm64/tree-sitter-yaml.node',
                'win32',
            ),
        ).toBe(true);
    });

    it('supports universal prebuild directories for the bundle platform', () => {
        expect(shouldCopy('/node_modules/tree-sitter/prebuilds/darwin-x64+arm64/tree-sitter.node')).toBe(true);
    });

    it('keeps runtime files when package names resemble ignored directories', () => {
        expect(shouldCopy('/node_modules/@standard-schema/spec/dist/index.js')).toBe(true);
        expect(shouldCopy('/node_modules/example/dist/index.js')).toBe(true);
    });

    it('excludes conventional test and spec directories', () => {
        expect(shouldCopy('/node_modules/msgpackr/test/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/tests/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/__tests__/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/spec/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/__specs__/fixture.js')).toBe(false);
    });

    it('excludes conventional test and spec file names without matching runtime names', () => {
        expect(shouldCopy('/node_modules/msgpackr/dist/test.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/test.js.map')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/test-worker.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/pack.test.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/pack.tests.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/pack.spec.cjs')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/specs.js')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/dist/contest.js')).toBe(true);
        expect(shouldCopy('/node_modules/msgpackr/dist/latest.js')).toBe(true);
    });

    it('excludes msgpackr build artifacts while retaining its runtime entry point', () => {
        expect(shouldCopy('/node_modules/msgpackr/dist/node.cjs')).toBe(true);
        expect(shouldCopy('/node_modules/msgpackr/rollup.config.js')).toBe(false);
    });

    it('retains existing extension and ignored-directory filtering', () => {
        expect(shouldCopy('/node_modules/msgpackr/package.json')).toBe(true);
        expect(shouldCopy('/node_modules/msgpackr/README.md')).toBe(false);
        expect(shouldCopy('/node_modules/msgpackr/test/fixture.js')).toBe(false);
        expect(shouldCopy('/node_modules/not-external/index.js')).toBe(false);
    });
});
