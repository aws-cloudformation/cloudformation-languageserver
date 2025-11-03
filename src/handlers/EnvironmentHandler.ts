import { load } from 'js-yaml';
import { RequestHandler } from 'vscode-languageserver';
import { DocumentType } from '../document/Document';
import { parseDeploymentConfig, parseEnvironmentFileParams } from '../environments/EnvironmentParser';
import {
    ParsedEnvironmentFile,
    ParseEnvironmentFilesParams,
    ParseEnvironmentFilesResult,
} from '../environments/EnvironmentRequestType';
import { TelemetryService } from '../telemetry/TelemetryService';
import { handleLspError } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function parseEnvironmentFilesHandler(): RequestHandler<
    ParseEnvironmentFilesParams,
    ParseEnvironmentFilesResult,
    void
> {
    const telemetry = TelemetryService.instance.get('EnvironmentHandler');

    return (rawParams): ParseEnvironmentFilesResult => {
        return telemetry.measure('parseEnvironmentFiles', () => {
            try {
                const parsedFiles: ParsedEnvironmentFile[] = [];

                const params = parseWithPrettyError(parseEnvironmentFileParams, rawParams);

                for (const document of params.documents) {
                    try {
                        let parsedContent: unknown;
                        if (document.type === DocumentType.JSON) {
                            parsedContent = JSON.parse(document.content);
                        } else if (document.type === DocumentType.YAML) {
                            parsedContent = load(document.content);
                        } else {
                            continue;
                        }

                        const deploymentConfig = parseWithPrettyError(parseDeploymentConfig, parsedContent);

                        parsedFiles.push({
                            fileName: document.fileName,
                            deploymentConfig: deploymentConfig,
                        });
                    } catch {
                        telemetry.count('environmentFile.malformed', 1);
                    }
                }

                return {
                    parsedFiles: parsedFiles,
                };
            } catch (error) {
                handleLspError(error, 'Failed to parse environment files');
            }
        });
    };
}
