import { join } from 'path';
import Parser from 'web-tree-sitter';
import { DocumentType } from '../document/Document';
import { readBufferIfExists } from '../utils/File';

export interface GrammarConfig {
    yamlGrammarPath?: string;
    jsonGrammarPath?: string;
    maxRetries?: number;
    retryDelay?: number;
    wasmBasePath?: string;
}

export class GrammarManager {
    private static instance: GrammarManager;
    private initialized = false;
    private readonly grammarCache = new Map<DocumentType, Parser.Language>();
    private readonly loadingPromises = new Map<DocumentType, Promise<Parser.Language>>();
    private readonly config: Required<GrammarConfig>;

    private constructor(config: GrammarConfig = {}) {
        const basePath = config.wasmBasePath ?? this.getDefaultWasmPath();

        this.config = {
            yamlGrammarPath: config.yamlGrammarPath ?? join(basePath, 'tree-sitter-yaml.wasm'),
            jsonGrammarPath: config.jsonGrammarPath ?? join(basePath, 'tree-sitter-json.wasm'),
            maxRetries: config.maxRetries ?? 3,
            retryDelay: config.retryDelay ?? 100,
            wasmBasePath: basePath,
        };
    }

    private getDefaultWasmPath(): string {
        // In bundled environment, WASM files are in the same directory as the bundle
        if (typeof __dirname !== 'undefined') {
            // __dirname points to the bundle directory, WASM files are in ./wasm/
            return join(__dirname, 'wasm');
        }
        // Fallback for different environments
        return './wasm';
    }

    public static getInstance(config?: GrammarConfig): GrammarManager {
        if (!GrammarManager.instance) {
            GrammarManager.instance = new GrammarManager(config);
        }
        return GrammarManager.instance;
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;

        await Parser.init({
            locateFile: (scriptName: string) => {
                if (scriptName === 'tree-sitter.wasm') {
                    return join(this.config.wasmBasePath, '..', 'tree-sitter.wasm');
                }
                return scriptName;
            },
        });

        this.initialized = true;
    }

    private async loadGrammarWithRetry(type: DocumentType): Promise<Parser.Language> {
        const grammarPath = type === DocumentType.YAML ? this.config.yamlGrammarPath : this.config.jsonGrammarPath;

        let lastError: Error | undefined;

        for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
            try {
                const wasmBuffer = readBufferIfExists(grammarPath);
                return await Parser.Language.load(wasmBuffer);
            } catch (error) {
                lastError = error as Error;

                if (attempt < this.config.maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay * attempt));
                }
            }
        }

        throw new Error(
            `Failed to load ${type} grammar after ${this.config.maxRetries} attempts: ${lastError?.message}`,
        );
    }

    public async loadGrammar(type: DocumentType): Promise<Parser.Language> {
        // Return cached grammar if available
        const cached = this.grammarCache.get(type);
        if (cached) {
            return cached;
        }

        // Return existing loading promise if in progress
        const existingPromise = this.loadingPromises.get(type);
        if (existingPromise) {
            return await existingPromise;
        }

        // Start new loading process
        const loadingPromise = this.loadGrammarInternal(type);
        this.loadingPromises.set(type, loadingPromise);

        try {
            const grammar = await loadingPromise;
            this.grammarCache.set(type, grammar);
            return grammar;
        } finally {
            this.loadingPromises.delete(type);
        }
    }

    private async loadGrammarInternal(type: DocumentType): Promise<Parser.Language> {
        await this.ensureInitialized();
        return await this.loadGrammarWithRetry(type);
    }

    public async preloadGrammars(types: DocumentType[] = [DocumentType.YAML, DocumentType.JSON]): Promise<void> {
        const promises = types.map((type) => this.loadGrammar(type));
        await Promise.all(promises);
    }

    public isGrammarLoaded(type: DocumentType): boolean {
        return this.grammarCache.has(type);
    }

    public clearCache(): void {
        this.grammarCache.clear();
        this.loadingPromises.clear();
    }

    public getGrammarPath(type: DocumentType): string {
        return type === DocumentType.YAML ? this.config.yamlGrammarPath : this.config.jsonGrammarPath;
    }
}
