import { RequestHandler } from 'vscode-languageserver';
import { previewGuardHooks } from '../hooks/GuardHookPreview';
import type { HooksManager } from '../hooks/HooksManager';
import {
    parseActivateHookParams,
    parseDeactivateHookParams,
    parseConfigureHookParams,
    parseSetInvocationStatusParams,
    parseCreateGuardHookParams,
    parseCreateHookExecutionRoleParams,
    parseCreateS3BucketParams,
    parseDescribeHookParams,
    parseGetHookResultParams,
    parseListHookResultsParams,
    parseListHooksParams,
    parseListPublicHooksParams,
    parseListS3ObjectsParams,
    parseSetHookConfigurationParams,
    parseGetHookConfigurationParams,
    parseGetRuleContentParams,
    parseValidateRuleParams,
    parseUploadRuleParams,
    parsePreviewGuardHooksParams,
} from '../hooks/HooksParser';
import type {
    ActivateHookParams,
    ActivateHookResult,
    DeactivateHookParams,
    DeactivateHookResult,
    ConfigureHookParams,
    SetInvocationStatusParams,
    SetInvocationStatusResult,
    CreateGuardHookParams,
    CreateGuardHookResult,
    ListIamRolesParams,
    ListIamRolesResult,
    ListS3BucketsParams,
    ListS3BucketsResult,
    ListS3ObjectsParams,
    ListS3ObjectsResult,
    ListProactiveControlsParams,
    ListProactiveControlsResult,
    CreateHookExecutionRoleParams,
    CreateHookExecutionRoleResult,
    CreateS3BucketParams,
    CreateS3BucketResult,
    ConfigureHookResult,
    ListHooksParams,
    ListHooksResult,
    ListHooksDetailedResult,
    ListPublicHooksParams,
    ListPublicHooksResult,
    DescribeHookParams,
    DescribeHookResult,
    ListHookResultsParams,
    ListHookResultsResult,
    GetHookResultParams,
    GetHookResultResult,
    SetHookConfigurationParams,
    SetHookConfigurationResult,
    GetHookConfigurationParams,
    GetHookConfigurationResult,
    GetRuleContentParams,
    GetRuleContentResult,
    ValidateRuleParams,
    ValidateRuleResult,
    UploadRuleParams,
    UploadRuleResult,
    PreviewGuardHooksParams,
    PreviewGuardHooksResult,
} from '../hooks/HooksRequestType';
import type { CcapiService } from '../services/CcapiService';
import type { CfnService } from '../services/CfnService';
import type { ControlCatalogService } from '../services/ControlCatalogService';
import { GuardEngine } from '../services/guard/GuardEngine';
import type { IamService } from '../services/IamService';
import type { S3Service } from '../services/S3Service';
import { handleLspError } from '../utils/errors/ErrorUtils';

type HooksComponents = {
    hooksManager: HooksManager;
    cfnService: CfnService;
    s3Service: S3Service;
    ccapiService: CcapiService;
    iamService: IamService;
    controlCatalogService: ControlCatalogService;
};

function parseS3Uri(s3Uri: string): { bucket: string; key: string } {
    const url = new URL(s3Uri);
    return { bucket: url.hostname, key: url.pathname.replace(/^\//, '') };
}

export function listHooksHandler(components: HooksComponents): RequestHandler<ListHooksParams, ListHooksResult, void> {
    return async (params) => {
        try {
            const parsed = parseListHooksParams(params);
            return await components.hooksManager.listHooks(parsed.loadMore);
        } catch (error) {
            handleLspError(error, 'listHooks');
        }
    };
}

export function listHooksDetailedHandler(
    components: HooksComponents,
): RequestHandler<ListHooksParams, ListHooksDetailedResult, void> {
    return async (params) => {
        try {
            const parsed = parseListHooksParams(params);
            return await components.hooksManager.listHooksDetailed(parsed.loadMore);
        } catch (error) {
            handleLspError(error, 'listHooksDetailed');
        }
    };
}

export function listPublicHooksHandler(
    components: HooksComponents,
): RequestHandler<ListPublicHooksParams, ListPublicHooksResult, void> {
    return async (params) => {
        try {
            const parsed = parseListPublicHooksParams(params);
            const response = await components.cfnService.listPublicHooks(parsed);
            return {
                hooks: response.hooks.map((h) => ({
                    typeName: h.TypeName ?? '',
                    publisherId: h.PublisherId ?? '',
                    description: h.Description,
                })),
            };
        } catch (error) {
            handleLspError(error, 'listPublicHooks');
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

            // Self-heal: a freshly-activated hook has no configuration, so getHookConfiguration
            // returns '{}'. Setting FailureMode alone would produce a config missing the required
            // HookInvocationStatus and target keys, failing the wrapper schema's oneOf. Seed the
            // known-good defaults for any required key the current config is missing.
            if (hookConfiguration.HookInvocationStatus === undefined) {
                hookConfiguration.HookInvocationStatus = 'ENABLED';
            }
            if (hookConfiguration.TargetOperations === undefined && hookConfiguration.TargetStacks === undefined) {
                hookConfiguration.TargetOperations = ['RESOURCE'];
            }
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

/**
 * Enable or disable a hook by setting HookInvocationStatus in its configuration.
 * There is no dedicated CloudFormation enable/disable API — this is a read-merge-write
 * of the type configuration. Missing required keys are self-healed so a toggle works
 * even on a freshly-activated, otherwise-unconfigured hook.
 */
export function setInvocationStatusHandler(
    components: HooksComponents,
): RequestHandler<SetInvocationStatusParams, SetInvocationStatusResult, void> {
    return async (params) => {
        try {
            const parsed = parseSetInvocationStatusParams(params);

            const currentConfig = await components.cfnService.getHookConfiguration(parsed.typeName);
            const config = JSON.parse(currentConfig) as Record<string, unknown>;

            const hookConfig = ((config.CloudFormationConfiguration as Record<string, unknown>) ??= {});
            const hookConfiguration = ((hookConfig.HookConfiguration as Record<string, unknown>) ??= {});

            if (hookConfiguration.TargetOperations === undefined && hookConfiguration.TargetStacks === undefined) {
                hookConfiguration.TargetOperations = ['RESOURCE'];
            }
            if (hookConfiguration.FailureMode === undefined) {
                hookConfiguration.FailureMode = 'FAIL';
            }
            hookConfiguration.HookInvocationStatus = parsed.invocationStatus;

            const response = await components.cfnService.setHookConfiguration({
                typeName: parsed.typeName,
                configuration: JSON.stringify(config),
            });
            components.hooksManager.clearCache();
            return {
                configurationArn: response.ConfigurationArn,
                invocationStatus: parsed.invocationStatus,
            };
        } catch (error) {
            handleLspError(error, 'setInvocationStatus');
        }
    };
}

/**
 * Create + activate a Guard Hook in one call via the Cloud Control API
 * (AWS::CloudFormation::GuardHook), mirroring the console's "Create a Hook with Guard"
 * flow. The client builds the DesiredState from the wizard; here we submit it and wait
 * for the create operation to reach a terminal state.
 */
export function createGuardHookHandler(
    components: HooksComponents,
): RequestHandler<CreateGuardHookParams, CreateGuardHookResult, void> {
    return async (params) => {
        try {
            const parsed = parseCreateGuardHookParams(params);
            const progress = await components.ccapiService.createResource(
                'AWS::CloudFormation::GuardHook',
                parsed.desiredState,
            );
            components.hooksManager.clearCache();
            if (progress.OperationStatus === 'FAILED') {
                throw new Error(
                    `Guard Hook creation failed: ${progress.ErrorCode ?? 'Unknown'} — ${progress.StatusMessage ?? ''}`,
                );
            }
            return {
                operationStatus: progress.OperationStatus,
                identifier: progress.Identifier,
                errorCode: progress.ErrorCode,
                statusMessage: progress.StatusMessage,
            };
        } catch (error) {
            handleLspError(error, 'createGuardHook');
        }
    };
}

/**
 * List IAM roles in the account so the client can offer a searchable role picker for the
 * hook execution role, instead of requiring the user to type an ARN.
 */
export function listIamRolesHandler(
    components: HooksComponents,
): RequestHandler<ListIamRolesParams, ListIamRolesResult, void> {
    return async () => {
        try {
            const roles = await components.iamService.listRoles();
            return { roles };
        } catch (error) {
            handleLspError(error, 'listIamRoles');
        }
    };
}

/**
 * List S3 bucket names for the bucket picker (rule upload, output report, input params).
 */
export function listS3BucketsHandler(
    components: HooksComponents,
): RequestHandler<ListS3BucketsParams, ListS3BucketsResult, void> {
    return async () => {
        try {
            const buckets = await components.s3Service.listAllBucketNames();
            return { buckets };
        } catch (error) {
            handleLspError(error, 'listS3Buckets');
        }
    };
}

/**
 * List object keys within an S3 bucket for the rule-object picker.
 */
export function listS3ObjectsHandler(
    components: HooksComponents,
): RequestHandler<ListS3ObjectsParams, ListS3ObjectsResult, void> {
    return async (params) => {
        try {
            const parsed = parseListS3ObjectsParams(params);
            const keys = await components.s3Service.listObjects(parsed.bucketName, parsed.prefix);
            return { keys };
        } catch (error) {
            handleLspError(error, 'listS3Objects');
        }
    };
}

/**
 * List proactive controls from the AWS Control Tower Control Catalog for the
 * control-selection step of the Control Tower hook wizard.
 */
export function listProactiveControlsHandler(
    components: HooksComponents,
): RequestHandler<ListProactiveControlsParams, ListProactiveControlsResult, void> {
    return async () => {
        try {
            const controls = await components.controlCatalogService.listProactiveControls();
            return { controls };
        } catch (error) {
            handleLspError(error, 'listProactiveControls');
        }
    };
}

/**
 * Create a new S3 bucket (in the connection's region) for storing Guard rules.
 * Surfaces creation errors (name taken, permission denied, etc.) to the client.
 */
export function createS3BucketHandler(
    components: HooksComponents,
): RequestHandler<CreateS3BucketParams, CreateS3BucketResult, void> {
    return async (params) => {
        try {
            const parsed = parseCreateS3BucketParams(params);
            await components.s3Service.createBucket(parsed.bucketName);
            return { bucketName: parsed.bucketName };
        } catch (error) {
            handleLspError(error, 'createS3Bucket');
        }
    };
}

/**
 * Create a new Guard Hook execution role (trusts hooks.cloudformation.amazonaws.com with
 * S3 read on the rule bucket) and return its ARN for use as the hook's ExecutionRole.
 */
export function createHookExecutionRoleHandler(
    components: HooksComponents,
): RequestHandler<CreateHookExecutionRoleParams, CreateHookExecutionRoleResult, void> {
    return async (params) => {
        try {
            const parsed = parseCreateHookExecutionRoleParams(params);
            return await components.iamService.createHookExecutionRole(parsed.roleName, parsed.ruleBucket);
        } catch (error) {
            handleLspError(error, 'createHookExecutionRole');
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

export function deactivateHookHandler(
    components: HooksComponents,
): RequestHandler<DeactivateHookParams, DeactivateHookResult, void> {
    return async (params) => {
        try {
            const parsed = parseDeactivateHookParams(params);
            await components.cfnService.deactivateHook(parsed);
            components.hooksManager.clearCache();
            return {};
        } catch (error) {
            handleLspError(error, 'deactivateHook');
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

export function getHookConfigurationHandler(
    components: HooksComponents,
): RequestHandler<GetHookConfigurationParams, GetHookConfigurationResult, void> {
    return async (params) => {
        try {
            const parsed = parseGetHookConfigurationParams(params);
            const configuration = await components.cfnService.getHookConfiguration(parsed.typeName);
            return { configuration };
        } catch (error) {
            handleLspError(error, 'getHookConfiguration');
        }
    };
}

export function getRuleContentHandler(
    components: HooksComponents,
): RequestHandler<GetRuleContentParams, GetRuleContentResult, void> {
    return async (params) => {
        try {
            const parsed = parseGetRuleContentParams(params);
            const { bucket, key } = parseS3Uri(parsed.s3Uri);
            const content = await components.s3Service.getObjectContent(bucket, key);
            return { content };
        } catch (error) {
            handleLspError(error, 'getRuleContent');
        }
    };
}

// Stateless engine (wraps the cfn-guard WASM); safe to share across requests.
const guardEngine = new GuardEngine();

export function validateRuleHandler(): RequestHandler<ValidateRuleParams, ValidateRuleResult, void> {
    return handleValidateRule;
}

function handleValidateRule(params: ValidateRuleParams): ValidateRuleResult {
    try {
        const parsed = parseValidateRuleParams(params);
        const result = guardEngine.validateRule(parsed.ruleContent, parsed.sampleTemplate);
        return {
            valid: result.valid,
            parseErrors: result.parseErrors,
            violations: result.violations.map((v) => ({
                ruleName: v.ruleName,
                message: v.message,
                line: v.location.line,
                column: v.location.column,
            })),
        };
    } catch (error) {
        handleLspError(error, 'validateRule');
    }
}

export function uploadRuleHandler(
    components: HooksComponents,
): RequestHandler<UploadRuleParams, UploadRuleResult, void> {
    return async (params) => {
        try {
            const parsed = parseUploadRuleParams(params);
            const { bucket, key } = parseS3Uri(parsed.s3Uri);
            await components.s3Service.putObjectContent(parsed.ruleContent, bucket, key);
            return { s3Uri: parsed.s3Uri };
        } catch (error) {
            handleLspError(error, 'uploadRule');
        }
    };
}

export function previewGuardHooksHandler(
    components: HooksComponents,
): RequestHandler<PreviewGuardHooksParams, PreviewGuardHooksResult, void> {
    return async (params) => {
        try {
            const parsed = parsePreviewGuardHooksParams(params);
            return await previewGuardHooks(
                {
                    listHooksDetailed: async () => {
                        const detailed = await components.hooksManager.listHooksDetailed();
                        return detailed.hooks;
                    },
                    fetchRuleContent: (ruleUri) =>
                        components.hooksManager.getCachedRuleContent(ruleUri, () => {
                            const { bucket, key } = parseS3Uri(ruleUri);
                            return components.s3Service.getObjectContent(bucket, key);
                        }),
                    validateTemplate: (content, rules, severity) =>
                        guardEngine.validateTemplate(content, rules, severity),
                },
                parsed.templateContent,
            );
        } catch (error) {
            handleLspError(error, 'previewGuardHooks');
        }
    };
}
