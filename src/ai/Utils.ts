import { BaseMessage } from '@langchain/core/messages';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const logger = LoggerFactory.getLogger('AIUtils');

export function extractTextFromMessages(messages: BaseMessage[]): string {
    return messages
        .map((msg) => {
            if (typeof msg.content === 'string') {
                return msg.content;
            } else if (Array.isArray(msg.content)) {
                return (
                    msg.content
                        .filter((item) => item.type === 'text')
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        .map((item) => (item.type === 'text' ? item.text : ''))
                        .join(' ')
                );
            }
            return '';
        })
        .join('\n');
}

export function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    const controller = new AbortController();
    const { signal } = controller;

    const timeoutId = setTimeout(() => {
        controller.abort(new Error(`Operation timed out after ${ms}ms`));
    }, ms);

    return Promise.race([
        promise.finally(() => clearTimeout(timeoutId)),
        new Promise<never>((_resolve, reject) => {
            signal.addEventListener('abort', () => {
                reject(new Error(signal.reason as string));
            });
        }),
    ]);
}

/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
export function logResponse(messages: any[]) {
    const responses = messages
        .map((msg: any) => {
            return {
                type: msg.constructor.name,
                content: msg.content,
                tool_calls: msg.tool_calls,
                // usage: msg.response_metadata?.usage,
                // usage_metadata: msg.usage_metadata,
                // metrics: msg.metrics,
            };
        })
        .map((obj: any) => Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== undefined && v !== null)));

    logger.info(responses);
}

export function sanitizeTemplate(template: string) {
    // eslint-disable-next-line unicorn/prefer-string-replace-all
    return template.replace(/\s+/g, ' ');
}
