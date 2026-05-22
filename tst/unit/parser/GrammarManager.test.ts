import { readFileSync, existsSync } from 'fs';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Parser from 'web-tree-sitter';
import { DocumentType } from '../../../src/document/Document';
import { GrammarManager, GrammarConfig } from '../../../src/parser/GrammarManager';

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
}));
vi.mock('web-tree-sitter');

describe('GrammarManager', () => {
    let mockParser: any;
    let mockLanguage: any;
    let mockReadFileSync: any;
    let mockExistsSync: any;

    beforeEach(() => {
        mockLanguage = { name: 'test-language' };
        mockParser = {
            init: vi.fn().mockResolvedValue(undefined),
            Language: {
                load: vi.fn().mockResolvedValue(mockLanguage),
            },
        };
        mockReadFileSync = vi.fn().mockReturnValue(Buffer.from('mock-wasm-data'));
        mockExistsSync = vi.fn().mockReturnValue(true);

        (Parser as any).init = mockParser.init;
        (Parser as any).Language = mockParser.Language;
        (readFileSync as any).mockImplementation(mockReadFileSync);
        (existsSync as any).mockImplementation(mockExistsSync);

        // Reset singleton
        (GrammarManager as any).instance = undefined;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getInstance', () => {
        it('should create singleton instance', () => {
            const instance1 = GrammarManager.getInstance();
            const instance2 = GrammarManager.getInstance();

            expect(instance1).toBe(instance2);
        });

        it('should use provided config', () => {
            const config: GrammarConfig = {
                yamlGrammarPath: '/custom/yaml.wasm',
                jsonGrammarPath: '/custom/json.wasm',
                maxRetries: 5,
            };

            const manager = GrammarManager.getInstance(config);

            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/custom/yaml.wasm');
            expect(manager.getGrammarPath(DocumentType.JSON)).toBe('/custom/json.wasm');
        });
    });

    describe('loadGrammar', () => {
        it('should load YAML grammar successfully', async () => {
            const manager = GrammarManager.getInstance();

            const grammar = await manager.loadGrammar(DocumentType.YAML);

            expect(grammar).toBe(mockLanguage);
            expect(mockParser.init).toHaveBeenCalled();
            expect(mockReadFileSync).toHaveBeenCalled();
            expect(mockParser.Language.load).toHaveBeenCalled();
        });

        it('should load JSON grammar successfully', async () => {
            const manager = GrammarManager.getInstance();

            const grammar = await manager.loadGrammar(DocumentType.JSON);

            expect(grammar).toBe(mockLanguage);
            expect(mockParser.init).toHaveBeenCalled();
            expect(mockReadFileSync).toHaveBeenCalled();
            expect(mockParser.Language.load).toHaveBeenCalled();
        });

        it('should cache loaded grammars', async () => {
            const manager = GrammarManager.getInstance();

            const grammar1 = await manager.loadGrammar(DocumentType.YAML);
            const grammar2 = await manager.loadGrammar(DocumentType.YAML);

            expect(grammar1).toBe(grammar2);
            expect(mockParser.Language.load).toHaveBeenCalledTimes(1);
        });

        it('should handle concurrent loading requests', async () => {
            const manager = GrammarManager.getInstance();

            const [grammar1, grammar2] = await Promise.all([
                manager.loadGrammar(DocumentType.YAML),
                manager.loadGrammar(DocumentType.YAML),
            ]);

            expect(grammar1).toBe(grammar2);
            expect(mockParser.Language.load).toHaveBeenCalledTimes(1);
        });

        it('should retry on failure', async () => {
            const manager = GrammarManager.getInstance({ maxRetries: 3, retryDelay: 10 });

            mockParser.Language.load
                .mockRejectedValueOnce(new Error('Load failed'))
                .mockRejectedValueOnce(new Error('Load failed'))
                .mockResolvedValueOnce(mockLanguage);

            const grammar = await manager.loadGrammar(DocumentType.YAML);

            expect(grammar).toBe(mockLanguage);
            expect(mockParser.Language.load).toHaveBeenCalledTimes(3);
        });

        it('should throw after max retries', async () => {
            const manager = GrammarManager.getInstance({ maxRetries: 2, retryDelay: 10 });

            mockParser.Language.load.mockRejectedValue(new Error('Load failed'));

            await expect(manager.loadGrammar(DocumentType.YAML)).rejects.toThrow(
                'Failed to load YAML grammar after 2 attempts',
            );
        });
    });

    describe('preloadGrammars', () => {
        it('should preload all specified grammars', async () => {
            const manager = GrammarManager.getInstance();

            await manager.preloadGrammars([DocumentType.YAML, DocumentType.JSON]);

            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(true);
            expect(manager.isGrammarLoaded(DocumentType.JSON)).toBe(true);
        });

        it('should preload default grammars when no types specified', async () => {
            const manager = GrammarManager.getInstance();

            await manager.preloadGrammars();

            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(true);
            expect(manager.isGrammarLoaded(DocumentType.JSON)).toBe(true);
        });
    });

    describe('cache management', () => {
        it('should report grammar loading status', async () => {
            const manager = GrammarManager.getInstance();

            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(false);

            await manager.loadGrammar(DocumentType.YAML);

            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(true);
        });

        it('should clear cache', async () => {
            const manager = GrammarManager.getInstance();

            await manager.loadGrammar(DocumentType.YAML);
            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(true);

            manager.clearCache();
            expect(manager.isGrammarLoaded(DocumentType.YAML)).toBe(false);
        });
    });

    describe('error handling', () => {
        it('should handle file read errors', async () => {
            const manager = GrammarManager.getInstance();
            mockReadFileSync.mockImplementation(() => {
                throw new Error('File not found');
            });

            await expect(manager.loadGrammar(DocumentType.YAML)).rejects.toThrow('Failed to load YAML grammar');
        });

        it('should handle parser initialization errors', async () => {
            const manager = GrammarManager.getInstance();
            mockParser.init.mockRejectedValue(new Error('Init failed'));

            await expect(manager.loadGrammar(DocumentType.YAML)).rejects.toThrow('Init failed');
        });
    });
});
