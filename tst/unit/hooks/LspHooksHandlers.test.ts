import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Connection } from 'vscode-languageserver';
import { LspHooksHandlers } from '../../../src/protocol/LspHooksHandlers';
import {
    ListHooksRequest,
    DescribeHookRequest,
    ListHookResultsRequest,
    GetHookResultRequest,
    ConfigureHookRequest,
    DeactivateHookRequest,
} from '../../../src/hooks/HooksRequestType';

describe('LspHooksHandlers', () => {
    let mockConnection: { onRequest: ReturnType<typeof vi.fn> };
    let handlers: LspHooksHandlers;

    beforeEach(() => {
        mockConnection = { onRequest: vi.fn() };
        handlers = new LspHooksHandlers(mockConnection as unknown as Connection);
    });

    it('should register listHooks handler with correct method', () => {
        const handler = vi.fn();
        handlers.onListHooks(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(ListHooksRequest.method, handler);
    });

    it('should register describeHook handler with correct method', () => {
        const handler = vi.fn();
        handlers.onDescribeHook(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(DescribeHookRequest.method, handler);
    });

    it('should register listHookResults handler with correct method', () => {
        const handler = vi.fn();
        handlers.onListHookResults(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(ListHookResultsRequest.method, handler);
    });

    it('should register getHookResult handler with correct method', () => {
        const handler = vi.fn();
        handlers.onGetHookResult(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(GetHookResultRequest.method, handler);
    });

    it('should register configureHook handler with correct method', () => {
        const handler = vi.fn();
        handlers.onConfigureHook(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(ConfigureHookRequest.method, handler);
    });

    it('should register deactivateHook handler with correct method', () => {
        const handler = vi.fn();
        handlers.onDeactivateHook(handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(DeactivateHookRequest.method, handler);
    });
});
