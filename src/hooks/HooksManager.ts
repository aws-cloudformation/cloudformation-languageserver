import type { TypeSummary } from '@aws-sdk/client-cloudformation';
import type { CfnService } from '../services/CfnService';
import { HookCache } from './HookCache';
import type { HookSchemaStore } from './HookSchemaStore';
import type {
    HookSummary,
    DescribeHookResult,
    DescribeHookParams,
    ListHooksResult,
    ListHooksDetailedResult,
    DetailedHook,
} from './HooksRequestType';

const StaleDaysThreshold = 7;
const MsPerDay = 24 * 60 * 60 * 1000;
const DetailedFetchConcurrency = 10;

export type ParsedHookConfiguration = {
    configured: boolean;
    failureMode?: string;
    invocationStatus?: string;
    targetOperations?: string[];
    ruleUri?: string;
};

export function parseHookConfiguration(rawConfiguration: string): ParsedHookConfiguration {
    let hookConfiguration: Record<string, unknown> | undefined;
    try {
        const parsed = JSON.parse(rawConfiguration) as Record<string, unknown>;
        const wrapper = parsed.CloudFormationConfiguration as Record<string, unknown> | undefined;
        hookConfiguration = wrapper?.HookConfiguration as Record<string, unknown> | undefined;
    } catch {
        hookConfiguration = undefined;
    }

    if (!hookConfiguration || Object.keys(hookConfiguration).length === 0) {
        return { configured: false };
    }

    const targetOperations = Array.isArray(hookConfiguration.TargetOperations)
        ? (hookConfiguration.TargetOperations as string[])
        : undefined;

    return {
        configured: true,
        failureMode: typeof hookConfiguration.FailureMode === 'string' ? hookConfiguration.FailureMode : undefined,
        invocationStatus:
            typeof hookConfiguration.HookInvocationStatus === 'string'
                ? hookConfiguration.HookInvocationStatus
                : undefined,
        targetOperations,
        ruleUri: extractRuleUri(hookConfiguration),
    };
}

function extractRuleUri(hookConfiguration: Record<string, unknown>): string | undefined {
    const properties = hookConfiguration.Properties as Record<string, unknown> | undefined;
    const ruleLocation = properties?.ruleLocation;
    if (typeof ruleLocation === 'string') {
        return ruleLocation;
    }
    if (ruleLocation && typeof ruleLocation === 'object') {
        const uri = (ruleLocation as Record<string, unknown>).uri;
        if (typeof uri === 'string') {
            return uri;
        }
    }
    return undefined;
}

export class HooksManager {
    private readonly hooksCache: Map<string, HookSummary> = new Map();
    private readonly hookDetailsCache: Map<string, DescribeHookResult> = new Map();
    private nextToken?: string;

    constructor(
        private readonly cfnService: CfnService,
        private readonly schemaStore?: HookSchemaStore,
        private readonly staleDaysThreshold: number = StaleDaysThreshold,
        private readonly hookCache: HookCache = new HookCache(),
    ) {}

    public async listHooksDetailed(loadMore?: boolean): Promise<ListHooksDetailedResult> {
        const listed = await this.listHooks(loadMore);
        const detailed: DetailedHook[] = [];
        for (let i = 0; i < listed.hooks.length; i += DetailedFetchConcurrency) {
            const batch = listed.hooks.slice(i, i + DetailedFetchConcurrency);
            const resolved = await Promise.all(
                batch.map(async (hook) => {
                    let parsed: ParsedHookConfiguration = { configured: false };
                    let configuration: string | undefined;
                    try {
                        configuration = await this.hookCache.getConfiguration(hook.typeName, () =>
                            this.cfnService.getHookConfiguration(hook.typeName),
                        );
                        parsed = parseHookConfiguration(configuration);
                    } catch {
                        parsed = { configured: false };
                    }
                    return {
                        ...hook,
                        configuration,
                        configured: parsed.configured,
                        failureMode: parsed.failureMode,
                        invocationStatus: parsed.invocationStatus,
                        targetOperations: parsed.targetOperations,
                        ruleUri: parsed.ruleUri,
                    };
                }),
            );
            detailed.push(...resolved);
        }
        return { hooks: detailed, nextToken: listed.nextToken };
    }

    public async getCachedRuleContent(ruleUri: string, loader: () => Promise<string>): Promise<string> {
        return await this.hookCache.getRuleContent(ruleUri, loader);
    }

    public async listHooks(loadMore?: boolean): Promise<ListHooksResult> {
        if (!loadMore) {
            this.hooksCache.clear();
            this.nextToken = undefined;
        }

        const response = await this.cfnService.listHooks(loadMore ? this.nextToken : undefined);

        for (const hook of response.hooks) {
            if (hook.TypeName && !this.hooksCache.has(hook.TypeName)) {
                this.hooksCache.set(hook.TypeName, this.mapTypeSummaryToHookSummary(hook));
            }
        }

        this.nextToken = response.nextToken;

        return {
            hooks: [...this.hooksCache.values()],
            nextToken: this.nextToken,
        };
    }

    public async describeHook(params: DescribeHookParams): Promise<DescribeHookResult> {
        const cacheKey = params.typeName ?? params.arn;
        if (!cacheKey) {
            throw new Error('describeHook requires either typeName or arn');
        }

        const memCached = this.hookDetailsCache.get(cacheKey);
        if (memCached) {
            return memCached;
        }

        if (params.typeName && this.schemaStore) {
            const persisted = this.schemaStore.get(params.typeName);
            if (persisted && !this.isStale(persisted.lastModifiedMs)) {
                this.hookDetailsCache.set(cacheKey, persisted.schema);
                return persisted.schema;
            }
        }

        const response = await this.cfnService.describeHook(params);
        const result: DescribeHookResult = {
            typeName: response.TypeName ?? '',
            arn: response.Arn ?? '',
            description: response.Description,
            schema: response.Schema,
            configurationSchema: response.ConfigurationSchema,
            visibility: response.Visibility ?? 'PRIVATE',
            defaultVersionId: response.DefaultVersionId,
            lastUpdated: response.LastUpdated?.toISOString(),
        };

        this.hookDetailsCache.set(cacheKey, result);
        if (params.typeName && this.schemaStore) {
            await this.schemaStore.put(params.typeName, result);
        }
        return result;
    }

    public clearCache(): void {
        this.hooksCache.clear();
        this.hookDetailsCache.clear();
        this.hookCache.invalidateAll();
        this.nextToken = undefined;
    }

    private isStale(lastModifiedMs: number): boolean {
        const ageMs = Date.now() - lastModifiedMs;
        return ageMs >= this.staleDaysThreshold * MsPerDay;
    }

    private mapTypeSummaryToHookSummary(summary: TypeSummary): HookSummary {
        return {
            typeName: summary.TypeName ?? '',
            typeArn: summary.TypeArn ?? '',
            defaultVersionId: summary.DefaultVersionId,
            description: summary.Description,
            lastUpdated: summary.LastUpdated?.toISOString(),
        };
    }
}
