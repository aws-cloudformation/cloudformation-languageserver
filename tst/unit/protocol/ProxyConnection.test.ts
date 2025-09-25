import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Connection } from 'vscode-languageserver/node';
import { ProxyConnection } from '../../../src/protocol/ProxyConnection';

describe('ProxyConnection', () => {
    let mockConnection: Connection;
    let proxyConnection: ProxyConnection;

    beforeEach(() => {
        mockConnection = {
            console: { error: vi.fn() },
            onDidChangeConfiguration: vi.fn(),
            onNotification: vi.fn(),
        } as any;
        proxyConnection = new ProxyConnection(mockConnection);
    });

    describe('constructor', () => {
        it('should proxy non-handler methods directly', () => {
            const mockMethod = vi.fn();
            (mockConnection as any).someMethod = mockMethod;

            (proxyConnection.connection as any).someMethod();
            expect(mockMethod).toHaveBeenCalled();
        });
    });

    describe('handler proxying', () => {
        it('should intercept "on" methods and add additional handler support', () => {
            const originalHandler = vi.fn();
            const mockOnMethod = vi.fn((handler) => handler);
            (mockConnection as any).onDidChangeConfiguration = mockOnMethod;

            proxyConnection.connection.onDidChangeConfiguration(originalHandler);

            expect(mockOnMethod).toHaveBeenCalled();
            expect(typeof mockOnMethod.mock.calls[0][0]).toBe('function');
        });

        it('should call original handler when proxied method is invoked', () => {
            const originalHandler = vi.fn();
            const mockOnMethod = vi.fn((handler) => {
                // Simulate calling the handler immediately
                handler({ test: 'data' });
                return handler;
            });
            (mockConnection as any).onDidChangeConfiguration = mockOnMethod;

            proxyConnection.connection.onDidChangeConfiguration(originalHandler);

            expect(originalHandler).toHaveBeenCalledWith({ test: 'data' });
        });
    });

    describe('addHandler', () => {
        it('should add additional handler for method', () => {
            const handler = vi.fn();
            const disposable = proxyConnection.addHandler('onDidChangeConfiguration', handler);

            expect(disposable).toHaveProperty('dispose');
            expect(typeof disposable.dispose).toBe('function');
        });

        it('should call additional handlers when method is invoked', () => {
            const originalHandler = vi.fn();
            const additionalHandler = vi.fn();
            const mockOnMethod = vi.fn((handler) => {
                handler({ test: 'data' });
                return handler;
            });
            (mockConnection as any).onDidChangeConfiguration = mockOnMethod;

            proxyConnection.addHandler('onDidChangeConfiguration', additionalHandler);
            proxyConnection.connection.onDidChangeConfiguration(originalHandler);

            expect(additionalHandler).toHaveBeenCalledWith({ test: 'data' });
        });

        it('should handle errors in additional handlers gracefully', () => {
            const originalHandler = vi.fn();
            const faultyHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const mockOnMethod = vi.fn((handler) => {
                handler({ test: 'data' });
                return handler;
            });
            (mockConnection as any).onDidChangeConfiguration = mockOnMethod;

            proxyConnection.addHandler('onDidChangeConfiguration', faultyHandler);
            proxyConnection.connection.onDidChangeConfiguration(originalHandler);

            expect(mockConnection.console.error).toHaveBeenCalledWith('Handler failed: Handler error');
            expect(originalHandler).toHaveBeenCalled();
        });
    });

    describe('dispose', () => {
        it('should remove handler when dispose is called', () => {
            const handler = vi.fn();
            const disposable = proxyConnection.addHandler('onDidChangeConfiguration', handler);

            disposable.dispose();

            const mockOnMethod = vi.fn((handler) => {
                handler({ test: 'data' });
                return handler;
            });
            (mockConnection as any).onDidChangeConfiguration = mockOnMethod;

            proxyConnection.connection.onDidChangeConfiguration(vi.fn());
            expect(handler).not.toHaveBeenCalled();
        });
    });
});
