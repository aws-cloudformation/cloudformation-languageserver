import { Capability } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import { TemplateActionParams, GetParametersParams } from './TemplateRequestType';

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

const TemplateActionParamsSchema = z.object({
    id: z.string().min(1),
    uri: z.string().min(1),
    stackName: z.string().min(1).max(128),
    parameters: z.array(ParameterSchema).optional(),
    capabilities: z.array(CapabilitySchema).optional(),
});

const GetParametersParamsSchema = z.object({
    uri: z.string().min(1),
});

export function parseTemplateActionParams(input: unknown): TemplateActionParams {
    return TemplateActionParamsSchema.parse(input);
}

export function parseGetParametersParams(input: unknown): GetParametersParams {
    return GetParametersParamsSchema.parse(input);
}
