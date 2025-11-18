import { Templates } from './TemplateUtils';

export function flushAllPromises() {
    return new Promise((resolve) => {
        setTimeout(resolve, 0);
    });
}

export function getSimpleJsonTemplateText(): string {
    return Templates.simple.json.contents;
}

export function getSimpleYamlTemplateText(): string {
    return Templates.simple.yaml.contents;
}

export function getYamlTemplate(): string {
    return Templates.sample.yaml.contents;
}

export function getJsonTemplate(): string {
    return Templates.sample.json.contents;
}

export class WaitFor {
    constructor(
        private readonly maxWaitMs: number = 25,
        private readonly delayIntervalMs: number = 1,
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

    static async waitFor(code: () => void | Promise<void>, timeoutMs: number = 100): Promise<void> {
        await new WaitFor(timeoutMs).wait(code);
    }
}

export async function wait(ms: number) {
    await new Promise((resolve) => setTimeout(resolve, ms));
}
