import { readFileSync } from 'fs';
import { join } from 'path';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';

const logger = LoggerFactory.getLogger('RelationshipSchemaService');

export type RelatedResourceType = {
    typeName: string;
    attribute: string;
};

export type ResourceRelationship = {
    property: string;
    relatedResourceTypes: RelatedResourceType[];
};

export type ResourceTypeRelationships = {
    resourceType: string;
    relationships: ResourceRelationship[];
};

export type RelationshipSchemaData = Record<string, RelationshipGroupData[]>;

export type RelationshipGroupData = Record<string, RelatedResourceType[]>;

export class RelationshipSchemaService {
    private static instance: RelationshipSchemaService;
    private readonly relationshipCache: Map<string, ResourceTypeRelationships> = new Map();
    private readonly schemaFilePath: string;

    constructor(schemaFilePath?: string) {
        this.schemaFilePath = schemaFilePath ?? join(__dirname, 'resources/relationship_schemas.json');
        this.loadAllSchemas();
    }

    static getInstance(schemaFilePath?: string): RelationshipSchemaService {
        if (!RelationshipSchemaService.instance) {
            RelationshipSchemaService.instance = new RelationshipSchemaService(schemaFilePath);
        }
        return RelationshipSchemaService.instance;
    }

    private loadAllSchemas(): void {
        try {
            const schemaContent = readFileSync(this.schemaFilePath, 'utf8');
            const allSchemas = JSON.parse(schemaContent) as RelationshipSchemaData;

            for (const [resourceTypeKey, relationships] of Object.entries(allSchemas)) {
                try {
                    const processedRelationships: ResourceRelationship[] = [];

                    for (const relationshipGroup of relationships) {
                        for (const [property, relatedTypes] of Object.entries(relationshipGroup)) {
                            processedRelationships.push({
                                property,
                                relatedResourceTypes: relatedTypes,
                            });
                        }
                    }

                    // Store using the original key format (AWS-S3-Bucket)
                    this.relationshipCache.set(resourceTypeKey, {
                        resourceType: resourceTypeKey,
                        relationships: processedRelationships,
                    });
                } catch (error) {
                    logger.warn(
                        { error: extractErrorMessage(error) },
                        `Failed to load relationship schema for ${resourceTypeKey}`,
                    );
                }
            }

            logger.info(`Loaded ${this.relationshipCache.size} relationship schemas`);
        } catch (error) {
            logger.error({ error: extractErrorMessage(error) }, 'Failed to load relationship schemas');
        }
    }

    private convertResourceTypeToKey(resourceType: string): string {
        return resourceType.replaceAll('::', '-');
    }

    getRelationshipsForResourceType(resourceType: string): ResourceTypeRelationships | undefined {
        const cacheKey = this.convertResourceTypeToKey(resourceType);
        const result = this.relationshipCache.get(cacheKey);

        if (result) {
            return {
                ...result,
                resourceType: resourceType,
            };
        }

        return undefined;
    }

    getAllRelatedResourceTypes(resourceType: string): Set<string> {
        const relationships = this.getRelationshipsForResourceType(resourceType);
        if (!relationships) {
            return new Set<string>();
        }

        const relatedTypes = new Set<string>();
        for (const relationship of relationships.relationships) {
            for (const relatedType of relationship.relatedResourceTypes) {
                relatedTypes.add(relatedType.typeName);
            }
        }

        return relatedTypes;
    }

    getRelationshipContext(resourceTypes: string[]): string {
        const contextLines: string[] = [];

        for (const resourceType of resourceTypes) {
            const relationships = this.getRelationshipsForResourceType(resourceType);
            if (!relationships) {
                continue;
            }

            contextLines.push(`**${resourceType}** can relate to:`);

            const relatedTypeGroups = new Map<string, string[]>();

            for (const relationship of relationships.relationships) {
                for (const relatedType of relationship.relatedResourceTypes) {
                    if (!relatedTypeGroups.has(relatedType.typeName)) {
                        relatedTypeGroups.set(relatedType.typeName, []);
                    }
                    const properties = relatedTypeGroups.get(relatedType.typeName);
                    if (properties) {
                        properties.push(relationship.property);
                    }
                }
            }

            for (const [relatedType, properties] of relatedTypeGroups) {
                contextLines.push(`  - ${relatedType} (via: ${properties.join(', ')})`);
            }

            contextLines.push('');
        }

        return contextLines.join('\n');
    }

    extractResourceTypesFromTemplate(template: string): string[] {
        const resourceTypes = new Set<string>();

        try {
            // Find AWS resource types match AWS::Service::Resource with optional quotes
            const typeMatches = template.match(/["']?(AWS::[A-Za-z0-9]+::[A-Za-z0-9]+)["']?/g);

            if (typeMatches) {
                for (const match of typeMatches) {
                    // Remove quotes if present and extract the AWS resource type
                    const cleanMatch = match.replaceAll(/["']/g, '');
                    resourceTypes.add(cleanMatch);
                }
            }
        } catch (error) {
            logger.warn({ error: extractErrorMessage(error) }, 'Failed to extract resource types from template');
        }

        return [...resourceTypes];
    }
}
