import { existsSync, readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Parser from 'web-tree-sitter';

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
}));
vi.mock('web-tree-sitter', () => ({
    default: {
        init: vi.fn(),
        Language: {
            load: vi.fn(),
        },
    },
}));
vi.mock('path', () => ({
    join: vi.fn((...args) => args.join('/')),
}));
vi.mock('../../../src/telemetry/LoggerFactory', () => ({
    LoggerFactory: {
        getLogger: vi.fn(() => ({
            info: vi.fn(),
            error: vi.fn(),
            warn: vi.fn(),
            debug: vi.fn(),
            trace: vi.fn(),
        })),
    },
}));

describe('ParserFactory', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
        vi.clearAllMocks();
        originalEnv = process.env.CLOUDFORMATIONLSP_USE_WASM;

        const mockLanguage = { name: 'test-language' } as any;
        vi.mocked(Parser.init).mockResolvedValue(undefined);
        vi.mocked(Parser.Language.load).mockResolvedValue(mockLanguage);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(Buffer.from('mock-wasm'));
    });

    afterEach(() => {
        if (originalEnv === undefined) {
            delete process.env.CLOUDFORMATIONLSP_USE_WASM;
        } else {
            process.env.CLOUDFORMATIONLSP_USE_WASM = originalEnv;
        }
        vi.resetModules();
    });

    describe('environment detection', () => {
        it('should use native parser by default', async () => {
            delete process.env.CLOUDFORMATIONLSP_USE_WASM;

            const { parserFactory } = await import('../../../src/parser/ParserFactory');

            const yamlParser = parserFactory.createYamlParser();
            const jsonParser = parserFactory.createJsonParser();

            expect(yamlParser).toBeDefined();
            expect(jsonParser).toBeDefined();
        });

        it('should use WASM parser when environment variable is set', async () => {
            process.env.CLOUDFORMATIONLSP_USE_WASM = 'true';

            const { parserFactory } = await import('../../../src/parser/ParserFactory');

            expect(parserFactory).toBeDefined();
            expect(parserFactory.initialize).toBeDefined();
        });
    });

    describe('native parser with fallback', () => {
        it('should create YAML parser', async () => {
            delete process.env.CLOUDFORMATIONLSP_USE_WASM;

            const { parserFactory } = await import('../../../src/parser/ParserFactory');
            const parser = parserFactory.createYamlParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });

        it('should create JSON parser', async () => {
            delete process.env.CLOUDFORMATIONLSP_USE_WASM;

            const { parserFactory } = await import('../../../src/parser/ParserFactory');
            const parser = parserFactory.createJsonParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });
    });
});
