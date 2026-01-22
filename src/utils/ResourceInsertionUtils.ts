import { SyntaxNode } from 'tree-sitter';
import { Position } from 'vscode-languageserver';
import { stringify as yamlStringify } from 'yaml';
import { TopLevelSection } from '../context/CloudFormationEnums';
import { getEntityMap } from '../context/SectionContextBuilder';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { Document, DocumentType } from '../document/Document';
import { RelatedResourceObject } from '../relatedResources/RelatedResourcesSnippetProvider';
import { EditorSettings } from '../settings/Settings';
import { getIndentationString } from './IndentationUtils';

export type InsertPosition = {
    position: Position;
    commaPrefixNeeded: boolean;
    newLineSuffixNeeded: boolean;
};

export function getResourceSection(syntaxTree: SyntaxTree): SyntaxNode | undefined {
    const topLevelSections = syntaxTree.findTopLevelSections([TopLevelSection.Resources]);
    return topLevelSections.get(TopLevelSection.Resources);
}

export function getInsertPosition(resourcesSection: SyntaxNode | undefined, document: Document): InsertPosition {
    if (document.documentType === DocumentType.YAML) {
        let position: Position;
        if (resourcesSection) {
            position =
                document.getLine(resourcesSection.endPosition.row)?.trim().length === 0
                    ? { line: resourcesSection.endPosition.row, character: 0 }
                    : { line: resourcesSection.endPosition.row + 1, character: 0 };
        } else {
            const lineCount = document.lineCount ?? 1;
            position =
                document.getLine(lineCount - 1)?.trim().length === 0
                    ? { line: lineCount - 1, character: 0 }
                    : { line: lineCount, character: 0 };
        }
        return { position, commaPrefixNeeded: false, newLineSuffixNeeded: false };
    }

    // JSON handling
    let line = resourcesSection ? resourcesSection.endPosition.row : (document.lineCount ?? 1) - 1;
    while (line > 0) {
        const previousLine = document.getLine(line - 1);
        if (previousLine === undefined) {
            return { position: { line, character: 0 }, commaPrefixNeeded: false, newLineSuffixNeeded: false };
        } else if (previousLine.trim().length > 0) {
            if (previousLine.trimEnd().endsWith(',') || previousLine.trimEnd().endsWith('{')) {
                return {
                    position: { line, character: 0 },
                    commaPrefixNeeded: false,
                    newLineSuffixNeeded: true,
                };
            }
            return {
                position: { line: line - 1, character: previousLine.trimEnd().length },
                commaPrefixNeeded: true,
                newLineSuffixNeeded: false,
            };
        }
        line--;
    }
    // malformed case, allow import to end of document
    return {
        position: { line: document.lineCount ?? 0, character: 0 },
        commaPrefixNeeded: false,
        newLineSuffixNeeded: false,
    };
}

export function combineResourcesToDocumentFormat(
    resources: RelatedResourceObject[],
    documentType: DocumentType,
    resourceSectionExists: boolean,
    editorSettings: EditorSettings,
): string {
    const combined = {};
    for (const resource of resources) {
        Object.assign(combined, resource);
    }
    const output = resourceSectionExists ? combined : { Resources: combined };

    if (documentType === DocumentType.JSON) {
        const indent = getIndentationString(editorSettings, documentType);
        const outputWithoutEnclosingBracesAndNewline = JSON.stringify(output, undefined, indent.length).slice(2, -2);

        if (resourceSectionExists) {
            return indent + outputWithoutEnclosingBracesAndNewline.replaceAll('\n', '\n' + indent);
        } else {
            return outputWithoutEnclosingBracesAndNewline;
        }
    }

    // YAML handling
    const indent = getIndentationString(editorSettings, documentType);
    const yamlOutput = yamlStringify(output, { indent: indent.length });
    if (resourceSectionExists) {
        return '\n' + indent + yamlOutput.replaceAll('\n', '\n' + indent).trim();
    } else {
        return '\n' + yamlOutput.trim();
    }
}

export function generateUniqueLogicalId(baseId: string, syntaxTree: SyntaxTree, additionalIds?: Set<string>): string {
    const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
    const existingIds = new Set<string>(resourcesMap?.keys());

    if (additionalIds) {
        for (const id of additionalIds) {
            existingIds.add(id);
        }
    }

    if (!existingIds.has(baseId)) {
        return baseId;
    }

    let counter = 1;
    while (existingIds.has(`${baseId}${counter}`)) {
        counter++;
    }
    return `${baseId}${counter}`;
}
