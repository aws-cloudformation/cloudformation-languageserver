import { z } from 'zod';
import {
    GetRelatedResourceTypesParams,
    InsertRelatedResourcesParams,
    TemplateUri,
} from '../protocol/RelatedResourcesProtocol';

const TemplateUriSchema = z.string().min(1);

const GetRelatedResourceTypesParamsSchema = z.object({
    parentResourceType: z.string().min(1),
});

const InsertRelatedResourcesParamsSchema = z.object({
    templateUri: z.string().min(1),
    relatedResourceTypes: z.array(z.string().min(1)).min(1),
    parentResourceType: z.string().min(1),
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
