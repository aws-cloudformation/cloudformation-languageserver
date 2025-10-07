import { Capability } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import { CreateStackActionParams, TemplateUri } from './StackActionRequestType';

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

const StackActionParamsSchema = z.object({
    id: z.string().min(1),
    uri: z.string().min(1),
    stackName: z.string().min(1).max(128),
    parameters: z.array(ParameterSchema).optional(),
    capabilities: z.array(CapabilitySchema).optional(),
});

const TemplateUriSchema = z.string().min(1);

export function parseStackActionParams(input: unknown): CreateStackActionParams {
    return StackActionParamsSchema.parse(input);
}

export function parseTemplateUriParams(input: unknown): TemplateUri {
    return TemplateUriSchema.parse(input);
}
