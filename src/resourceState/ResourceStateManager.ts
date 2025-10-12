import { GetResourceCommandOutput, ListResourcesOutput, ResourceNotFoundException } from '@aws-sdk/client-cloudcontrol';
import { DateTime } from 'luxon';
import { SchemaRetriever } from '../schema/SchemaRetriever';
import { CfnExternal } from '../server/CfnExternal';
import { CcapiService } from '../services/CcapiService';
import { ISettingsSubscriber, SettingsConfigurable, SettingsSubscription } from '../settings/ISettingsSubscriber';
import { DefaultSettings, ProfileSettings } from '../settings/Settings';
import { LoggerFactory } from '../telemetry/LoggerFactory';
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
    createdTimestamp: DateTime;
    lastUpdatedTimestamp: DateTime;
};

type ResourceType = string;
type ResourceId = string;
type ResourceStateMap = Map<ResourceType, Map<ResourceId, ResourceState>>;
type ResourceListMap = Map<ResourceType, ResourceList>;

export class ResourceStateManager implements SettingsConfigurable, Closeable {
    private settingsSubscription?: SettingsSubscription;
    private settings: ProfileSettings = DefaultSettings.profile;
    private isRefreshing = false;
    private readonly logger = LoggerFactory.getLogger(ResourceStateManager);

    // Map of TypeName to Map of Identifier to ResourceState
    private readonly resourceStateMap: ResourceStateMap = new Map();
    private readonly resourceListMap: ResourceListMap = new Map();

    constructor(
        private readonly ccapiService: CcapiService,
        private readonly schemaRetriever: SchemaRetriever,
    ) {}

    public async getResource(typeName: ResourceType, identifier: ResourceId): Promise<ResourceState | undefined> {
        const cachedResources = this.getResourceState(typeName, identifier);
        if (cachedResources) {
            return cachedResources;
        }
        let output: GetResourceCommandOutput | undefined = undefined;

        try {
            output = await this.ccapiService.getResource(typeName, identifier);
        } catch (error) {
            log.error(error, `CCAPI GetResource failed for type ${typeName} and identifier "${identifier}"`);
            if (error instanceof ResourceNotFoundException) {
                this.logger.info(`No resource found for type ${typeName} and identifier "${identifier}"`);
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

    public async listResources(typeName: string, updateFromLive?: boolean): Promise<ResourceList | undefined> {
        const cachedResourceList = this.resourceListMap.get(typeName);
        if (cachedResourceList && !updateFromLive) {
            return cachedResourceList;
        }
        const resourceList = await this.retrieveResourceList(typeName);
        if (!resourceList) {
            return;
        }

        this.resourceListMap.set(typeName, resourceList);

        return resourceList;
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

    private async retrieveResourceList(typeName: string): Promise<ResourceList | undefined> {
        let output: ListResourcesOutput | undefined = undefined;

        try {
            output = await this.ccapiService.listResources(typeName);
        } catch (error) {
            log.error(error, `CCAPI ListResource failed for type ${typeName}`);
            return;
        }

        if (!output?.ResourceDescriptions) {
            return;
        }

        const now = DateTime.now();

        return {
            typeName: typeName,
            resourceIdentifiers: output.ResourceDescriptions.map((desc) => desc.Identifier).filter(
                (id) => id !== undefined,
            ),
            createdTimestamp: now,
            lastUpdatedTimestamp: now,
        };
    }

    public async refreshResourceList(resourceTypes: string[]): Promise<RefreshResourcesResult> {
        if (this.isRefreshing) {
            // return cached resource list
            return {
                resources: resourceTypes.map((resourceType) => ({
                    typeName: resourceType,
                    resourceIdentifiers: this.resourceListMap.get(resourceType)?.resourceIdentifiers ?? [],
                })),
                refreshFailed: false,
            };
        }

        if (resourceTypes.length === 0) {
            return { resources: [], refreshFailed: false };
        }

        try {
            this.isRefreshing = true;
            const result: ListResourcesResult = { resources: [] };
            const now = DateTime.now();
            let anyRefreshFailed = false;

            for (const resourceType of resourceTypes) {
                const storedResourceList = this.resourceListMap.get(resourceType);

                const newResourceList = await this.retrieveResourceList(resourceType);
                if (!newResourceList) {
                    // Failed to update this resource type
                    result.resources.push({
                        typeName: resourceType,
                        resourceIdentifiers: storedResourceList?.resourceIdentifiers ?? [],
                    });
                    anyRefreshFailed = true;
                    continue;
                }

                this.resourceListMap.set(resourceType, {
                    ...newResourceList,
                    createdTimestamp: storedResourceList?.createdTimestamp ?? now,
                    lastUpdatedTimestamp: now,
                });

                result.resources.push({
                    typeName: resourceType,
                    resourceIdentifiers: newResourceList.resourceIdentifiers,
                });
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
            this.resourceStateMap.clear();
            this.resourceListMap.clear();
        }
        this.settings = newSettings;
    }

    static create(external: CfnExternal) {
        return new ResourceStateManager(external.ccapiService, external.schemaRetriever);
    }
}
