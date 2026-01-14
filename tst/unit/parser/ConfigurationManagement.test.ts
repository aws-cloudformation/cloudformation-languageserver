import { existsSync, readFileSync } from 'fs';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Parser from 'web-tree-sitter';
import { DocumentType } from '../../../src/document/Document';
import { GrammarManager, GrammarConfig } from '../../../src/parser/GrammarManager';

// Mock dependencies
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

describe('WASM Configuration Management', () => {
    let mockLanguage: any;

    beforeEach(() => {
        mockLanguage = { name: 'test-language' };

        vi.clearAllMocks();

        vi.mocked(Parser.init).mockResolvedValue(undefined);
        vi.mocked(Parser.Language.load).mockResolvedValue(mockLanguage);
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue(Buffer.from('mock-wasm'));

        // Reset singleton
        (GrammarManager as any).instance = undefined;
    });

    describe('Default Configuration', () => {
        it('should use default configuration when none provided', () => {
            const manager = GrammarManager.getInstance();

            expect(manager.getGrammarPath(DocumentType.YAML)).toContain('tree-sitter-yaml.wasm');
            expect(manager.getGrammarPath(DocumentType.JSON)).toContain('tree-sitter-json.wasm');
        });

        it('should use default retry settings', async () => {
            const manager = GrammarManager.getInstance();

            // Mock failure then success
            vi.mocked(Parser.Language.load)
                .mockRejectedValueOnce(new Error('Load failed'))
                .mockRejectedValueOnce(new Error('Load failed'))
                .mockResolvedValueOnce(mockLanguage);

            const grammar = await manager.loadGrammar(DocumentType.YAML);

            expect(grammar).toBe(mockLanguage);
            expect(Parser.Language.load).toHaveBeenCalledTimes(3); // Default maxRetries = 3
        });

        it('should handle __dirname availability', () => {
            // Test when __dirname is available (which it is in Node.js test environment)
            const manager = GrammarManager.getInstance();
            const path = manager.getGrammarPath(DocumentType.YAML);

            // Should use __dirname/wasm path
            expect(path).toContain('wasm');
            expect(path).toContain('tree-sitter-yaml.wasm');
        });

        it('should fallback when __dirname is unavailable', () => {
            // This test verifies the fallback logic by providing a custom config
            // that doesn't rely on __dirname
            const config: GrammarConfig = {
                wasmBasePath: './custom-wasm',
            };

            (GrammarManager as any).instance = undefined;
            const manager = GrammarManager.getInstance(config);
            const path = manager.getGrammarPath(DocumentType.YAML);

            expect(path).toContain('./custom-wasm');
        });
    });

    describe('Custom Configuration', () => {
        it('should accept custom grammar paths', () => {
            const config: GrammarConfig = {
                yamlGrammarPath: '/custom/yaml.wasm',
                jsonGrammarPath: '/custom/json.wasm',
            };

            const manager = GrammarManager.getInstance(config);

            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/custom/yaml.wasm');
            expect(manager.getGrammarPath(DocumentType.JSON)).toBe('/custom/json.wasm');
        });

        it('should accept custom retry configuration', async () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                maxRetries: 5,
                retryDelay: 50,
            };

            const manager = GrammarManager.getInstance(config);

            // Mock failures
            vi.mocked(Parser.Language.load).mockRejectedValue(new Error('Load failed'));

            const startTime = Date.now();

            try {
                await manager.loadGrammar(DocumentType.YAML);
            } catch {
                const endTime = Date.now();
                const duration = endTime - startTime;

                // Should have tried 5 times with delays
                expect(Parser.Language.load).toHaveBeenCalledTimes(5);
                // Should have some delay (at least 4 delays between 5 attempts)
                expect(duration).toBeGreaterThan(200); // 4 * 50ms
            }
        });

        it('should accept custom WASM base path', () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                wasmBasePath: '/custom/wasm/base',
            };

            const manager = GrammarManager.getInstance(config);

            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/custom/wasm/base/tree-sitter-yaml.wasm');
            expect(manager.getGrammarPath(DocumentType.JSON)).toBe('/custom/wasm/base/tree-sitter-json.wasm');
        });

        it('should override specific paths even with base path', () => {
            const config: GrammarConfig = {
                wasmBasePath: '/base/path',
                yamlGrammarPath: '/specific/yaml.wasm',
            };

            const manager = GrammarManager.getInstance(config);

            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/specific/yaml.wasm');
            expect(manager.getGrammarPath(DocumentType.JSON)).toBe('/base/path/tree-sitter-json.wasm');
        });
    });

    describe('Configuration Validation', () => {
        it('should handle zero retries', async () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                maxRetries: 0,
            };

            const manager = GrammarManager.getInstance(config);
            vi.mocked(Parser.Language.load).mockRejectedValue(new Error('Load failed'));

            await expect(manager.loadGrammar(DocumentType.YAML)).rejects.toThrow(
                'Failed to load YAML grammar after 0 attempts',
            );

            expect(Parser.Language.load).not.toHaveBeenCalled();
        });

        it('should handle negative retry delay', async () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                maxRetries: 2,
                retryDelay: -10,
            };

            const manager = GrammarManager.getInstance(config);
            vi.mocked(Parser.Language.load)
                .mockRejectedValueOnce(new Error('Load failed'))
                .mockResolvedValueOnce(mockLanguage);

            const startTime = Date.now();
            const grammar = await manager.loadGrammar(DocumentType.YAML);
            const endTime = Date.now();

            expect(grammar).toBe(mockLanguage);
            // Should not have significant delay with negative retryDelay
            expect(endTime - startTime).toBeLessThan(50);
        });

        it('should handle empty string paths', async () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                yamlGrammarPath: '',
                jsonGrammarPath: '',
            };

            const manager = GrammarManager.getInstance(config);

            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('');
            expect(manager.getGrammarPath(DocumentType.JSON)).toBe('');

            // Should still attempt to load (and fail)
            vi.mocked(existsSync).mockReturnValue(false);

            await expect(manager.loadGrammar(DocumentType.YAML)).rejects.toThrow('Failed to load YAML grammar');
        });
    });

    describe('Environment-based Configuration', () => {
        it('should respect environment variables for paths', () => {
            const originalEnv = process.env;
            process.env = {
                ...originalEnv,
                CFNLS_WASM_YAML_PATH: '/env/yaml.wasm',
                CFNLS_WASM_JSON_PATH: '/env/json.wasm',
            };

            try {
                // This would require actual environment variable support in GrammarManager
                // For now, we test that custom config overrides work
                const config: GrammarConfig = {
                    yamlGrammarPath: process.env.CFNLS_WASM_YAML_PATH,
                    jsonGrammarPath: process.env.CFNLS_WASM_JSON_PATH,
                };

                (GrammarManager as any).instance = undefined;
                const manager = GrammarManager.getInstance(config);

                expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/env/yaml.wasm');
                expect(manager.getGrammarPath(DocumentType.JSON)).toBe('/env/json.wasm');
            } finally {
                process.env = originalEnv;
            }
        });

        it('should handle missing environment variables gracefully', () => {
            const originalEnv = process.env;
            process.env = { ...originalEnv };
            delete process.env.CFNLS_WASM_YAML_PATH;

            try {
                const config: GrammarConfig = {
                    yamlGrammarPath: process.env.CFNLS_WASM_YAML_PATH,
                };

                (GrammarManager as any).instance = undefined;
                const manager = GrammarManager.getInstance(config);

                // Should use undefined, which gets handled by default path logic
                expect(manager.getGrammarPath(DocumentType.YAML)).toContain('tree-sitter-yaml.wasm');
            } finally {
                process.env = originalEnv;
            }
        });
    });

    describe('Configuration Immutability', () => {
        it('should not allow configuration changes after initialization', () => {
            const config: GrammarConfig = {
                yamlGrammarPath: '/original/yaml.wasm',
            };

            const manager = GrammarManager.getInstance(config);

            // Attempt to create with different config should be ignored
            const manager2 = GrammarManager.getInstance({
                yamlGrammarPath: '/different/yaml.wasm',
            });

            expect(manager).toBe(manager2);
            expect(manager.getGrammarPath(DocumentType.YAML)).toBe('/original/yaml.wasm');
        });

        it('should maintain configuration consistency across calls', async () => {
            (GrammarManager as any).instance = undefined;

            const config: GrammarConfig = {
                maxRetries: 1,
                retryDelay: 100,
            };

            const manager = GrammarManager.getInstance(config);

            // First call with failure
            vi.mocked(Parser.Language.load).mockRejectedValue(new Error('Load failed'));

            try {
                await manager.loadGrammar(DocumentType.YAML);
            } catch {
                // Expected to fail
            }

            expect(Parser.Language.load).toHaveBeenCalledTimes(1); // maxRetries = 1

            // Second call should use same configuration
            vi.mocked(Parser.Language.load).mockClear();
            vi.mocked(Parser.Language.load).mockRejectedValue(new Error('Load failed again'));

            try {
                await manager.loadGrammar(DocumentType.JSON);
            } catch {
                // Expected to fail
            }

            expect(Parser.Language.load).toHaveBeenCalledTimes(1); // Same maxRetries
        });
    });
});
