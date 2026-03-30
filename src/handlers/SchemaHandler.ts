import { ErrorCodes, ResponseError, RequestHandler } from 'vscode-languageserver';
import { parseSchemaReadinessRequest } from '../schema/SchemaRequestParser';
import { SchemaReadinessRequest, SchemaReadinessResponse } from '../schema/SchemaRequestType';
import { ServerComponents } from '../server/ServerComponents';
import { extractErrorMessage } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function schemaReadinessHandler(
    components: ServerComponents,
): RequestHandler<SchemaReadinessRequest, SchemaReadinessResponse, void> {
    return (rawParams) => {
        try {
            const params = parseWithPrettyError(parseSchemaReadinessRequest, rawParams);
            const publicSchemas = components.schemaStore.getPublicSchemas(params.region);
            return {
                region: params.region,
                schemasReady: publicSchemas !== undefined && publicSchemas.schemas.length > 0,
            };
        } catch (error) {
            if (error instanceof ResponseError) {
                throw error;
            }
            throw new ResponseError(
                ErrorCodes.InternalError,
                `Failed to check schema readiness: ${extractErrorMessage(error)}`,
            );
        }
    };
}
