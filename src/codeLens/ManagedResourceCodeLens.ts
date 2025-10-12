import { CodeLens, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { CfnInfraCore } from '../server/CfnInfraCore';

const MANAGED_RESOURCE_CONSTANTS = {
    COMMAND_TITLE: 'Open Stack Template',
    COMMAND_NAME: 'aws.cloudformation.api.openStackTemplate',
    STACK_NAME_REGEX: /^\s*"?StackName"?\s*:/,
} as const;

export class ManagedResourceCodeLens {
    constructor(private readonly syntaxTreeManager: SyntaxTreeManager) {}

    getCodeLenses(uri: string, document: TextDocument): CodeLens[] {
        const lenses: CodeLens[] = [];

        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!syntaxTree) {
            return lenses;
        }

        const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourcesMap) {
            return lenses;
        }

        const text = document.getText();
        const lines = text.split('\n');

        for (const [, resourceContext] of resourcesMap) {
            const resource = resourceContext.entity as Resource;
            const metadata = resource.Metadata;

            if (
                metadata?.ManagedByStack === true &&
                typeof metadata.StackName === 'string' &&
                typeof metadata.PrimaryIdentifier === 'string'
            ) {
                const stackName = metadata.StackName;
                const primaryIdentifier = metadata.PrimaryIdentifier;

                const startRow = resourceContext.startPosition.row;
                const endRow = resourceContext.endPosition.row;

                for (let i = startRow; i <= endRow && i < lines.length; i++) {
                    if (MANAGED_RESOURCE_CONSTANTS.STACK_NAME_REGEX.test(lines[i])) {
                        lenses.push({
                            range: Range.create(Position.create(i, 0), Position.create(i, 0)),
                            command: {
                                title: MANAGED_RESOURCE_CONSTANTS.COMMAND_TITLE,
                                command: MANAGED_RESOURCE_CONSTANTS.COMMAND_NAME,
                                arguments: [stackName, primaryIdentifier],
                            },
                        });
                        break;
                    }
                }
            }
        }

        return lenses;
    }

    static create(core: CfnInfraCore): ManagedResourceCodeLens {
        return new ManagedResourceCodeLens(core.syntaxTreeManager);
    }
}
