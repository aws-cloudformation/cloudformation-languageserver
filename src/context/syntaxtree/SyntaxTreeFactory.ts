import { DocumentType } from '../../document/Document';
import { FeatureFlag } from '../../featureFlag/FeatureFlagI';
import { ParserFactory, parserFactory, parserFactoryReady } from '../../parser/ParserFactory';
import { WasmParserFactory } from '../../parser/WasmParserFactory';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../../telemetry/ScopedTelemetry';
import { Telemetry } from '../../telemetry/TelemetryDecorator';
import { JsonSyntaxTree } from './JsonSyntaxTree';
import { SyntaxTree } from './SyntaxTree';
import { YamlSyntaxTree } from './YamlSyntaxTree';

export type ParserType = 'native' | 'wasm';

const log = LoggerFactory.getLogger('SyntaxTreeFactory');
const isLegacyLinux = process.env.BUILD_TARGET === 'legacy';

export class SyntaxTreeFactory {
    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    private factory: ParserFactory;
    private type: ParserType;
    private readyPromise: Promise<void>;

    constructor(nativeFactory: ParserFactory = parserFactory) {
        this.factory = nativeFactory;
        this.type = isLegacyLinux ? 'wasm' : 'native';
        this.readyPromise = parserFactoryReady;
    }

    /**
     * Called once during server initialization to lock in the parser type
     * for the lifetime of the session based on the feature flag state.
     */
    initialize(wasmFlag: FeatureFlag): void {
        if (isLegacyLinux) {
            return; // Already using WASM via parserFactory
        }
        if (wasmFlag.isEnabled()) {
            log.info('WasmParser feature flag enabled, switching to WASM parser');
            const wasm = new WasmParserFactory();
            this.factory = wasm;
            this.type = 'wasm';
            this.readyPromise = wasm.initialize().catch((error: unknown) => {
                log.error(error, 'WASM initialization failed, falling back to native');
                this.factory = parserFactory;
                this.type = 'native';
            });
        }
    }

    get parserType(): ParserType {
        return this.type;
    }

    get ready(): Promise<void> {
        return this.readyPromise;
    }

    createSyntaxTree(content: string, documentType: DocumentType): SyntaxTree {
        this.telemetry.count('createSyntaxTree', 1, {
            attributes: { 'parser.type': this.type },
        });
        if (documentType === DocumentType.JSON) {
            return new JsonSyntaxTree(content, this.factory, this.type);
        }
        return new YamlSyntaxTree(content, this.factory, this.type);
    }
}

export const syntaxTreeFactory = new SyntaxTreeFactory();
