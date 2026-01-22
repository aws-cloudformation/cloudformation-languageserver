import { CodeLens, Position, Range } from 'vscode-languageserver';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { getEntityMap } from '../context/SectionContextBuilder';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { Document } from '../document/Document';

const STACK_ACTION_TITLES = {
    DEPLOY: 'Validate and Deploy',
} as const;

const STACK_ACTION_COMMANDS = {
    DEPLOY: 'aws.cloudformation.api.deployTemplate',
} as const;

export function getStackActionsCodeLenses(
    uri: string,
    document: Document,
    syntaxTreeManager: SyntaxTreeManager,
): CodeLens[] {
    const syntaxTree = syntaxTreeManager.getSyntaxTree(uri);
    if (!syntaxTree) {
        return [];
    }

    const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
    if (!resourcesMap || resourcesMap.size === 0) {
        return [];
    }

    if (!document.isTemplate()) {
        document.updateCfnFileType();
        if (!document.isTemplate()) {
            return [];
        }
    }

    let codeLensLine = 0;
    const lines = document.getLines();
    if (!lines) {
        return [];
    }
    for (const [i, line] of lines.entries()) {
        const lineContents = line.trim();
        if (lineContents.length > 0 && !lineContents.startsWith('#')) {
            codeLensLine = i;
            break;
        }
    }

    const range = Range.create(Position.create(codeLensLine, 0), Position.create(codeLensLine, 0));

    return [
        {
            range,
            command: {
                title: STACK_ACTION_TITLES.DEPLOY,
                command: STACK_ACTION_COMMANDS.DEPLOY,
                arguments: [uri],
            },
        },
    ];
}
