import { OnStackFailure } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import { DocumentType } from '../document/Document';
import { ParseCfnEnvironmentFilesParams, DeploymentConfig } from './CfnEnvironmentRequestType';

const DocumentInfoSchema = z.object({
    type: z.enum(DocumentType),
    content: z.string(),
    fileName: z.string(),
});

const ParseCfnEnvironmentFilesParamsSchema = z.object({
    documents: z.array(DocumentInfoSchema),
});

const DeploymentConfigSchema = z
    .object({
        'template-file-path': z.string().optional(),
        parameters: z.record(z.string(), z.string()).optional(),
        tags: z.record(z.string(), z.string()).optional(),
        'on-stack-failure': z.enum(OnStackFailure).optional(),
        'include-nested-stacks': z.boolean().optional(),
        'import-existing-resources': z.boolean().optional(),
    })
    .refine((data) => Object.values(data).some((value) => value !== undefined), {
        message: 'At least one property must be provided',
    });

export function parseCfnEnvironmentFileParams(input: unknown): ParseCfnEnvironmentFilesParams {
    return ParseCfnEnvironmentFilesParamsSchema.parse(input);
}

export function parseDeploymentConfig(input: unknown): DeploymentConfig {
    const parsed = DeploymentConfigSchema.parse(input);

    return {
        templateFilePath: parsed['template-file-path'],
        parameters: parsed['parameters'],
        tags: parsed['tags'],
        onStackFailure: parsed['on-stack-failure'],
        includeNestedStacks: parsed['include-nested-stacks'],
        importExistingResources: parsed['import-existing-resources'],
    };
}
