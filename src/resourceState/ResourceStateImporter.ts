import { CompletionItem, CompletionItemKind, InsertTextFormat, Position, Range, TextEdit } from 'vscode-languageserver';
import { stringify as yamlStringify } from 'yaml';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { SyntaxTree } from '../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { Document, DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { PlaceholderReplacer } from '../schema/transformers/PlaceholderConstants';
import { TransformersUtil } from '../schema/transformers/TransformersUtil';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry, Measure } from '../telemetry/TelemetryDecorator';
import { getIndentationString } from '../utils/IndentationUtils';
import { ResourceStateManager } from './ResourceStateManager';
import {
    DeletionPolicyOnImport,
    ResourceIdentifier,
    ResourceSelection,
    ResourceStateParams,
    ResourceStatePurpose,
    ResourceStateResult,
    ResourceTemplateFormat,
    ResourceType,
} from './ResourceStateTypes';
import { StackManagementInfoProvider } from './StackManagementInfoProvider';

interface ResourcesSection {
    endPosition: { row: number };
}

const log = LoggerFactory.getLogger('ResourceStateImporter');

export class ResourceStateImporter {
    @Telemetry() private readonly telemetry!: ScopedTelemetry;
    private readonly importTransformers = TransformersUtil.createTransformers(ResourceStatePurpose.IMPORT);
    private readonly cloneTransformers = TransformersUtil.createTransformers(ResourceStatePurpose.CLONE);

    constructor(
        private readonly documentManager: DocumentManager,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly resourceStateManager: ResourceStateManager,
        private readonly schemaRetriever: SchemaRetriever,
        private readonly stackManagementInfoProvider: StackManagementInfoProvider,
    ) {
        this.initializeCounters();
    }

    @Measure({ name: 'importResourceState' })
    public async importResourceState(params: ResourceStateParams): Promise<ResourceStateResult> {
        const { resourceSelections, textDocument, purpose, parentResourceType } = params;

        this.telemetry.count(`purpose.${purpose.toLowerCase()}`, 1);

        if (!resourceSelections) {
            return this.getFailureResponse('No resources selected for import.');
        }

        const document = this.documentManager.get(textDocument.uri);
        if (!document) {
            return this.getFailureResponse('Import failed. Document not found.');
        }

        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(textDocument.uri);
        if (!syntaxTree) {
            return this.getFailureResponse('Import failed. Syntax tree not found');
        }

        const { fetchedResourceStates, importResult } = await this.getResourceStates(
            resourceSelections,
            syntaxTree,
            purpose,
            parentResourceType,
        );

        this.recordStateFetchMetrics(resourceSelections, importResult);

        if (fetchedResourceStates.length === 0) {
            return importResult;
        }

        let warning: string | undefined;
        if (purpose === ResourceStatePurpose.IMPORT) {
            warning = this.checkAndWarnManagedResources(fetchedResourceStates);
            if (warning) {
                this.telemetry.count('managed.warning', 1);
            }
        }

        const resourceSection = this.getResourceSection(syntaxTree);
        const resourceSectionExists = resourceSection !== undefined;

        this.telemetry.count(`document.${document.documentType.toLowerCase()}`, 1);
        this.telemetry.countBoolean('section.create', !resourceSectionExists);

        const insertPosition = this.getInsertPosition(resourceSection, document);
        const docFormattedText = this.combineResourcesToDocumentFormat(
            fetchedResourceStates,
            document.documentType,
            resourceSectionExists,
            document.uri,
            insertPosition.commaPrefixNeeded,
            insertPosition.replaceEntireFile,
        );

        let snippetText: string;
        let textEdit: TextEdit;

        if (insertPosition.replaceEntireFile) {
            // Replace entire file with properly formatted JSON
            snippetText = docFormattedText;
            const endPosition = { line: document.lineCount, character: 0 };
            textEdit = TextEdit.replace(Range.create({ line: 0, character: 0 }, endPosition), snippetText);
        } else {
            // Insert at specific position
            const commaPrefix = insertPosition.commaPrefixNeeded ? ',\n' : '';
            const newLineSuffix = insertPosition.newLineSuffixNeeded ? '\n' : '';
            snippetText = commaPrefix + docFormattedText + newLineSuffix;
            textEdit = TextEdit.replace(Range.create(insertPosition.position, insertPosition.position), snippetText);
        }

        const completionItem: CompletionItem = {
            label: purpose === ResourceStatePurpose.IMPORT ? 'Import Resource State' : 'Clone Resource',
            kind: CompletionItemKind.Snippet,
            insertText: snippetText,
            insertTextFormat: InsertTextFormat.Snippet,
            textEdit,
        };

        return {
            ...importResult,
            warning,
            completionItem,
        };
    }

    private checkAndWarnManagedResources(fetchedResourceStates: ResourceTemplateFormat[]): string | undefined {
        const managedLogicalIds = fetchedResourceStates
            .filter((state) => Object.values(state)[0]?.Metadata?.ManagedByStack === 'true')
            .map((state) => Object.keys(state)[0]);

        if (managedLogicalIds.length > 0) {
            return `Cannot import resources that are already managed by a stack. Remove these resources from their current stack (set DeletionPolicy to Retain before removing). Managed resources: ${managedLogicalIds.join(', ')}`;
        }
    }

    private async getResourceStates(
        resourceSelections: ResourceSelection[],
        syntaxTree: SyntaxTree,
        purpose: ResourceStatePurpose,
        parentResourceType?: string,
    ): Promise<{ fetchedResourceStates: ResourceTemplateFormat[]; importResult: ResourceStateResult }> {
        const fetchedResourceStates: ResourceTemplateFormat[] = [];
        const importResult: ResourceStateResult = {
            completionItem: undefined,
            failedImports: {},
            successfulImports: {},
        };

        const generatedLogicalIds = new Set<string>();

        for (const resourceSelection of resourceSelections) {
            const resourceType = resourceSelection.resourceType;
            const schema = this.schemaRetriever.getDefault().schemas.get(resourceType);
            if (!schema) {
                this.getOrCreate(importResult.failedImports, resourceType, []).push(
                    ...resourceSelection.resourceIdentifiers,
                );
                continue;
            }
            for (const resourceIdentifier of resourceSelection.resourceIdentifiers) {
                try {
                    const resourceState = await this.resourceStateManager.getResource(resourceType, resourceIdentifier);
                    if (resourceState) {
                        this.getOrCreate(importResult.successfulImports, resourceType, []).push(resourceIdentifier);
                        const logicalId = this.generateUniqueLogicalId(
                            resourceType,
                            resourceIdentifier,
                            syntaxTree,
                            generatedLogicalIds,
                            parentResourceType,
                        );
                        generatedLogicalIds.add(logicalId);
                        fetchedResourceStates.push({
                            [logicalId]: {
                                Type: resourceType,
                                DeletionPolicy:
                                    purpose === ResourceStatePurpose.IMPORT ? DeletionPolicyOnImport : undefined,
                                Properties: this.applyTransformations(
                                    resourceState.properties,
                                    schema,
                                    purpose,
                                    logicalId,
                                ),
                                Metadata: await this.createMetadata(resourceIdentifier, purpose),
                            },
                        });
                    } else {
                        this.getOrCreate(importResult.failedImports, resourceType, []).push(resourceIdentifier);
                    }
                } catch (error) {
                    log.error(error, `Error importing resource state for ${resourceType} id: ${resourceIdentifier}`);
                    this.getOrCreate(importResult.failedImports, resourceType, []).push(resourceIdentifier);
                }
            }
        }
        return { fetchedResourceStates, importResult };
    }

    private generateUniqueLogicalId(
        resourceType: string,
        resourceIdentifier: string,
        syntaxTree: SyntaxTree,
        idsAlreadyGenerated?: Set<string>,
        parentResourceType?: string,
    ): string {
        const entities = getEntityMap(syntaxTree, TopLevelSection.Resources);
        const existingLogicalIds = new Set<string>(entities?.keys());

        // Add any additional IDs generated in current operation
        if (idsAlreadyGenerated) {
            for (const id of idsAlreadyGenerated) {
                existingLogicalIds.add(id);
            }
        }

        return this.generateLogicalId(resourceType, resourceIdentifier, existingLogicalIds, parentResourceType);
    }

    private generateLogicalId(
        resourceType: string,
        identifier: string,
        existingLogicalIds?: Set<string>,
        parentResourceType?: string,
    ): string {
        const parts = resourceType.split('::');
        const resourceTypeName = parts.length >= 3 ? parts[1] + parts[2] : parts[parts.length - 1];

        let baseName: string;
        if (parentResourceType) {
            // Generate relationship-aware name like "IAMRoleRelatedToS3Bucket"
            const parentParts = parentResourceType.split('::');
            const parentTypeName =
                parentParts.length >= 3 ? parentParts[1] + parentParts[2] : parentParts[parentParts.length - 1];
            baseName = `${resourceTypeName}RelatedTo${parentTypeName}`;
        } else {
            baseName = resourceTypeName;
        }

        if (!existingLogicalIds?.has(baseName)) {
            return baseName;
        }

        this.telemetry.count('logicalid.collision', 1);

        let count = 1;
        while (existingLogicalIds.has(`${baseName}${count}`)) {
            count++;
        }
        return `${baseName}${count}`;
    }

    private getResourceSection(syntaxTree: SyntaxTree): ResourcesSection | undefined {
        const topLevelSections = syntaxTree.findTopLevelSections([TopLevelSection.Resources]);
        if (topLevelSections.has(TopLevelSection.Resources)) {
            return topLevelSections.get(TopLevelSection.Resources) as ResourcesSection;
        }
        return;
    }

    private combineResourcesToDocumentFormat(
        resources: ResourceTemplateFormat[],
        documentType: DocumentType,
        resourceSectionExists: boolean,
        documentUri: string,
        commaPrefixNeeded: boolean,
        replaceEntireFile: boolean,
    ): string {
        const combined = {};
        for (const resource of resources) {
            Object.assign(combined, resource);
        }
        const output = resourceSectionExists ? combined : { Resources: combined };
        if (documentType === DocumentType.JSON) {
            const editorSettings = this.documentManager.getEditorSettingsForDocument(documentUri);
            const indentStr = getIndentationString(editorSettings, documentType);
            const indentSize = editorSettings.insertSpaces ? editorSettings.tabSize : 1;
            const jsonStr = this.stringifyPreservingSnippets(output, indentSize);

            // For empty files, return the full JSON with braces
            if (replaceEntireFile) {
                return jsonStr;
            }

            const outputWithoutEnclosingBracesAndNewline = jsonStr.slice(2, -2);

            if (resourceSectionExists && !commaPrefixNeeded) {
                // Add base indentation when NOT inserting at end of line
                return indentStr + outputWithoutEnclosingBracesAndNewline.replaceAll('\n', '\n' + indentStr);
            } else if (resourceSectionExists && commaPrefixNeeded) {
                // Inserting at end of line with comma - VS Code will auto-indent by one level
                // Remove one indent level from the output to compensate
                const lines = outputWithoutEnclosingBracesAndNewline.split('\n');
                const dedented = lines
                    .map((line) => {
                        // Remove one indent level if line starts with indentation
                        if (line.startsWith(indentStr)) {
                            return line.slice(indentStr.length);
                        }
                        return line;
                    })
                    .join('\n');
                return dedented;
            } else {
                // No resource section - remove one indent level from all lines
                const lines = outputWithoutEnclosingBracesAndNewline.split('\n');
                const dedented = lines
                    .map((line) => {
                        if (line.startsWith(indentStr)) {
                            return line.slice(indentStr.length);
                        }
                        return line;
                    })
                    .join('\n');
                return dedented;
            }
        }

        // YAML handling adds new line prefix always to work around some YAML end of file parsing errors
        const yamlOutput = this.yamlStringifyPreservingSnippets(output);
        if (resourceSectionExists) {
            // Existing resource section - add 2 spaces to all lines for proper indentation
            return '\n  ' + yamlOutput.replaceAll('\n', '\n  ').trim();
        } else {
            // No resource section - content is already properly indented
            return '\n' + yamlOutput.trim();
        }
    }

    private stringifyPreservingSnippets(obj: unknown, indent: number): string {
        const SNIPPET_MARKER = '__SNIPPET_PLACEHOLDER__';
        const snippetMap = new Map<string, string>();
        let snippetCounter = 0;

        const replacer = (_key: string, value: unknown): unknown => {
            if (typeof value === 'string' && (/^\$\{/.test(value) || PlaceholderReplacer.hasPlaceholders(value))) {
                const marker = `${SNIPPET_MARKER}${snippetCounter++}`;
                snippetMap.set(marker, value);
                return marker;
            }
            return value;
        };

        let result = JSON.stringify(obj, replacer, indent);

        // Restore snippets after stringification (keep placeholders as-is for now)
        for (const [marker, snippet] of snippetMap.entries()) {
            // For JSON, we need to keep the quotes around the snippet
            result = result.replaceAll(`"${marker}"`, `"${snippet}"`);
        }

        // Replace all placeholders in the final JSON string to maintain sequential tabstop numbering
        return PlaceholderReplacer.replaceWithTabStops(result);
    }

    private yamlStringifyPreservingSnippets(obj: unknown): string {
        const processed = this.processValue(obj);
        const yamlStr = yamlStringify(processed, { indent: 2 });
        // Replace all placeholders in the final YAML string to maintain sequential tabstop numbering
        return PlaceholderReplacer.replaceWithTabStops(yamlStr);
    }

    private processValue(value: unknown): unknown {
        if (typeof value === 'object' && value !== null) {
            if (Array.isArray(value)) {
                return value.map((item) => this.processValue(item));
            }
            const processed: Record<string, unknown> = {};
            for (const [k, v] of Object.entries(value)) {
                processed[k] = this.processValue(v);
            }
            return processed;
        }
        return value;
    }

    private applyTransformations(
        properties: string,
        schema: ResourceSchema,
        purpose: ResourceStatePurpose,
        logicalId: string,
    ): Record<string, string> {
        const propertiesObj = JSON.parse(properties) as Record<string, string>;

        if (schema) {
            const transformers =
                purpose === ResourceStatePurpose.CLONE ? this.cloneTransformers : this.importTransformers;
            for (const transformer of transformers) {
                transformer.transform(propertiesObj, schema, logicalId);
            }
        }
        return propertiesObj;
    }

    private getInsertPosition(
        resourcesSection: ResourcesSection | undefined,
        document: Document,
    ): { position: Position; commaPrefixNeeded: boolean; newLineSuffixNeeded: boolean; replaceEntireFile: boolean } {
        if (document.documentType === DocumentType.YAML) {
            let position: Position;
            if (resourcesSection) {
                position =
                    document.getLine(resourcesSection.endPosition.row)?.trim().length === 0
                        ? { line: resourcesSection.endPosition.row, character: 0 }
                        : { line: resourcesSection.endPosition.row + 1, character: 0 };
            } else {
                // Find the last non-empty line
                let lastNonEmptyLine = document.lineCount - 1;
                while (lastNonEmptyLine >= 0 && document.getLine(lastNonEmptyLine)?.trim().length === 0) {
                    lastNonEmptyLine--;
                }
                position = { line: lastNonEmptyLine + 1, character: 0 };
            }
            return {
                position: position,
                commaPrefixNeeded: false,
                newLineSuffixNeeded: false,
                replaceEntireFile: false,
            };
        }

        let line = resourcesSection ? resourcesSection.endPosition.row : document.lineCount - 1;

        // For JSON without Resources section, check if file is essentially empty
        if (!resourcesSection) {
            try {
                const parsed = JSON.parse(document.getText()) as Record<string, unknown>;
                const hasContent = Object.keys(parsed).length > 0;

                // If no content, replace entire file
                if (!hasContent) {
                    return {
                        position: { line: 0, character: 0 },
                        commaPrefixNeeded: false,
                        newLineSuffixNeeded: false,
                        replaceEntireFile: true,
                    };
                }
            } catch {
                // If JSON is invalid, fall through to normal insertion logic
            }
        }

        while (line > 0) {
            const previousLine = document.getLine(line - 1);
            if (previousLine === undefined) {
                return {
                    position: { line: line, character: 0 },
                    commaPrefixNeeded: false,
                    newLineSuffixNeeded: false,
                    replaceEntireFile: false,
                };
            } else if (previousLine.trim().length > 0) {
                if (previousLine.trimEnd().endsWith(',') || previousLine.trimEnd().endsWith('{')) {
                    return {
                        position: { line: line, character: 0 },
                        commaPrefixNeeded: false,
                        newLineSuffixNeeded: true,
                        replaceEntireFile: false,
                    };
                }
                // Check if we're at the closing brace of the root object (no Resources section)
                if (!resourcesSection && previousLine.trim() !== '}') {
                    // Insert after the last property, before the closing brace
                    return {
                        position: { line: line - 1, character: previousLine.trimEnd().length },
                        commaPrefixNeeded: true,
                        newLineSuffixNeeded: false,
                        replaceEntireFile: false,
                    };
                }
                return {
                    position: { line: line - 1, character: previousLine.trimEnd().length },
                    commaPrefixNeeded: true,
                    newLineSuffixNeeded: false,
                    replaceEntireFile: false,
                };
            }
            line--;
        }
        // malformed case, allow import to end of document
        return {
            position: { line: document.lineCount, character: 0 },
            commaPrefixNeeded: false,
            newLineSuffixNeeded: false,
            replaceEntireFile: false,
        };
    }

    private async createMetadata(resourceIdentifier: string, purpose?: ResourceStatePurpose) {
        if (purpose === ResourceStatePurpose.CLONE) {
            return {
                PrimaryIdentifier: `<CLONE>${resourceIdentifier}`,
            };
        }

        return {
            PrimaryIdentifier: resourceIdentifier,
            ...(await this.getStackManagementMetadata(resourceIdentifier)),
        };
    }

    private async getStackManagementMetadata(identifier: string) {
        const stackManagementInfo = await this.stackManagementInfoProvider.getResourceManagementState(identifier);
        return {
            ManagedByStack:
                stackManagementInfo.managedByStack === undefined
                    ? 'unknown'
                    : stackManagementInfo.managedByStack.toString(),
            StackName: stackManagementInfo.stackName,
            StackId: stackManagementInfo.stackId,
        };
    }

    private getFailureResponse(
        title: string,
        successfulImports?: Record<ResourceType, ResourceIdentifier[]>,
        failedImports?: Record<ResourceType, ResourceIdentifier[]>,
    ): ResourceStateResult {
        return {
            completionItem: undefined,
            successfulImports: successfulImports ?? {},
            failedImports: failedImports ?? {},
        };
    }

    private getOrCreate<V>(record: Record<string, V>, key: string, createValue: V): V {
        if (key in record) {
            return record[key];
        } else {
            record[key] = createValue;
            return createValue;
        }
    }

    private recordStateFetchMetrics(resourceSelections: ResourceSelection[], importResult: ResourceStateResult): void {
        const totalRequested = resourceSelections.reduce((sum, sel) => sum + sel.resourceIdentifiers.length, 0);
        const succeeded = Object.values(importResult.successfulImports).flat().length;
        const failed = Object.values(importResult.failedImports).flat().length;

        this.telemetry.histogram('resources.requested', totalRequested);
        this.telemetry.histogram('resources.succeeded', succeeded);
        this.telemetry.histogram('resources.fault', failed);
    }

    private initializeCounters(): void {
        this.telemetry.count('purpose.import', 0);
        this.telemetry.count('purpose.clone', 0);
        this.telemetry.count('managed.warning', 0);
        this.telemetry.count('document.json', 0);
        this.telemetry.count('document.yaml', 0);
        this.telemetry.count('section.create', 0);
        this.telemetry.count('logicalid.collision', 0);
    }

    static create(core: CfnInfraCore, external: CfnExternal, providers: CfnLspProviders): ResourceStateImporter {
        return new ResourceStateImporter(
            core.documentManager,
            core.syntaxTreeManager,
            providers.resourceStateManager,
            external.schemaRetriever,
            providers.stackManagementInfoProvider,
        );
    }
}
