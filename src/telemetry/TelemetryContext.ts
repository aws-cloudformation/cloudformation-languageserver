import { AsyncLocalStorage } from 'async_hooks';
import { v4 } from 'uuid';

type TelemetryContextType = {
    HandlerSource?: string;
    RequestId?: string;
};

export class TelemetryContext {
    private static readonly storage = new AsyncLocalStorage<TelemetryContextType>();

    static run<T>(handler: string, fn: () => T): T {
        return this.storage.run({ HandlerSource: handler, RequestId: v4() }, fn);
    }

    static getContext(): TelemetryContextType {
        return (
            this.storage.getStore() ?? {
                HandlerSource: 'Unknown',
            }
        );
    }
}

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
type Handler = (...args: any[]) => any;

export function withTelemetryContext<T extends Handler>(handlerName: string, handler: T): T {
    return ((...args: any[]) => {
        return TelemetryContext.run(handlerName, () => {
            return handler(...args);
        });
    }) as T;
}
