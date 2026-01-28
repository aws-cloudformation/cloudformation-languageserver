import TreeSitterYaml from '@tree-sitter-grammars/tree-sitter-yaml';
import NativeParser from 'tree-sitter';
import TreeSitterJson from 'tree-sitter-json';
import Parser from 'web-tree-sitter';
import { DocumentType } from '../document/Document';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { GrammarManager } from './GrammarManager';
import { ParserFactory } from './ParserFactory';

const log = LoggerFactory.getLogger('WasmParserFactory');

// Import the native factory for fallback
class NativeParserFactory implements ParserFactory {
    createYamlParser(): NativeParser {
        const parser = new NativeParser();
        parser.setLanguage(TreeSitterYaml as unknown as NativeParser.Language);
        return parser;
    }

    createJsonParser(): NativeParser {
        const parser = new NativeParser();
        parser.setLanguage(TreeSitterJson as unknown as NativeParser.Language);
        return parser;
    }
}

// Adapter to make web-tree-sitter Parser compatible with native Parser interface
class ParserAdapter {
    private readonly wasmParser: Parser;

    constructor(wasmParser: Parser) {
        this.wasmParser = wasmParser;
    }

    parse(
        input: string | NativeParser.Input,
        oldTree?: NativeParser.Tree,
        options?: NativeParser.Options,
    ): NativeParser.Tree {
        const result = this.wasmParser.parse(
            input as string,
            oldTree as unknown as Parser.Tree,
            options as unknown as Parser.Options,
        );
        return result as unknown as NativeParser.Tree;
    }

    // Pass-through methods (not used but required by interface)
    getIncludedRanges = () => this.wasmParser.getIncludedRanges();
    getTimeoutMicros = () => this.wasmParser.getTimeoutMicros();
    setTimeoutMicros = (timeout: number) => this.wasmParser.setTimeoutMicros(timeout);
    reset = () => this.wasmParser.reset();
    getLanguage = () => this.wasmParser.getLanguage() as unknown as NativeParser.Language | undefined;
    setLanguage = (language?: NativeParser.Language) =>
        this.wasmParser.setLanguage(language as unknown as Parser.Language);
    getLogger = () => this.wasmParser.getLogger();
    setLogger = (logFunc?: NativeParser.Logger | false | null) =>
        this.wasmParser.setLogger(logFunc as unknown as Parser.Logger);

    printDotGraphs(_enabled?: boolean, _fd?: number) {
        // WASM doesn't support dot graphs, so this is a no-op
    }
}

export class WasmParserFactory implements ParserFactory {
    private readonly grammarManager: GrammarManager;
    private yamlParser?: ParserAdapter;
    private jsonParser?: ParserAdapter;
    private initialized = false;
    private initPromise?: Promise<void>;
    private readonly fallbackFactory: NativeParserFactory;

    constructor() {
        this.grammarManager = GrammarManager.getInstance();
        this.fallbackFactory = new NativeParserFactory();
    }

    private async ensureInitialized(): Promise<void> {
        if (this.initialized) return;

        if (this.initPromise) {
            await this.initPromise;
            return;
        }

        this.initPromise = this.doInitialize();
        await this.initPromise;
    }

    private async doInitialize(): Promise<void> {
        try {
            log.info('Starting WASM initialization...');
            await Parser.init();

            const [yamlGrammar, jsonGrammar] = await Promise.all([
                this.grammarManager.loadGrammar(DocumentType.YAML),
                this.grammarManager.loadGrammar(DocumentType.JSON),
            ]);

            const yamlWasmParser = new Parser();
            yamlWasmParser.setLanguage(yamlGrammar);
            this.yamlParser = new ParserAdapter(yamlWasmParser);

            const jsonWasmParser = new Parser();
            jsonWasmParser.setLanguage(jsonGrammar);
            this.jsonParser = new ParserAdapter(jsonWasmParser);

            this.initialized = true;
            log.info('WASM initialization complete');
        } catch {
            log.error('WASM initialization failed, falling back to native');
        }
    }

    createYamlParser(): NativeParser {
        if (!this.initialized || !this.yamlParser) {
            return this.fallbackFactory.createYamlParser();
        }
        return this.yamlParser as NativeParser;
    }

    createJsonParser(): NativeParser {
        if (!this.initialized || !this.jsonParser) {
            return this.fallbackFactory.createJsonParser();
        }
        return this.jsonParser as NativeParser;
    }

    async initialize(): Promise<void> {
        await this.ensureInitialized();
    }
}
