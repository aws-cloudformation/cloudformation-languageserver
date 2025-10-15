import { CodeLens } from 'vscode-languageserver';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { DocumentManager } from '../document/DocumentManager';
import { Track } from '../telemetry/TelemetryDecorator';
import { ManagedResourceCodeLens } from './ManagedResourceCodeLens';
import { getStackActionsCodeLenses } from './StackActionsCodeLens';

export class CodeLensProvider {
    constructor(
        syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
        private readonly managedResource: ManagedResourceCodeLens = new ManagedResourceCodeLens(syntaxTreeManager),
    ) {}

    @Track({ name: 'getCodeLenses' })
    getCodeLenses(uri: string): CodeLens[] | undefined {
        const doc = this.documentManager.get(uri);
        if (!doc) {
            return undefined;
        }

        return [...getStackActionsCodeLenses(uri), ...this.managedResource.getCodeLenses(uri, doc)];
    }
}
