import { join } from 'path';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { readFileIfExists } from '../utils/File';

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
    private readonly relationshipCache: Map<string, ResourceTypeRelationships> = new Map();
    // Reverse index: maps a referenced type to the set of types that reference it
    // e.g., "AWS::IAM::Role" → Set { "AWS::Lambda::Function", "AWS::ECS::TaskDefinition", ... }
    private readonly reverseRelationshipCache: Map<string, Set<string>> = new Map();

    constructor(private readonly schemaFilePath: string = join(__dirname, 'assets', 'relationship_schemas.json')) {
        this.loadAllSchemas();
    }

    private loadAllSchemas(): void {
        try {
            const schemaContent = readFileIfExists(this.schemaFilePath, 'utf8');
            const allSchemas = JSON.parse(schemaContent) as RelationshipSchemaData;

            for (const [resourceTypeKey, relationships] of Object.entries(allSchemas)) {
                try {
                    const processedRelationships: ResourceRelationship[] = [];
                    // Convert key format: AWS-Lambda-Function → AWS::Lambda::Function
                    const sourceType = this.convertKeyToResourceType(resourceTypeKey);

                    for (const relationshipGroup of relationships) {
                        for (const [property, relatedTypes] of Object.entries(relationshipGroup)) {
                            processedRelationships.push({
                                property,
                                relatedResourceTypes: relatedTypes,
                            });

                            // Build reverse index only for top-level properties (no nested paths)
                            // Nested properties (containing /) can't be populated with !Ref/!GetAtt
                            if (!property.includes('/')) {
                                for (const relatedType of relatedTypes) {
                                    const referencedType = relatedType.typeName;
                                    let existingSet = this.reverseRelationshipCache.get(referencedType);
                                    if (!existingSet) {
                                        existingSet = new Set();
                                        this.reverseRelationshipCache.set(referencedType, existingSet);
                                    }
                                    existingSet.add(sourceType);
                                }
                            }
                        }
                    }

                    // Store using the original key format (AWS-S3-Bucket)
                    this.relationshipCache.set(resourceTypeKey, {
                        resourceType: resourceTypeKey,
                        relationships: processedRelationships,
                    });
                } catch (error) {
                    logger.warn(error, `Failed to load relationship schema for ${resourceTypeKey}`);
                }
            }
        } catch (error) {
            logger.error(error, 'Failed to load relationship schemas');
        }
    }

    private convertResourceTypeToKey(resourceType: string): string {
        return resourceType.replaceAll('::', '-');
    }

    private convertKeyToResourceType(key: string): string {
        return key.replaceAll('-', '::');
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
        const relatedTypes = new Set<string>();

        // Outgoing: types that this resource's properties reference
        const relationships = this.getRelationshipsForResourceType(resourceType);
        if (relationships) {
            for (const relationship of relationships.relationships) {
                for (const relatedType of relationship.relatedResourceTypes) {
                    relatedTypes.add(relatedType.typeName);
                }
            }
        }

        // Incoming: types whose properties reference this resource
        const incoming = this.reverseRelationshipCache.get(resourceType);
        if (incoming) {
            for (const type of incoming) {
                relatedTypes.add(type);
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
            logger.warn(error, 'Failed to extract resource types from template');
        }

        return [...resourceTypes];
    }
}
