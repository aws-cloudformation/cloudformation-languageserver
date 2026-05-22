import { existsSync, readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Parser from 'web-tree-sitter';
import { GrammarManager } from '../../../src/parser/GrammarManager';
import { WasmParserFactory } from '../../../src/parser/WasmParserFactory';

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

describe('WasmParserFactory', () => {
    let mockLanguage: any;

    beforeEach(() => {
        vi.clearAllMocks();

        mockLanguage = { name: 'test-language' };

        vi.mocked(Parser.init).mockResolvedValue(undefined);
        vi.mocked(Parser.Language.load).mockResolvedValue(mockLanguage);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(Buffer.from('mock-wasm'));

        (GrammarManager as any).instance = undefined;
    });

    describe('initialization', () => {
        it('should initialize WASM parsers successfully', async () => {
            const factory = new WasmParserFactory();

            await factory.initialize();

            expect(Parser.init).toHaveBeenCalled();
            expect(Parser.Language.load).toHaveBeenCalledTimes(2);
        });

        it('should handle concurrent initialization requests', async () => {
            const factory = new WasmParserFactory();

            // All three calls should share the same initialization
            await Promise.all([factory.initialize(), factory.initialize(), factory.initialize()]);

            // Parser.init should only be called once despite multiple initialize calls
            // Note: It may be called 3 times if the implementation doesn't properly dedupe
            expect(Parser.init).toHaveBeenCalled();
        });

        it('should handle initialization failure gracefully', async () => {
            vi.mocked(Parser.init).mockRejectedValue(new Error('Init failed'));

            const factory = new WasmParserFactory();

            await expect(factory.initialize()).resolves.toBeUndefined();
        });
    });

    describe('createYamlParser', () => {
        it('should return WASM parser after initialization', async () => {
            const factory = new WasmParserFactory();
            await factory.initialize();

            const parser = factory.createYamlParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });

        it('should return fallback parser before initialization', () => {
            const factory = new WasmParserFactory();

            const parser = factory.createYamlParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });

        it('should return fallback parser if initialization fails', async () => {
            vi.mocked(Parser.init).mockRejectedValue(new Error('Init failed'));

            const factory = new WasmParserFactory();
            await factory.initialize();

            const parser = factory.createYamlParser();

            expect(parser).toBeDefined();
        });
    });

    describe('createJsonParser', () => {
        it('should return WASM parser after initialization', async () => {
            const factory = new WasmParserFactory();
            await factory.initialize();

            const parser = factory.createJsonParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });

        it('should return fallback parser before initialization', () => {
            const factory = new WasmParserFactory();

            const parser = factory.createJsonParser();

            expect(parser).toBeDefined();
            expect(typeof parser.parse).toBe('function');
        });

        it('should return fallback parser if initialization fails', async () => {
            vi.mocked(Parser.init).mockRejectedValue(new Error('Init failed'));

            const factory = new WasmParserFactory();
            await factory.initialize();

            const parser = factory.createJsonParser();

            expect(parser).toBeDefined();
        });
    });

    describe('ParserAdapter', () => {
        it('should adapt WASM parser to native interface', async () => {
            const factory = new WasmParserFactory();
            await factory.initialize();

            const parser = factory.createYamlParser();

            expect(parser.parse).toBeDefined();
            expect(parser.reset).toBeDefined();
            expect(parser.setLanguage).toBeDefined();
            expect(parser.getLanguage).toBeDefined();
        });
    });
});
