import { LspAuthHandlers } from './LspAuthHandlers';
import { LspCommunication } from './LspCommunication';
import { LspDiagnostics } from './LspDiagnostics';
import { LspDocuments } from './LspDocuments';
import { LspEnvironmentHandlers } from './LspEnvironmentHandlers';
import { LspHandlers } from './LspHandlers';
import { LspRelatedResourcesHandlers } from './LspRelatedResourcesHandlers';
import { LspResourceHandlers } from './LspResourceHandlers';
import { LspS3Handlers } from './LspS3Handlers';
import { LspStackHandlers } from './LspStackHandlers';
import { LspWorkspace } from './LspWorkspace';

export class LspComponents {
    constructor(
        public readonly diagnostics: LspDiagnostics,
        public readonly workspace: LspWorkspace,
        public readonly documents: LspDocuments,
        public readonly communication: LspCommunication,
        public readonly handlers: LspHandlers,
        public readonly authHandlers: LspAuthHandlers,
        public readonly stackHandlers: LspStackHandlers,
        public readonly environmentHandlers: LspEnvironmentHandlers,
        public readonly resourceHandlers: LspResourceHandlers,
        public readonly relatedResourcesHandlers: LspRelatedResourcesHandlers,
        public readonly s3Handlers: LspS3Handlers,
    ) {}
}
