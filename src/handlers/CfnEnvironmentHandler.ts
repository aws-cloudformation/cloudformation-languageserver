import { load } from 'js-yaml';
import { RequestHandler } from 'vscode-languageserver';
import { parseDeploymentConfig, parseCfnEnvironmentFileParams } from '../cfnEnvironments/CfnEnvironmentParser';
import {
    ParsedCfnEnvironmentFile,
    ParseCfnEnvironmentFilesParams,
    ParseCfnEnvironmentFilesResult,
} from '../cfnEnvironments/CfnEnvironmentRequestType';
import { DocumentType } from '../document/Document';
import { TelemetryService } from '../telemetry/TelemetryService';
import { handleLspError } from '../utils/Errors';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';

export function parseCfnEnvironmentFilesHandler(): RequestHandler<
    ParseCfnEnvironmentFilesParams,
    ParseCfnEnvironmentFilesResult,
    void
> {
    const telemetry = TelemetryService.instance.get('CfnEnvironmentHandler');

    return (rawParams): ParseCfnEnvironmentFilesResult => {
        return telemetry.measure('parseCfnEnvironmentFiles', () => {
            try {
                const parsedFiles: ParsedCfnEnvironmentFile[] = [];

                const params = parseWithPrettyError(parseCfnEnvironmentFileParams, rawParams);

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
                        telemetry.count('cfnEnvironmentFile.malformed', 1);
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
