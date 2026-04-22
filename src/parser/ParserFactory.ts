import TreeSitterYaml from '@tree-sitter-grammars/tree-sitter-yaml';
import Parser from 'tree-sitter';
import TreeSitterJson from 'tree-sitter-json';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { WasmParserFactory } from './WasmParserFactory';

const log = LoggerFactory.getLogger('ParserFactory');

export interface ParserFactory {
    createYamlParser(): Parser;
    createJsonParser(): Parser;
    initialize?(): Promise<void>;
}

class NativeParserFactory implements ParserFactory {
    private readonly yamlParser: Parser;
    private readonly jsonParser: Parser;
    private wasmFallback?: WasmParserFactory;
    private readonly nativeFailed: boolean = false;

    constructor() {
        try {
            this.yamlParser = new Parser();
            this.yamlParser.setLanguage(TreeSitterYaml as unknown as Parser.Language);

            this.jsonParser = new Parser();
            this.jsonParser.setLanguage(TreeSitterJson as unknown as Parser.Language);

            log.info('Native tree-sitter parsers initialized successfully');
        } catch {
            log.error('Native tree-sitter initialization failed, will use WASM fallback');
            this.nativeFailed = true;
            this.yamlParser = new Parser();
            this.jsonParser = new Parser();
            this.initializeWasmFallback();
        }
    }

    private initializeWasmFallback(): void {
        log.info('Initializing WASM fallback...');
        this.wasmFallback = new WasmParserFactory();
        this.wasmFallback.initialize().catch((error: unknown) => {
            log.error(error, 'WASM fallback initialization failed');
        });
    }

    createYamlParser(): Parser {
        if (this.nativeFailed && this.wasmFallback) {
            return this.wasmFallback.createYamlParser();
        }
        return this.yamlParser;
    }

    createJsonParser(): Parser {
        if (this.nativeFailed && this.wasmFallback) {
            return this.wasmFallback.createJsonParser();
        }
        return this.jsonParser;
    }
}

// Legacy Linux builds use WASM since native bindings may not work
const isLegacyLinux = process.env.BUILD_TARGET === 'legacy';

// Initialize the factory
let factoryInstance: ParserFactory;
let readyPromise: Promise<void>;

if (isLegacyLinux) {
    log.info('Legacy Linux detected, using WASM tree-sitter implementation');
    const wasmFactory = new WasmParserFactory();
    // eslint-disable-next-line unicorn/prefer-top-level-await
    readyPromise = wasmFactory.initialize().catch((error: unknown) => {
        log.error(error, 'WASM initialization failed, falling back to native');
        factoryInstance = new NativeParserFactory();
    });
    factoryInstance = wasmFactory;
} else {
    log.info('Using native tree-sitter implementation with WASM fallback');
    factoryInstance = new NativeParserFactory();
    readyPromise = Promise.resolve();
}

export const parserFactory: ParserFactory = factoryInstance;
export const parserFactoryReady: Promise<void> = readyPromise;
