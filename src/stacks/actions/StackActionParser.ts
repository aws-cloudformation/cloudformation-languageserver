import { Capability } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
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

const ResourceToImportSchema = z.object({
    ResourceType: z.string(),
    LogicalResourceId: z.string(),
    ResourceIdentifier: z.record(z.string(), z.string()),
});

const StackActionParamsSchema = z.object({
    id: z.string().min(1),
    uri: z.string().min(1),
    stackName: z.string().min(1).max(128),
    parameters: z.array(ParameterSchema).optional(),
    capabilities: z.array(CapabilitySchema).optional(),
    resourcesToImport: z.array(ResourceToImportSchema).optional(),
    keepChangeSet: z.boolean().optional(),
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

const TemplateUriSchema = z.string().min(1);

export function parseStackActionParams(input: unknown): CreateValidationParams {
    return StackActionParamsSchema.parse(input);
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
