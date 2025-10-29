import { DocumentManager } from '../document/DocumentManager';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { FileContext } from './FileContext';

/**
 * Manages file-based context generation for CloudFormation documents.
 */
export class FileContextManager {
    private readonly log = LoggerFactory.getLogger(FileContextManager);

    constructor(private readonly documentManager: DocumentManager) {}

    @Track({ name: 'getFileContext' })
    public getFileContext(uri: string): FileContext | undefined {
        const document = this.documentManager.get(uri);
        if (!document) {
            return undefined;
        }

        if (!this.documentManager.isTemplate(uri)) {
            return undefined;
        }

        try {
            return new FileContext(uri, document.documentType, document.contents());
        } catch (error) {
            this.log.error(error, `Failed to create file context ${uri}`);
            return undefined;
        }
    }
}
