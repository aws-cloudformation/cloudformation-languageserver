import { LspAuthHandlers } from './LspAuthHandlers';
import { LspCommunication } from './LspCommunication';
import { LspDiagnostics } from './LspDiagnostics';
import { LspDocuments } from './LspDocuments';
import { LspHandlers } from './LspHandlers';
import { LspResourceHandlers } from './LspResourceHandlers';
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
        public readonly resourceHandlers: LspResourceHandlers,
    ) {}
}
