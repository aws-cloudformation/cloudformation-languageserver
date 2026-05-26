import { Connection, RequestHandler } from 'vscode-languageserver';
import {
    ListHooksParams,
    ListHooksResult,
    ListHooksRequest,
    DescribeHookParams,
    DescribeHookResult,
    DescribeHookRequest,
    ListHookResultsParams,
    ListHookResultsResult,
    ListHookResultsRequest,
    GetHookResultParams,
    GetHookResultResult,
    GetHookResultRequest,
    ConfigureHookParams,
    ConfigureHookResult,
    ConfigureHookRequest,
    DeactivateHookParams,
    DeactivateHookResult,
    DeactivateHookRequest,
    ActivateHookParams,
    ActivateHookResult,
    ActivateHookRequest,
    SetHookConfigurationParams,
    SetHookConfigurationResult,
    SetHookConfigurationRequest,
} from '../hooks/HooksRequestType';

export class LspHooksHandlers {
    constructor(private readonly connection: Connection) {}

    onListHooks(handler: RequestHandler<ListHooksParams, ListHooksResult, void>) {
        this.connection.onRequest(ListHooksRequest.method, handler);
    }

    onDescribeHook(handler: RequestHandler<DescribeHookParams, DescribeHookResult, void>) {
        this.connection.onRequest(DescribeHookRequest.method, handler);
    }

    onListHookResults(handler: RequestHandler<ListHookResultsParams, ListHookResultsResult, void>) {
        this.connection.onRequest(ListHookResultsRequest.method, handler);
    }

    onGetHookResult(handler: RequestHandler<GetHookResultParams, GetHookResultResult, void>) {
        this.connection.onRequest(GetHookResultRequest.method, handler);
    }

    onConfigureHook(handler: RequestHandler<ConfigureHookParams, ConfigureHookResult, void>) {
        this.connection.onRequest(ConfigureHookRequest.method, handler);
    }

    onDeactivateHook(handler: RequestHandler<DeactivateHookParams, DeactivateHookResult, void>) {
        this.connection.onRequest(DeactivateHookRequest.method, handler);
    }

    onActivateHook(handler: RequestHandler<ActivateHookParams, ActivateHookResult, void>) {
        this.connection.onRequest(ActivateHookRequest.method, handler);
    }

    onSetHookConfiguration(handler: RequestHandler<SetHookConfigurationParams, SetHookConfigurationResult, void>) {
        this.connection.onRequest(SetHookConfigurationRequest.method, handler);
    }
}
