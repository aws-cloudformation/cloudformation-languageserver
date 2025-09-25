/* eslint-disable @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-function-type */
import { Connection } from 'vscode-languageserver/node';
import { NotificationHandler } from 'vscode-languageserver-protocol';
import { extractErrorMessage } from '../utils/Errors';

/**
 * Wraps a VSCode Language Server connection to allow multiple handlers per event.
 * Intercepts "on*" method calls to enable additional handlers beyond the original one.
 */
export class ProxyConnection {
    private readonly handlers = new Map<string, NotificationHandler<unknown>[]>();
    public readonly connection: Connection;

    constructor(originalConnection: Connection) {
        this.connection = new Proxy(originalConnection, {
            get: (target, prop) => {
                const propName = prop as string;

                // Intercept event handler methods (onDidChangeConfiguration, onNotification, etc.)
                if (propName.startsWith('on') && typeof target[prop as keyof Connection] === 'function') {
                    return (handler: NotificationHandler<unknown>) => {
                        // Wrap the original handler to also call additional handlers
                        return (target[prop as keyof Connection] as Function)((params: unknown) => {
                            handler(params); // Call original handler first

                            // Then call all additional handlers, catching errors to prevent failures
                            const additionalHandlers = this.handlers.get(propName) ?? [];
                            for (const h of additionalHandlers) {
                                try {
                                    h(params);
                                } catch (error) {
                                    originalConnection.console.error(`Handler failed: ${extractErrorMessage(error)}`);
                                }
                            }
                        });
                    };
                }

                // For non-handler methods, pass through directly
                return Reflect.get(target, prop);
            },
        });
    }

    /**
     * Add a handler for a specific method that will be called alongside the original.
     * Returns a disposable to remove the handler when no longer needed.
     */
    addHandler<T>(method: string, handler: NotificationHandler<T>): { dispose: () => void } {
        // Get or create handler list for this method
        let handlers = this.handlers.get(method);
        if (!handlers) {
            handlers = [];
            this.handlers.set(method, handlers);
        }
        handlers.push(handler as NotificationHandler<unknown>);

        // Return disposable to remove this specific handler
        return {
            dispose: () => {
                const index = handlers.indexOf(handler as NotificationHandler<unknown>);
                if (index !== -1) handlers.splice(index, 1);
            },
        };
    }
}
