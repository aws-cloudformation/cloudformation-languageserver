import { GetResourceCommandOutput, ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { DateTime } from 'luxon';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { CfnExternal } from '../server/CfnExternal';
import { CcapiService } from '../services/CcapiService';
import { ISettingsSubscriber, SettingsConfigurable, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry, Measure } from '../telemetry/TelemetryDecorator';
import { Closeable } from '../utils/Closeable';
import { ListResourcesResult, RefreshResourcesResult } from './ResourceStateTypes';

const log = LoggerFactory.getLogger('ResourceStateManager');

export type ResourceState = {
    typeName: string;
    identifier: string;
    properties: string;
    createdTimestamp: DateTime;
};

type ResourceList = {
    typeName: string;
    resourceIdentifiers: string[];
    nextToken?: string;
    createdTimestamp: DateTime;
    lastUpdatedTimestamp: DateTime;
};

type ResourceType = string;
type ResourceId = string;
type ResourceStateMap = Map<ResourceType, Map<ResourceId, ResourceState>>;
type ResourceListMap = Map<ResourceType, ResourceList>;

export class ResourceStateManager implements SettingsConfigurable, Closeable {
    @Telemetry() private readonly telemetry!: ScopedTelemetry;
    private settingsSubscription?: SettingsSubscription;
    private settings: ProfileSettings = DefaultSettings.profile;
    private isRefreshing = false;

    // Map of TypeName to Map of Identifier to ResourceState
    private readonly resourceStateMap: ResourceStateMap = new Map();
    private readonly resourceListMap: ResourceListMap = new Map();

    constructor(
        private readonly ccapiService: CcapiService,
        private readonly schemaRetriever: SchemaRetriever,
    ) {
        this.registerCacheGauges();
        this.initializeCounters();
    }

    @Measure({ name: 'getResource' })
    public async getResource(typeName: ResourceType, identifier: ResourceId): Promise<ResourceState | undefined> {
        const cachedResources = this.getResourceState(typeName, identifier);
        if (cachedResources) {
            this.telemetry.count('state.hit', 1);
            return cachedResources;
        }
        this.telemetry.count('state.miss', 1);

        let output: GetResourceCommandOutput | undefined = undefined;

        try {
            output = await this.ccapiService.getResource(typeName, identifier);
        } catch (error) {
            log.error(error, `CCAPI GetResource failed for type ${typeName} and identifier "${identifier}"`);
            if (error instanceof ResourceNotFoundException) {
                log.info(`No resource found for type ${typeName} and identifier "${identifier}"`);
                this.telemetry.count('state.fault', 1);
            }
            return;
        }

        if (!output?.TypeName || !output?.ResourceDescription?.Identifier || !output?.ResourceDescription?.Properties) {
            log.error(
                `GetResource output is missing required fields for type ${typeName} with identifier "${identifier}"`,
            );
            return;
        }

        const value: ResourceState = {
            typeName: typeName,
            identifier: identifier,
            properties: output.ResourceDescription.Properties,
            createdTimestamp: DateTime.now(),
        };

        this.storeResourceState(typeName, identifier, value);
        return value;
    }

    @Measure({ name: 'listResources' })
    public async listResources(typeName: string, nextToken?: string): Promise<ResourceList | undefined> {
        const cached = this.resourceListMap.get(typeName);

        if (!nextToken) {
            // Initial request - fetch first page and cache it
            const resourceList = await this.retrieveResourceList(typeName);
            if (resourceList) {
                this.resourceListMap.set(typeName, resourceList);
                return resourceList;
            }
            return;
        }

        // Pagination request - fetch next page and append to cache
        const resourceListNextPage = await this.retrieveResourceList(typeName, nextToken);
        if (resourceListNextPage && cached) {
            // Deduplicate efficiently using Set for O(1) lookup
            const cachedSet = new Set(cached.resourceIdentifiers);
            const newIdentifiers = resourceListNextPage.resourceIdentifiers.filter((id) => !cachedSet.has(id));
            cached.resourceIdentifiers.push(...newIdentifiers);
            cached.nextToken = resourceListNextPage.nextToken;
            cached.lastUpdatedTimestamp = DateTime.now();
            return cached;
        }

        return resourceListNextPage;
    }

    @Measure({ name: 'searchResourceByIdentifier' })
    public async searchResourceByIdentifier(
        typeName: string,
        identifier: string,
    ): Promise<{ found: boolean; resourceList?: ResourceList }> {
        const resource = await this.getResource(typeName, identifier);
        if (!resource) {
            return { found: false };
        }

        // Add to cache
        const cached = this.resourceListMap.get(typeName);
        if (cached && !cached.resourceIdentifiers.includes(identifier)) {
            cached.resourceIdentifiers.push(identifier);
            cached.lastUpdatedTimestamp = DateTime.now();
            return { found: true, resourceList: cached };
        }

        // Create new cache entry if doesn't exist
        if (!cached) {
            const newList: ResourceList = {
                typeName,
                resourceIdentifiers: [identifier],
                nextToken: undefined,
                createdTimestamp: DateTime.now(),
                lastUpdatedTimestamp: DateTime.now(),
            };
            this.resourceListMap.set(typeName, newList);
            return { found: true, resourceList: newList };
        }

        return { found: true, resourceList: cached };
    }

    public getResourceTypes(): string[] {
        const schemas = this.schemaRetriever.getDefault().schemas;
        return [...schemas.keys()];
    }

    private storeResourceState(typeName: ResourceType, id: ResourceId, state: ResourceState) {
        let resourceIdToStateMap = this.resourceStateMap.get(typeName);
        if (!resourceIdToStateMap) {
            resourceIdToStateMap = new Map<ResourceId, ResourceState>();
            this.resourceStateMap.set(typeName, resourceIdToStateMap);
        }
        resourceIdToStateMap.set(id, state);
    }

    private getResourceState(typeName: ResourceType, identifier: ResourceId): ResourceState | undefined {
        const resourceIdToStateMap = this.resourceStateMap.get(typeName);
        return resourceIdToStateMap?.get(identifier);
    }

    private async retrieveResourceList(typeName: string, nextToken?: string): Promise<ResourceList | undefined> {
        try {
            const output = await this.ccapiService.listResources(typeName, { nextToken });

            const identifiers =
                output.ResourceDescriptions?.map((desc) => desc.Identifier).filter(
                    (id): id is string => id !== undefined,
                ) ?? [];

            const now = DateTime.now();

            return {
                typeName: typeName,
                resourceIdentifiers: identifiers,
                createdTimestamp: now,
                lastUpdatedTimestamp: now,
                nextToken: output.NextToken,
            };
        } catch (error) {
            log.error(error, `CCAPI ListResource failed for type ${typeName}`);
            return;
        }
    }

    @Measure({ name: 'refreshResourceList' })
    public async refreshResourceList(resourceTypes: string[]): Promise<RefreshResourcesResult> {
        if (this.isRefreshing) {
            // return cached resource list
            return {
                resources: resourceTypes.map((resourceType) => {
                    const cached = this.resourceListMap.get(resourceType);
                    return {
                        typeName: resourceType,
                        resourceIdentifiers: cached?.resourceIdentifiers ?? [],
                        nextToken: cached?.nextToken,
                    };
                }),
                refreshFailed: false,
            };
        }

        if (resourceTypes.length === 0) {
            return { resources: [], refreshFailed: false };
        }

        try {
            this.isRefreshing = true;
            const result: ListResourcesResult = { resources: [] };
            let anyRefreshFailed = false;

            for (const resourceType of resourceTypes) {
                // Clear cache and fetch first page only
                this.resourceListMap.delete(resourceType);

                const response = await this.retrieveResourceList(resourceType);
                if (!response) {
                    anyRefreshFailed = true;
                    result.resources.push({
                        typeName: resourceType,
                        resourceIdentifiers: [],
                        nextToken: undefined,
                    });
                    continue;
                }

                // Cache the first page
                this.resourceListMap.set(resourceType, response);

                result.resources.push({
                    typeName: resourceType,
                    resourceIdentifiers: response.resourceIdentifiers,
                    nextToken: response.nextToken,
                });
            }
            if (anyRefreshFailed) {
                this.telemetry.count('refresh.fault', 1);
            }
            return { ...result, refreshFailed: anyRefreshFailed };
        } finally {
            this.isRefreshing = false;
        }
    }

    configure(settingsManager: ISettingsSubscriber) {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
        }

        this.settingsSubscription = settingsManager.subscribe('profile', (newResourceStateSettings) => {
            this.onSettingsChanged(newResourceStateSettings);
        });
    }

    public close(): void {
        if (this.settingsSubscription) {
            this.settingsSubscription.unsubscribe();
            this.settingsSubscription = undefined;
        }
    }

    private onSettingsChanged(newSettings: ProfileSettings) {
        // clear cached resources if AWS profile or region changes as data is redundant
        if (newSettings.profile !== this.settings.profile || newSettings.region !== this.settings.region) {
            this.telemetry.count('state.invalidated', 1);
            this.telemetry.count('list.invalidated', 1);
            this.resourceStateMap.clear();
            this.resourceListMap.clear();
        }
        this.settings = newSettings;
    }

    private initializeCounters(): void {
        this.telemetry.count('state.hit', 0);
        this.telemetry.count('state.miss', 0);
        this.telemetry.count('state.fault', 0);
        this.telemetry.count('state.invalidated', 0);
        this.telemetry.count('list.invalidated', 0);
        this.telemetry.count('refresh.fault', 0);
    }

    private registerCacheGauges(): void {
        this.telemetry.registerGaugeProvider('state.types', () => this.resourceStateMap.size);

        this.telemetry.registerGaugeProvider('list.types', () => this.resourceListMap.size);

        this.telemetry.registerGaugeProvider('state.count', () => {
            let total = 0;
            for (const resourceMap of this.resourceStateMap.values()) {
                total += resourceMap.size;
            }
            return total;
        });
    }

    static create(external: CfnExternal) {
        return new ResourceStateManager(external.ccapiService, external.schemaRetriever);
    }
}
