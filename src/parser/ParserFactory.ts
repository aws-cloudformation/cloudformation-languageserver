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

// Environment detection and factory creation
const shouldForceWasm = (): boolean => {
    return process.env.CLOUDFORMATIONLSP_USE_WASM === 'true';
};

// Initialize the factory - async initialization happens in background
let factoryInstance: ParserFactory;

if (shouldForceWasm()) {
    log.info('Forcing WASM tree-sitter implementation (CLOUDFORMATIONLSP_USE_WASM=true)');
    const wasmFactory = new WasmParserFactory();
    // eslint-disable-next-line unicorn/prefer-top-level-await
    wasmFactory.initialize().catch((error: unknown) => {
        log.error(error, 'Failed to initialize WASM parser factory');
    });
    factoryInstance = wasmFactory;
} else {
    log.info('Using native tree-sitter implementation with WASM fallback');
    factoryInstance = new NativeParserFactory();
}

export const parserFactory: ParserFactory = factoryInstance;
