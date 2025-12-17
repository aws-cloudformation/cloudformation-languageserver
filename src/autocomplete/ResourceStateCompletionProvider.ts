import {
    CompletionItem,
    CompletionItemKind,
    CompletionParams,
    InsertTextFormat,
    InsertTextMode,
    TextEdit,
} from 'vscode-languageserver';
import { stringify as yamlStringify } from 'yaml';
import { Context } from '../context/Context';
import { Resource } from '../context/semantic/Entity';
import { CfnValue } from '../context/semantic/SemanticTypes';
import { DocumentType } from '../document/Document';
import { DocumentManager } from '../document/DocumentManager';
import { ResourceStateManager } from '../resourceState/ResourceStateManager';
import { ResourceStatePurpose } from '../resourceState/ResourceStateTypes';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { TransformersUtil } from '../schema/transformers/TransformersUtil';
import { CfnExternal } from '../server/CfnExternal';
import { CfnInfraCore } from '../server/CfnInfraCore';
import { CfnLspProviders } from '../server/CfnLspProviders';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Measure } from '../telemetry/TelemetryDecorator';
import { CompletionProvider } from './CompletionProvider';
import { createCompletionItem, handleSnippetJsonQuotes } from './CompletionUtils';

const log = LoggerFactory.getLogger('ResourceStateCompletionProvider');

export class ResourceStateCompletionProvider implements CompletionProvider {
    private readonly transformers = TransformersUtil.createTransformers(ResourceStatePurpose.IMPORT);

    constructor(
        private readonly resourceStateManager: ResourceStateManager,
        private readonly documentManager: DocumentManager,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    @Measure({ name: 'getCompletions' })
    public async getCompletions(context: Context, params: CompletionParams): Promise<CompletionItem[]> {
        const resource = context.entity as Resource;
        if (!resource?.Type || !resource?.Properties) {
            return [];
        }
        const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
        if (!schema) {
            return [];
        }

        const identifier = this.getIdentifierFromResource(resource, schema);
        if (!identifier) {
            return [];
        }

        log.info(`Retrieving resource details from AWS account with id: ${identifier} and type: ${resource.Type}`);
        const resourceState = await this.resourceStateManager.getResource(resource.Type, identifier);
        const properties = resourceState?.properties;
        if (!properties) {
            log.info(`No resource found for id: ${identifier} and type: ${resource.Type}`);
            return [];
        }
        const propertiesObj = JSON.parse(properties) as Record<string, string>;
        this.applyTransformers(propertiesObj, schema);
        this.removeExistingProperties(propertiesObj, resource);

        const formattedProperties = this.transformPropertiesToDocType(propertiesObj, context, params);
        const completion: CompletionItem = createCompletionItem(formattedProperties, CompletionItemKind.Event, {
            insertText: formattedProperties,
            insertTextFormat: InsertTextFormat.PlainText,
            insertTextMode: InsertTextMode.adjustIndentation,
            sortText: `0${formattedProperties}`,
        });
        if (context.documentType === DocumentType.JSON) {
            this.formatForJson(completion, context, params);
        }
        return [completion];
    }

    private allPrimaryIdsDefined(resource: Resource, schema: ResourceSchema): boolean {
        const properties = resource.Properties;
        if (!properties) {
            return false;
        }

        return schema.primaryIdentifier.every(
            (jsonPointer) => this.getValueAtJsonPointer(properties, jsonPointer) !== undefined,
        );
    }

    private getValueAtJsonPointer(properties: Record<string, CfnValue>, jsonPointer: string): CfnValue | undefined {
        const path = jsonPointer.startsWith('/') ? jsonPointer.slice(1) : jsonPointer;
        const segments = path.split('/');
        const propertyPath = segments[0] === 'properties' ? segments.slice(1) : segments;

        let current: Record<string, CfnValue> = properties;
        for (const segment of propertyPath) {
            if (!current || typeof current !== 'object' || !(segment in current)) {
                return undefined;
            }
            current = current[segment] as Record<string, CfnValue>;
        }

        return current as CfnValue;
    }

    private getIdentifierFromResource(resource: Resource, schema: ResourceSchema): string | undefined {
        if (!this.allPrimaryIdsDefined(resource, schema)) {
            return;
        }
        if (!resource.Properties) {
            return;
        }

        const identifierValues: string[] = [];
        for (const jsonPointer of schema.primaryIdentifier) {
            const value = this.getValueAtJsonPointer(resource.Properties, jsonPointer);
            if (!value) {
                return;
            }
            identifierValues.push(value as string);
        }

        return identifierValues.join('|');
    }

    private removeExistingProperties(propertiesObj: Record<string, string>, resource: Resource): void {
        if (!resource.Properties) {
            return;
        }

        for (const key of Object.keys(resource.Properties)) {
            delete propertiesObj[key];
        }
    }

    private applyTransformers(propertiesObj: Record<string, string>, schema: ResourceSchema): void {
        for (const transformer of this.transformers) {
            transformer.transform(propertiesObj, schema);
        }
    }

    private transformPropertiesToDocType(
        properties: Record<string, string>,
        context: Context,
        params: CompletionParams,
    ): string {
        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
        const tabSize = documentSpecificSettings.tabSize;

        if (context.documentType === DocumentType.YAML) {
            if (Object.keys(properties).length === 0) return '';
            return yamlStringify(properties, { indent: tabSize });
        }

        // slice to remove the leading {\n and closing \n}
        return JSON.stringify(properties, undefined, tabSize).slice(2, -2);
    }

    private formatForJson(completion: CompletionItem, context: Context, params: CompletionParams): void {
        handleSnippetJsonQuotes(
            completion,
            context,
            params,
            this.documentManager,
            ResourceStateCompletionProvider.name,
        );

        const documentSpecificSettings = this.documentManager.getEditorSettingsForDocument(params.textDocument.uri);
        // undoing the indentation after JSON.stringify with dynamic indentation
        const tabSize = documentSpecificSettings.tabSize;
        const textEdit = completion.textEdit as TextEdit;
        textEdit.range.start.character = textEdit.range.start.character - tabSize;
    }

    static create(core: CfnInfraCore, external: CfnExternal, providers: CfnLspProviders) {
        return new ResourceStateCompletionProvider(
            providers.resourceStateManager,
            core.documentManager,
            external.schemaRetriever,
        );
    }
}
