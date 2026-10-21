import { parentPort } from 'worker_threads';
import { CompositeEngine, TemplateContent, version } from '@aws/cloudformation-validate';
import type { CfnValidateRequest, CfnValidateResponse } from './CfnValidateProtocol';

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
