import { setImmediate } from 'node:timers/promises';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Document } from '../../src/document/Document';

export async function flushAllPromises() {
    await setImmediate();
}

const defaultTimeoutMs = 100;
const defaultIntervalMs = 5;

export class WaitFor {
    constructor(
        private readonly maxWaitMs: number,
        private readonly delayIntervalMs: number,
        private readonly throwableTypesToExpect: (new (...args: any[]) => Error)[] = [Error],
    ) {}

    async wait(block: () => void | Promise<void>): Promise<void> {
        let lastError: Error | null = null;
        const start = performance.now();

        while (performance.now() - start <= this.maxWaitMs) {
            try {
                await block();
                return;
            } catch (e) {
                const error = e as Error;
                if (this.throwableTypesToExpect.some((type) => error instanceof type)) {
                    lastError = error;
                } else {
                    throw error;
                }
            }
            await flushAllPromises();
            await new Promise((resolve) => setTimeout(resolve, this.delayIntervalMs));
        }
        throw lastError!;
    }

    static async waitFor(
        code: () => void | Promise<void>,
        timeoutMs: number = defaultTimeoutMs,
        intervalMs: number = defaultIntervalMs,
    ): Promise<void> {
        await new WaitFor(timeoutMs, intervalMs).wait(code);
    }
}

export async function waitFor(
    code: () => void | Promise<void>,
    timeoutMs: number = defaultTimeoutMs,
    intervalMs: number = defaultIntervalMs,
): Promise<void> {
    await WaitFor.waitFor(code, timeoutMs, intervalMs);
}

export function createTestDocument(uri: string, languageId: string, version: number, content: string): Document {
    const td = TextDocument.create(uri, languageId, version, content);
    return new Document(td.uri, () => td);
}

// Helper to create Document from TextDocument
export function createDocument(textDocument: TextDocument): Document {
    return new Document(textDocument.uri, () => textDocument);
}
