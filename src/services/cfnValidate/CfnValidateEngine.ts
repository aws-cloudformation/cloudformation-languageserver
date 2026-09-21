import type { Engine, Severity, TemplateFile, ValidationReport } from '@aws/cloudformation-validate';
import { Closeable } from '../../utils/Closeable';

type CfnValidateModule = typeof import('@aws/cloudformation-validate');
type TemplateFactory = (path: string, content: string) => TemplateFile;

export interface CfnValidateOptions {
    readonly severityLevel: Severity;
}

// The module is imported lazily because requiring it compiles an ~9 MB WebAssembly binary
export class CfnValidateEngine implements Closeable {
    private engine?: Engine;
    private createTemplate?: TemplateFactory;

    constructor(private readonly loadModule: () => Promise<CfnValidateModule> = defaultModuleLoader) {}

    async initialize(): Promise<void> {
        if (this.engine) {
            return;
        }

        const module = await this.loadModule();
        this.engine = new module.CompositeEngine();
        this.createTemplate = InMemoryTemplateFactory(module);
    }

    isInitialized(): boolean {
        return this.engine !== undefined;
    }

    validate(content: string, path: string, options: CfnValidateOptions): ValidationReport {
        if (!this.engine || !this.createTemplate) {
            throw new Error('CfnValidateEngine is not initialized. Call initialize() first.');
        }

        return this.engine.validateTemplate(this.createTemplate(path, content), {
            detailLevel: 'STANDARD',
            severityLevel: options.severityLevel,
        });
    }

    close(): void {
        this.engine?.free();
        this.engine = undefined;
        this.createTemplate = undefined;
    }
}

function defaultModuleLoader(): Promise<CfnValidateModule> {
    return import('@aws/cloudformation-validate');
}

function InMemoryTemplateFactory(module: CfnValidateModule): TemplateFactory {
    class InMemoryTemplateFile extends module.TemplateFile {
        constructor(
            path: string,
            private readonly content: string,
        ) {
            super(path);
        }

        override readBytes(): Uint8Array {
            return Buffer.from(this.content, 'utf8');
        }
    }

    return (path, content) => new InMemoryTemplateFile(path, content);
}
