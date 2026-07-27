import { z } from 'zod';
import { NonEmptyZodString } from '../utils/ZodModel';
import type {
    ListHooksParams,
    DescribeHookParams,
    ListHookResultsParams,
    GetHookResultParams,
    ConfigureHookParams,
    SetInvocationStatusParams,
    CreateGuardHookParams,
    CreateHookExecutionRoleParams,
    CreateS3BucketParams,
    DeactivateHookParams,
    ActivateHookParams,
    SetHookConfigurationParams,
    GetHookConfigurationParams,
    GetRuleContentParams,
    ValidateRuleParams,
    UploadRuleParams,
    PreviewGuardHooksParams,
} from './HooksRequestType';

const ListHooksParamsSchema = z
    .object({
        loadMore: z.boolean().optional(),
    })
    .strict();

const DescribeHookParamsSchema = z
    .object({
        typeName: NonEmptyZodString.optional(),
        arn: NonEmptyZodString.optional(),
    })
    .strict()
    .refine((data) => data.typeName ?? data.arn, {
        message: 'At least one of typeName or arn is required',
    });

const TargetTypeEnum = z.enum(['CHANGE_SET', 'STACK', 'RESOURCE', 'CLOUD_CONTROL']);

const ListHookResultsParamsSchema = z
    .object({
        typeArn: z.string().optional(),
        status: z.string().optional(),
        targetId: z.string().optional(),
        targetType: TargetTypeEnum.optional(),
        nextToken: z.string().optional(),
    })
    .strict();

const GetHookResultParamsSchema = z
    .object({
        hookResultId: NonEmptyZodString,
    })
    .strict();

const ConfigureHookParamsSchema = z
    .object({
        typeName: NonEmptyZodString,
        failureMode: z.enum(['FAIL', 'WARN']),
    })
    .strict();

const DeactivateHookParamsSchema = z
    .object({
        typeName: NonEmptyZodString.optional(),
        arn: NonEmptyZodString.optional(),
    })
    .strict()
    .refine((data) => data.typeName ?? data.arn, {
        message: 'At least one of typeName or arn is required',
    });

export function parseListHooksParams(input: unknown): ListHooksParams {
    return ListHooksParamsSchema.parse(input);
}

export function parseDescribeHookParams(input: unknown): DescribeHookParams {
    return DescribeHookParamsSchema.parse(input);
}

export function parseListHookResultsParams(input: unknown): ListHookResultsParams {
    return ListHookResultsParamsSchema.parse(input);
}

export function parseGetHookResultParams(input: unknown): GetHookResultParams {
    return GetHookResultParamsSchema.parse(input);
}

export function parseConfigureHookParams(input: unknown): ConfigureHookParams {
    return ConfigureHookParamsSchema.parse(input);
}

const SetInvocationStatusParamsSchema = z
    .object({
        typeName: NonEmptyZodString,
        invocationStatus: z.enum(['ENABLED', 'DISABLED']),
    })
    .strict();

export function parseSetInvocationStatusParams(input: unknown): SetInvocationStatusParams {
    return SetInvocationStatusParamsSchema.parse(input);
}

const REQUIRED_GUARD_HOOK_KEYS = [
    'Alias',
    'ExecutionRole',
    'FailureMode',
    'HookStatus',
    'RuleLocation',
    'TargetOperations',
];

const CreateGuardHookParamsSchema = z
    .object({
        desiredState: NonEmptyZodString,
    })
    .strict()
    .superRefine((data, ctx) => {
        let parsed: unknown;
        try {
            parsed = JSON.parse(data.desiredState);
        } catch {
            ctx.addIssue({ code: 'custom', message: 'desiredState must be valid JSON' });
            return;
        }
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            ctx.addIssue({ code: 'custom', message: 'desiredState must be a JSON object' });
            return;
        }
        const obj = parsed as Record<string, unknown>;
        for (const key of REQUIRED_GUARD_HOOK_KEYS) {
            if (obj[key] === undefined) {
                ctx.addIssue({ code: 'custom', message: `desiredState is missing required key: ${key}` });
            }
        }
    });

export function parseCreateGuardHookParams(input: unknown): CreateGuardHookParams {
    return CreateGuardHookParamsSchema.parse(input);
}

const CreateHookExecutionRoleParamsSchema = z
    .object({
        roleName: NonEmptyZodString.regex(
            /^[A-Za-z0-9+=,.@_-]{1,64}$/,
            'Role name may contain letters, numbers, and +=,.@_- (max 64 chars)',
        ),
        ruleBucket: NonEmptyZodString.optional(),
    })
    .strict();

export function parseCreateHookExecutionRoleParams(input: unknown): CreateHookExecutionRoleParams {
    return CreateHookExecutionRoleParamsSchema.parse(input);
}

const CreateS3BucketParamsSchema = z
    .object({
        bucketName: NonEmptyZodString.regex(
            /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/,
            'Bucket names must be 3-63 chars, lowercase letters, numbers, dots, or hyphens, starting and ending alphanumeric',
        )
            .refine((name) => !/\.\.|\.-|-\./.test(name), {
                message: 'Bucket names cannot contain consecutive dots or a dot adjacent to a hyphen',
            })
            .refine(
                (name) => {
                    const parts = name.split('.');
                    return !(parts.length === 4 && parts.every((part) => /^\d+$/.test(part)));
                },
                { message: 'Bucket names cannot be formatted as an IP address' },
            ),
    })
    .strict();

export function parseCreateS3BucketParams(input: unknown): CreateS3BucketParams {
    return CreateS3BucketParamsSchema.parse(input);
}

export function parseDeactivateHookParams(input: unknown): DeactivateHookParams {
    return DeactivateHookParamsSchema.parse(input);
}

const ActivateHookParamsSchema = z
    .object({
        typeName: NonEmptyZodString,
        publisherId: NonEmptyZodString.optional(),
        typeNameAlias: NonEmptyZodString.optional(),
        executionRoleArn: NonEmptyZodString.optional(),
    })
    .strict();

const SetHookConfigurationParamsSchema = z
    .object({
        typeName: NonEmptyZodString,
        configuration: NonEmptyZodString,
    })
    .strict();

export function parseActivateHookParams(input: unknown): ActivateHookParams {
    return ActivateHookParamsSchema.parse(input);
}

export function parseSetHookConfigurationParams(input: unknown): SetHookConfigurationParams {
    return SetHookConfigurationParamsSchema.parse(input);
}

const GetHookConfigurationParamsSchema = z
    .object({
        typeName: NonEmptyZodString,
    })
    .strict();

const GetRuleContentParamsSchema = z
    .object({
        s3Uri: NonEmptyZodString,
    })
    .strict();

export function parseGetHookConfigurationParams(input: unknown): GetHookConfigurationParams {
    return GetHookConfigurationParamsSchema.parse(input);
}

export function parseGetRuleContentParams(input: unknown): GetRuleContentParams {
    return GetRuleContentParamsSchema.parse(input);
}

const ValidateRuleParamsSchema = z
    .object({
        ruleContent: NonEmptyZodString,
        sampleTemplate: z.string().optional(),
    })
    .strict();

const UploadRuleParamsSchema = z
    .object({
        ruleContent: NonEmptyZodString,
        s3Uri: NonEmptyZodString,
    })
    .strict();

export function parseValidateRuleParams(input: unknown): ValidateRuleParams {
    return ValidateRuleParamsSchema.parse(input);
}

export function parseUploadRuleParams(input: unknown): UploadRuleParams {
    return UploadRuleParamsSchema.parse(input);
}

const PreviewGuardHooksParamsSchema = z
    .object({
        templateContent: NonEmptyZodString,
    })
    .strict();

export function parsePreviewGuardHooksParams(input: unknown): PreviewGuardHooksParams {
    return PreviewGuardHooksParamsSchema.parse(input);
}
