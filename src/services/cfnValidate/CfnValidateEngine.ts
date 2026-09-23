import type { Engine, Severity, ValidationReport } from '@aws/cloudformation-validate';
import { Closeable } from '../../utils/Closeable';

type CfnValidateModule = typeof import('@aws/cloudformation-validate');

export interface CfnValidateOptions {
    readonly severityLevel: Severity;
}

// The module is imported lazily because requiring it compiles an ~9 MB WebAssembly binary
export class CfnValidateEngine implements Closeable {
    private module?: CfnValidateModule;
    private engine?: Engine;

    constructor(private readonly loadModule: () => Promise<CfnValidateModule> = defaultModuleLoader) {}

    async initialize(): Promise<void> {
        if (this.engine) {
            return;
        }

        const module = await this.loadModule();
        this.module = module;
        this.engine = new module.CompositeEngine();
    }

    isInitialized(): boolean {
        return this.engine !== undefined;
    }

    validate(content: string, path: string, options: CfnValidateOptions): ValidationReport {
        if (!this.engine || !this.module) {
            throw new Error('CfnValidateEngine is not initialized. Call initialize() first.');
        }

        return this.engine.validateTemplate(new this.module.TemplateContent(content, path), {
            detailLevel: 'STANDARD',
            severityLevel: options.severityLevel,
        });
    }

    close(): void {
        this.engine?.free();
        this.engine = undefined;
        this.module = undefined;
    }
}

function defaultModuleLoader(): Promise<CfnValidateModule> {
    return import('@aws/cloudformation-validate');
}
