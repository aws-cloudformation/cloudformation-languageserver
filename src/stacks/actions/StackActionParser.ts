import { Capability, OnStackFailure } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import {
    ListStackResourcesParams,
    GetStackEventsParams,
    ClearStackEventsParams,
    DescribeStackParams,
    DescribeChangeSetParams,
} from '../StackRequestType';
import {
    CreateDeploymentParams,
    CreateValidationParams,
    DeleteChangeSetParams,
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

const CreateValidationParamsSchema = z.object({
    id: z.string().min(1),
    uri: z.string().min(1),
    stackName: z.string().min(1).max(128),
    parameters: z.array(ParameterSchema).optional(),
    capabilities: z.array(CapabilitySchema).optional(),
    resourcesToImport: z.array(ResourceToImportSchema).optional(),
    keepChangeSet: z.boolean().optional(),
    onStackFailure: OnStackFailureSchema.optional(),
    includeNestedStacks: z.boolean().optional(),
    tags: z.array(TagSchema).optional(),
    importExistingResources: z.boolean().optional(),
    s3Bucket: z.string().optional(),
    s3Key: z.string().optional(),
});

const CreateDeploymentParamsSchema = z.object({
    id: z.string().min(1),
    stackName: z.string().min(1).max(128),
    changeSetName: z.string().min(1).max(128),
});

const DeleteChangeSetParamsSchema = z.object({
    id: z.string().min(1),
    stackName: z.string().min(1).max(128),
    changeSetName: z.string().min(1).max(128),
});

const DescribeChangeSetParamsSchema = z.object({
    stackName: z.string().min(1).max(128),
    changeSetName: z.string().min(1).max(128),
});

const TemplateUriSchema = z.string().min(1);

const ListStackResourcesParamsSchema = z.object({
    stackName: z.string().min(1),
    nextToken: z.string().optional(),
    maxItems: z.number().optional(),
});

const GetStackEventsParamsSchema = z.object({
    stackName: z.string().min(1).max(128),
    nextToken: z.string().optional(),
    refresh: z.boolean().optional(),
});

const ClearStackEventsParamsSchema = z.object({
    stackName: z.string().min(1).max(128),
});

const DescribeStackParamsSchema = z.object({
    stackName: z.string().min(1).max(128),
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
