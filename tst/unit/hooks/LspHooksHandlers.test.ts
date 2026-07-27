import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Connection } from 'vscode-languageserver';
import { LspHooksHandlers } from '../../../src/protocol/LspHooksHandlers';
import {
    ListHooksRequest,
    ListHooksDetailedRequest,
    ListPublicHooksRequest,
    DescribeHookRequest,
    ListHookResultsRequest,
    GetHookResultRequest,
    ConfigureHookRequest,
    SetInvocationStatusRequest,
    CreateGuardHookRequest,
    ListIamRolesRequest,
    ListS3BucketsRequest,
    ListS3ObjectsRequest,
    ListProactiveControlsRequest,
    CreateS3BucketRequest,
    CreateHookExecutionRoleRequest,
    DeactivateHookRequest,
    ActivateHookRequest,
    SetHookConfigurationRequest,
    GetHookConfigurationRequest,
    GetRuleContentRequest,
    ValidateRuleRequest,
    UploadRuleRequest,
    PreviewGuardHooksRequest,
} from '../../../src/hooks/HooksRequestType';

type Registration = {
    name: string;
    method: string;
    register: (handlers: LspHooksHandlers, handler: Mock) => void;
};

const registrations: Registration[] = [
    { name: 'onListHooks', method: ListHooksRequest.method, register: (h, fn) => h.onListHooks(fn) },
    {
        name: 'onListHooksDetailed',
        method: ListHooksDetailedRequest.method,
        register: (h, fn) => h.onListHooksDetailed(fn),
    },
    { name: 'onListPublicHooks', method: ListPublicHooksRequest.method, register: (h, fn) => h.onListPublicHooks(fn) },
    { name: 'onDescribeHook', method: DescribeHookRequest.method, register: (h, fn) => h.onDescribeHook(fn) },
    { name: 'onListHookResults', method: ListHookResultsRequest.method, register: (h, fn) => h.onListHookResults(fn) },
    { name: 'onGetHookResult', method: GetHookResultRequest.method, register: (h, fn) => h.onGetHookResult(fn) },
    { name: 'onConfigureHook', method: ConfigureHookRequest.method, register: (h, fn) => h.onConfigureHook(fn) },
    {
        name: 'onSetInvocationStatus',
        method: SetInvocationStatusRequest.method,
        register: (h, fn) => h.onSetInvocationStatus(fn),
    },
    { name: 'onCreateGuardHook', method: CreateGuardHookRequest.method, register: (h, fn) => h.onCreateGuardHook(fn) },
    { name: 'onListIamRoles', method: ListIamRolesRequest.method, register: (h, fn) => h.onListIamRoles(fn) },
    { name: 'onListS3Buckets', method: ListS3BucketsRequest.method, register: (h, fn) => h.onListS3Buckets(fn) },
    { name: 'onListS3Objects', method: ListS3ObjectsRequest.method, register: (h, fn) => h.onListS3Objects(fn) },
    {
        name: 'onListProactiveControls',
        method: ListProactiveControlsRequest.method,
        register: (h, fn) => h.onListProactiveControls(fn),
    },
    { name: 'onCreateS3Bucket', method: CreateS3BucketRequest.method, register: (h, fn) => h.onCreateS3Bucket(fn) },
    {
        name: 'onCreateHookExecutionRole',
        method: CreateHookExecutionRoleRequest.method,
        register: (h, fn) => h.onCreateHookExecutionRole(fn),
    },
    { name: 'onDeactivateHook', method: DeactivateHookRequest.method, register: (h, fn) => h.onDeactivateHook(fn) },
    { name: 'onActivateHook', method: ActivateHookRequest.method, register: (h, fn) => h.onActivateHook(fn) },
    {
        name: 'onSetHookConfiguration',
        method: SetHookConfigurationRequest.method,
        register: (h, fn) => h.onSetHookConfiguration(fn),
    },
    {
        name: 'onGetHookConfiguration',
        method: GetHookConfigurationRequest.method,
        register: (h, fn) => h.onGetHookConfiguration(fn),
    },
    { name: 'onGetRuleContent', method: GetRuleContentRequest.method, register: (h, fn) => h.onGetRuleContent(fn) },
    { name: 'onValidateRule', method: ValidateRuleRequest.method, register: (h, fn) => h.onValidateRule(fn) },
    { name: 'onUploadRule', method: UploadRuleRequest.method, register: (h, fn) => h.onUploadRule(fn) },
    {
        name: 'onPreviewGuardHooks',
        method: PreviewGuardHooksRequest.method,
        register: (h, fn) => h.onPreviewGuardHooks(fn),
    },
];

describe('LspHooksHandlers', () => {
    let mockConnection: { onRequest: ReturnType<typeof vi.fn> };
    let handlers: LspHooksHandlers;

    beforeEach(() => {
        mockConnection = { onRequest: vi.fn() };
        handlers = new LspHooksHandlers(mockConnection as unknown as Connection);
    });

    it.each(registrations)('$name registers with method $method', ({ register, method }) => {
        const handler = vi.fn();
        register(handlers, handler);
        expect(mockConnection.onRequest).toHaveBeenCalledWith(method, handler);
    });

    it('registers every declared endpoint on a single instance', () => {
        for (const { register } of registrations) {
            register(handlers, vi.fn());
        }
        expect(mockConnection.onRequest).toHaveBeenCalledTimes(registrations.length);
        const registeredMethods = mockConnection.onRequest.mock.calls.map((call) => call[0] as string);
        expect(new Set(registeredMethods).size).toBe(registrations.length);
    });
});
