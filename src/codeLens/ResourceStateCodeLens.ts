import { CodeLens, Position, Range } from 'vscode-languageserver';
import { TopLevelSection } from '../context/ContextType';
import { getEntityMap } from '../context/SectionContextBuilder';
import { Resource } from '../context/semantic/Entity';
import { CfnValue } from '../context/semantic/SemanticTypes';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { Document } from '../document/Document';
import { ResourceSchema } from '../schema/ResourceSchema';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { LoggerFactory } from '../telemetry/LoggerFactory';

const log = LoggerFactory.getLogger('ResourceStateCodeLens');

const RESOURCE_STATE_COMMANDS = {
    IMPORT: 'aws.cloudformation.api.importResourceState',
    CLONE: 'aws.cloudformation.api.cloneResourceState',
} as const;

const RESOURCE_STATE_TITLES = {
    IMPORT: 'Import Resource State',
    CLONE: 'Clone Resource State',
} as const;

export class ResourceStateCodeLens {
    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    getCodeLenses(uri: string, _document: Document): CodeLens[] {
        const lenses: CodeLens[] = [];
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!syntaxTree) {
            return lenses;
        }

        const resourcesMap = getEntityMap(syntaxTree, TopLevelSection.Resources);
        if (!resourcesMap) {
            return lenses;
        }

        for (const [logicalId, resourceContext] of resourcesMap) {
            const resource = resourceContext.entity as Resource;
            if (!resource?.Type || !resource?.Properties) {
                continue;
            }

            const schema = this.schemaRetriever.getDefault().schemas.get(resource.Type);
            if (!schema) {
                continue;
            }

            const identifier = this.getIdentifierFromResource(resource, schema);
            if (!identifier) {
                continue;
            }

            const line = resourceContext.startPosition.row;
            const range = Range.create(Position.create(line, 0), Position.create(line, 0));

            lenses.push(
                {
                    range,
                    command: {
                        title: RESOURCE_STATE_TITLES.IMPORT,
                        command: RESOURCE_STATE_COMMANDS.IMPORT,
                        arguments: [resource.Type, identifier, logicalId],
                    },
                },
                {
                    range,
                    command: {
                        title: RESOURCE_STATE_TITLES.CLONE,
                        command: RESOURCE_STATE_COMMANDS.CLONE,
                        arguments: [resource.Type, identifier, logicalId],
                    },
                },
            );
        }

        return lenses;
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
            log.debug(`jsonPointer: ${jsonPointer}, value: ${JSON.stringify(value)}, type: ${typeof value}`);
            if (!value) {
                return;
            }
            // Handle CfnValue - extract string value
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            identifierValues.push(stringValue);
        }

        const identifier = identifierValues.join('|');
        log.debug(`Final identifier: ${identifier}`);
        return identifier;
    }
}
