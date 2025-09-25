import { ServerRequestHandler } from 'vscode-languageserver';
import { ServerComponents } from '../server/ServerComponents';
import { ListStacksParams, ListStacksResult } from '../stacks/StackRequestType';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const log = LoggerFactory.getLogger('StackHandler');

export function listStacksHandler(
    components: ServerComponents,
): ServerRequestHandler<ListStacksParams, ListStacksResult, never, void> {
    return async (params: ListStacksParams): Promise<ListStacksResult> => {
        try {
            if (params.statusToInclude?.length && params.statusToExclude?.length) {
                throw new Error('Cannot specify both statusToInclude and statusToExclude');
            }
            return { stacks: await components.cfnService.listStacks(params.statusToInclude, params.statusToExclude) };
        } catch (error) {
            log.error({ error: extractErrorMessage(error) }, 'Error listing stacks');
            return { stacks: [] };
        }
    };
}
