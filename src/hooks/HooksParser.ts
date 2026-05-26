import { z } from 'zod';
import { NonEmptyZodString } from '../utils/ZodModel';
import type {
    ListHooksParams,
    DescribeHookParams,
    ListHookResultsParams,
    GetHookResultParams,
    ConfigureHookParams,
    DeactivateHookParams,
    ActivateHookParams,
    SetHookConfigurationParams,
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
