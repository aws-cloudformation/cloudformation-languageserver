import { RequestHandler } from 'vscode-languageserver';
import type { HooksManager } from '../hooks/HooksManager';
import {
    parseActivateHookParams,
    parseConfigureHookParams,
    parseDescribeHookParams,
    parseGetHookResultParams,
    parseListHookResultsParams,
    parseSetHookConfigurationParams,
} from '../hooks/HooksParser';
import type {
    ActivateHookParams,
    ActivateHookResult,
    ConfigureHookParams,
    ConfigureHookResult,
    ListHooksParams,
    ListHooksResult,
    DescribeHookParams,
    DescribeHookResult,
    ListHookResultsParams,
    ListHookResultsResult,
    GetHookResultParams,
    GetHookResultResult,
    SetHookConfigurationParams,
    SetHookConfigurationResult,
} from '../hooks/HooksRequestType';
import type { CfnService } from '../services/CfnService';
import { handleLspError } from '../utils/Errors';

type HooksComponents = {
    hooksManager: HooksManager;
    cfnService: CfnService;
};

export function listHooksHandler(components: HooksComponents): RequestHandler<ListHooksParams, ListHooksResult, void> {
    return async (params) => {
        try {
            return await components.hooksManager.listHooks(params.loadMore);
        } catch (error) {
            handleLspError(error, 'listHooks');
        }
    };
}

export function describeHookHandler(
    components: HooksComponents,
): RequestHandler<DescribeHookParams, DescribeHookResult, void> {
    return async (params) => {
        try {
            const parsed = parseDescribeHookParams(params);
            return await components.hooksManager.describeHook(parsed);
        } catch (error) {
            handleLspError(error, 'describeHook');
        }
    };
}

export function listHookResultsHandler(
    components: HooksComponents,
): RequestHandler<ListHookResultsParams, ListHookResultsResult, void> {
    return async (params) => {
        try {
            const parsed = parseListHookResultsParams(params);
            const response = await components.cfnService.listHookResults(parsed);
            return {
                hookResults: (response.HookResults ?? []).map((r) => ({
                    hookResultId: r.HookResultId ?? '',
                    hookTypeArn: '',
                    hookTypeName: r.TypeName ?? '',
                    invocationPoint: r.InvocationPoint ?? '',
                    hookStatus: r.Status ?? '',
                    failureMode: r.FailureMode ?? '',
                    targetId: r.TargetId,
                    targetType: r.TargetType,
                    timestamp: r.InvokedAt?.toISOString(),
                })),
                nextToken: response.NextToken,
            };
        } catch (error) {
            handleLspError(error, 'listHookResults');
        }
    };
}

export function getHookResultHandler(
    components: HooksComponents,
): RequestHandler<GetHookResultParams, GetHookResultResult, void> {
    return async (params) => {
        try {
            const parsed = parseGetHookResultParams(params);
            const response = await components.cfnService.getHookResult(parsed.hookResultId);
            return {
                hookResultId: response.HookResultId ?? '',
                hookTypeName: response.TypeName ?? '',
                hookStatus: response.Status ?? '',
                failureMode: response.FailureMode ?? '',
                invocationPoint: response.InvocationPoint ?? '',
                annotations: response.Annotations?.map((a) => ({
                    severity: a.SeverityLevel ?? '',
                    statusMessage: a.StatusMessage ?? '',
                    remediationLink: a.RemediationLink,
                })),
                target: response.Target
                    ? {
                          targetType: response.Target.TargetType ?? '',
                          targetName: response.Target.TargetTypeName ?? '',
                          targetId: response.Target.TargetId,
                          action: response.Target.Action,
                      }
                    : undefined,
                timestamp: response.InvokedAt?.toISOString(),
            };
        } catch (error) {
            handleLspError(error, 'getHookResult');
        }
    };
}

export function configureHookHandler(
    components: HooksComponents,
): RequestHandler<ConfigureHookParams, ConfigureHookResult, void> {
    return async (params) => {
        try {
            const parsed = parseConfigureHookParams(params);

            // Read current configuration
            const currentConfig = await components.cfnService.getHookConfiguration(parsed.typeName);
            const config = JSON.parse(currentConfig) as Record<string, unknown>;

            // Merge failure mode into existing configuration
            const hookConfig = ((config.CloudFormationConfiguration as Record<string, unknown>) ??= {});
            const hookConfiguration = ((hookConfig.HookConfiguration as Record<string, unknown>) ??= {});
            hookConfiguration.FailureMode = parsed.failureMode;

            const response = await components.cfnService.setHookConfiguration({
                typeName: parsed.typeName,
                configuration: JSON.stringify(config),
            });
            components.hooksManager.clearCache();
            return {
                configurationArn: response.ConfigurationArn,
            };
        } catch (error) {
            handleLspError(error, 'configureHook');
        }
    };
}

export function activateHookHandler(
    components: HooksComponents,
): RequestHandler<ActivateHookParams, ActivateHookResult, void> {
    return async (params) => {
        try {
            const parsed = parseActivateHookParams(params);
            const response = await components.cfnService.activateHook(parsed);
            components.hooksManager.clearCache();
            return { arn: response.Arn };
        } catch (error) {
            handleLspError(error, 'activateHook');
        }
    };
}

export function setHookConfigurationHandler(
    components: HooksComponents,
): RequestHandler<SetHookConfigurationParams, SetHookConfigurationResult, void> {
    return async (params) => {
        try {
            const parsed = parseSetHookConfigurationParams(params);
            const response = await components.cfnService.setHookConfiguration({
                typeName: parsed.typeName,
                configuration: parsed.configuration,
            });
            components.hooksManager.clearCache();
            return { configurationArn: response.ConfigurationArn };
        } catch (error) {
            handleLspError(error, 'setHookConfiguration');
        }
    };
}
