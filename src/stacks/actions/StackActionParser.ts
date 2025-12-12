import { Capability, OnStackFailure } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import { NonEmptyZodString, CfnNameZodString } from '../../utils/ZodModel';
import {
    ListStackResourcesParams,
    GetStackEventsParams,
    ClearStackEventsParams,
    DescribeStackParams,
    DescribeChangeSetParams,
    DescribeEventsParams,
} from '../StackRequestType';
import {
    CreateDeploymentParams,
    CreateValidationParams,
    DeleteChangeSetParams,
    DeploymentMode,
    TemplateUri,
} from './StackActionRequestType';

const CapabilitySchema = z.enum([
    Capability.CAPABILITY_AUTO_EXPAND,
    Capability.CAPABILITY_IAM,
    Capability.CAPABILITY_NAMED_IAM,
]);

const ParameterSchema = z.object({
    ParameterKey: z.string().optional(),
    ParameterValue: z.string().optional(),
    UsePreviousValue: z.boolean().optional(),
    ResolvedValue: z.string().optional(),
});

const TagSchema = z.object({
    Key: z.string(),
    Value: z.string(),
});

const OnStackFailureSchema = z.enum([OnStackFailure.DELETE, OnStackFailure.DO_NOTHING, OnStackFailure.ROLLBACK]);

const ResourceToImportSchema = z.object({
    ResourceType: z.string(),
    LogicalResourceId: z.string(),
    ResourceIdentifier: z.record(z.string(), z.string()),
});

const DeploymentModeSchema = z.enum([DeploymentMode.REVERT_DRIFT]);

const CreateValidationParamsSchema = z.object({
    id: NonEmptyZodString,
    uri: NonEmptyZodString,
    stackName: CfnNameZodString,
    parameters: z.array(ParameterSchema).optional(),
    capabilities: z.array(CapabilitySchema).optional(),
    resourcesToImport: z.array(ResourceToImportSchema).optional(),
    keepChangeSet: z.boolean().optional(),
    onStackFailure: OnStackFailureSchema.optional(),
    includeNestedStacks: z.boolean().optional(),
    tags: z.array(TagSchema).optional(),
    importExistingResources: z.boolean().optional(),
    deploymentMode: DeploymentModeSchema.optional(),
    s3Bucket: z.string().optional(),
    s3Key: z.string().optional(),
});

const CreateDeploymentParamsSchema = z.object({
    id: NonEmptyZodString,
    stackName: CfnNameZodString,
    changeSetName: CfnNameZodString,
});

const DeleteChangeSetParamsSchema = z.object({
    id: NonEmptyZodString,
    stackName: CfnNameZodString,
    changeSetName: CfnNameZodString,
});

const DescribeChangeSetParamsSchema = z.object({
    stackName: CfnNameZodString,
    changeSetName: CfnNameZodString,
});

const TemplateUriSchema = NonEmptyZodString;

const ListStackResourcesParamsSchema = z.object({
    stackName: NonEmptyZodString,
    nextToken: z.string().optional(),
    maxItems: z.number().optional(),
});

const GetStackEventsParamsSchema = z.object({
    stackName: CfnNameZodString,
    nextToken: z.string().optional(),
    refresh: z.boolean().optional(),
});

const ClearStackEventsParamsSchema = z.object({
    stackName: CfnNameZodString,
});

const DescribeStackParamsSchema = z.object({
    stackName: CfnNameZodString,
});

const DescribeEventsParamsSchema = z
    .object({
        stackName: CfnNameZodString.optional(),
        changeSetName: CfnNameZodString.optional(),
        operationId: z.string().optional(),
        failedEventsOnly: z.boolean().optional(),
        nextToken: z.string().optional(),
    })
    .refine((data) => data.stackName ?? data.changeSetName ?? data.operationId, {
        message: 'At least one of stackName, changeSetName, or operationId must be provided',
    });

export function parseCreateValidationParams(input: unknown): CreateValidationParams {
    return CreateValidationParamsSchema.parse(input);
}

export function parseCreateDeploymentParams(input: unknown): CreateDeploymentParams {
    return CreateDeploymentParamsSchema.parse(input);
}

export function parseDeleteChangeSetParams(input: unknown): DeleteChangeSetParams {
    return DeleteChangeSetParamsSchema.parse(input);
}

export function parseTemplateUriParams(input: unknown): TemplateUri {
    return TemplateUriSchema.parse(input);
}

export function parseListStackResourcesParams(input: unknown): ListStackResourcesParams {
    return ListStackResourcesParamsSchema.parse(input);
}

export function parseGetStackEventsParams(input: unknown): GetStackEventsParams {
    return GetStackEventsParamsSchema.parse(input);
}

export function parseClearStackEventsParams(input: unknown): ClearStackEventsParams {
    return ClearStackEventsParamsSchema.parse(input);
}

export function parseDescribeStackParams(input: unknown): DescribeStackParams {
    return DescribeStackParamsSchema.parse(input);
}

export function parseDescribeChangeSetParams(input: unknown): DescribeChangeSetParams {
    return DescribeChangeSetParamsSchema.parse(input);
}

export function parseDescribeEventsParams(input: unknown): DescribeEventsParams {
    return DescribeEventsParamsSchema.parse(input);
}
