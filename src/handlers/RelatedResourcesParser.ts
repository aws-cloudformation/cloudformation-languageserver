import { z } from 'zod';
import {
    GetRelatedResourceTypesParams,
    InsertRelatedResourcesParams,
    TemplateUri,
} from '../protocol/RelatedResourcesProtocol';
import { NonEmptyZodString } from '../utils/ZodModel';

const TemplateUriSchema = NonEmptyZodString;

const GetRelatedResourceTypesParamsSchema = z.object({
    parentResourceType: NonEmptyZodString,
});

const InsertRelatedResourcesParamsSchema = z.object({
    templateUri: NonEmptyZodString,
    relatedResourceTypes: z.array(NonEmptyZodString).min(1),
    parentResourceType: NonEmptyZodString,
});

export function parseTemplateUriParams(input: unknown): TemplateUri {
    return TemplateUriSchema.parse(input);
}

export function parseGetRelatedResourceTypesParams(input: unknown): GetRelatedResourceTypesParams {
    return GetRelatedResourceTypesParamsSchema.parse(input);
}

export function parseInsertRelatedResourcesParams(input: unknown): InsertRelatedResourcesParams {
    return InsertRelatedResourcesParamsSchema.parse(input);
}
