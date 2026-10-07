import { parentPort, Worker } from 'worker_threads';
import {
    type Severity,
    type ValidationReport,
    CompositeEngine,
    TemplateContent,
    version,
} from '@aws/cloudformation-validate';

export interface Pending {
    readonly id: number;
    readonly resolve: (report: ValidationReport) => void;
    readonly reject: (error: Error) => void;
    readonly timer: NodeJS.Timeout;
}

export interface CfnValidateOptions {
    readonly severityLevel: Severity;
}

export interface CfnValidateRequest {
    readonly id: number;
    readonly content: string;
    readonly path: string;
    readonly severityLevel: Severity;
}

export type CfnValidateResponse =
    | { readonly ready: string }
    | { readonly id: number; readonly report: ValidationReport }
    | { readonly id: number; readonly error: { name: string; message: string; stack?: string } };

export type CfnValidateWorkerFactory = () => Worker;

const engine = new CompositeEngine();

function post(message: CfnValidateResponse): void {
    parentPort?.postMessage(message);
}

parentPort?.on('message', ({ id, content, path, severityLevel }: CfnValidateRequest) => {
    try {
        const report = engine.validateTemplate(new TemplateContent(content, path), {
            detailLevel: 'STANDARD',
            severityLevel,
        });
        post({ id, report });
    } catch (error) {
        // postMessage would clone a WebAssembly.RuntimeError as a plain Error and lose its name
        post({
            id,
            error:
                error instanceof Error
                    ? { name: error.name, message: error.message, stack: error.stack }
                    : { name: typeof error, message: String(error) },
        });
    }
});

post({ ready: version() });
