import { ScannedResource, ResourceScanSummary } from '@aws-sdk/client-cloudformation';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { AwsClient } from './AwsClient';
import { IacGeneratorService } from './IacGeneratorService';
import { RelationshipSchemaService } from './RelationshipSchemaService';

const logger = LoggerFactory.getLogger('ResourceScanService');

export type FilteredResourcesInfo = {
    resources: ScannedResource[];
    totalCount: number;
    resourceTypes: Set<string>;
};

const RESOURCE_LIMIT = 1000;

/**
 * Gets filtered scanned resources based on template resource types and their relationships
 */
export async function getFilteredScannedResources(
    awsClient: AwsClient,
    templateResourceTypes: string[],
    relationshipService: RelationshipSchemaService,
): Promise<FilteredResourcesInfo | undefined> {
    const iacGeneratorService = new IacGeneratorService(awsClient);
    try {
        // Fetch all scans
        let nextToken: string | undefined;
        const allScans: ResourceScanSummary[] = [];
        do {
            const result = await iacGeneratorService.listResourceScans({ nextToken });
            allScans.push(...result.scans);
            nextToken = result.nextToken;
        } while (nextToken);

        if (allScans.length === 0) {
            logger.info('No resource scans found in account');
            return undefined;
        }

        const completedScans = allScans.filter((scan) => scan.Status === 'COMPLETE');
        if (completedScans.length === 0) {
            logger.info('No completed resource scans found');
            return undefined;
        }

        const latestScan = completedScans.sort((a, b) => {
            const timeA = a.StartTime?.getTime() ?? 0;
            const timeB = b.StartTime?.getTime() ?? 0;
            return timeB - timeA;
        })[0];

        if (!latestScan.ResourceScanId) {
            logger.warn('Latest scan has no ResourceScanId');
            return undefined;
        }

        logger.info(
            `Using resource scan: ${latestScan.ResourceScanId} (started: ${latestScan.StartTime?.toISOString() ?? 'unknown'})`,
        );

        // Fetch all resources for the scan
        let resourceToken: string | undefined;
        const allResources: ScannedResource[] = [];
        do {
            const result = await iacGeneratorService.listResourceScanResources(latestScan.ResourceScanId, {
                nextToken: resourceToken,
            });
            allResources.push(...result.resources);
            resourceToken = result.nextToken;
        } while (resourceToken);

        return filterResourcesByRelationships(allResources, templateResourceTypes, relationshipService);
    } catch (error) {
        logger.warn({ error: extractErrorMessage(error) }, 'Failed to get resource scan data');
        return undefined;
    }
}

/**
 * Filters scanned resources to only include those that can relate to template resources
 */
function filterResourcesByRelationships(
    scannedResources: ScannedResource[],
    templateResourceTypes: string[],
    relationshipService: RelationshipSchemaService,
): FilteredResourcesInfo {
    const relatedResourceTypes = new Set<string>();

    for (const templateResourceType of templateResourceTypes) {
        relatedResourceTypes.add(templateResourceType);

        const directlyRelatedTypes = relationshipService.getAllRelatedResourceTypes(templateResourceType);
        for (const type of directlyRelatedTypes) {
            relatedResourceTypes.add(type);
        }
    }

    const filteredResources = scannedResources.filter((resource) => {
        const resourceType = resource.ResourceType;
        return resourceType && relatedResourceTypes.has(resourceType);
    });

    const limitedResources = filteredResources.slice(0, RESOURCE_LIMIT);

    logger.info(`Filtered ${scannedResources.length} resources down to ${limitedResources.length} related resources`);

    return {
        resources: limitedResources,
        totalCount: limitedResources.length,
        resourceTypes: new Set(limitedResources.map((r) => r.ResourceType).filter(Boolean) as string[]),
    };
}

/**
 * Formats filtered scanned resources for AI consumption
 */
export function formatScannedResourcesForAI(filteredResourcesInfo: FilteredResourcesInfo): string {
    const { resources, totalCount, resourceTypes } = filteredResourcesInfo;

    if (totalCount === 0) {
        return 'No related resources found in your AWS account.';
    }

    const lines: string[] = [];
    lines.push(`**Found ${totalCount} related resources in your AWS account:**\n`);

    const resourcesByType = new Map<string, ScannedResource[]>();
    for (const resource of resources) {
        if (resource.ResourceType) {
            if (!resourcesByType.has(resource.ResourceType)) {
                resourcesByType.set(resource.ResourceType, []);
            }
            const typeResources = resourcesByType.get(resource.ResourceType);
            if (typeResources) {
                typeResources.push(resource);
            }
        }
    }

    // Format each resource type group
    for (const [resourceType, typeResources] of resourcesByType) {
        lines.push(`**${resourceType}** (${typeResources.length} resources):`);

        for (const resource of typeResources.slice(0, 10)) {
            // Limit to 10 resources per type
            const identifier = resource.ResourceIdentifier ? JSON.stringify(resource.ResourceIdentifier) : 'Unknown';
            const region = 'Unknown'; // ScannedResource doesn't have Region property
            lines.push(`  - ${identifier} (${region})`);
        }

        if (typeResources.length > 10) {
            lines.push(`  - ... and ${typeResources.length - 10} more`);
        }
        lines.push('');
    }

    lines.push(`**Resource Types Available:** ${[...resourceTypes].join(', ')}`);

    return lines.join('\n');
}
