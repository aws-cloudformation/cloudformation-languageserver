import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../document/DocumentManager';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { Track } from '../telemetry/TelemetryDecorator';
import { ManagedResourceCodeLens } from './ManagedResourceCodeLens';
import { ResourceStateCodeLens } from './ResourceStateCodeLens';
import { getStackActionsCodeLenses } from './StackActionsCodeLens';

export class CodeLensProvider {
    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
        schemaRetriever: SchemaRetriever,
        private readonly managedResource: ManagedResourceCodeLens = new ManagedResourceCodeLens(syntaxTreeManager),
        private readonly resourceState: ResourceStateCodeLens = new ResourceStateCodeLens(
            syntaxTreeManager,
            schemaRetriever,
        ),
    ) {}

    @Track({ name: 'getCodeLenses' })
    getCodeLenses(uri: string) {
        const doc = this.documentManager.get(uri);
        if (!doc) {
            return;
        }

        return [
            ...getStackActionsCodeLenses(uri, doc, this.syntaxTreeManager),
            ...this.managedResource.getCodeLenses(uri, doc),
            ...this.resourceState.getCodeLenses(uri, doc),
        ];
    }
}
