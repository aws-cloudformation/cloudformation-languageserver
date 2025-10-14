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
            this.log.debug({ uri }, 'Document not found');
            return undefined;
        }

        if (!this.documentManager.isTemplate(uri)) {
            this.log.debug({ uri }, 'Document is not a CloudFormation template');
            return undefined;
        }

        try {
            return new FileContext(uri, document.documentType, document.contents());
        } catch (error) {
            this.log.error({ error, uri }, 'Failed to create file context');
            return undefined;
        }
    }
}
