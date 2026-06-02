import type { TypeSummary } from '@aws-sdk/client-cloudformation';
import type { CfnService } from '../services/CfnService';
import type { HookSchemaStore } from './HookSchemaStore';
import type { HookSummary, DescribeHookResult, DescribeHookParams, ListHooksResult } from './HooksRequestType';

const StaleDaysThreshold = 7;
const MsPerDay = 24 * 60 * 60 * 1000;

export class HooksManager {
    private readonly hooksCache: Map<string, HookSummary> = new Map();
    private readonly hookDetailsCache: Map<string, DescribeHookResult> = new Map();
    private nextToken?: string;

    constructor(
        private readonly cfnService: CfnService,
        private readonly schemaStore?: HookSchemaStore,
        private readonly staleDaysThreshold: number = StaleDaysThreshold,
    ) {}

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
        const cacheKey = params.typeName ?? params.arn ?? '';

        // 1. Memory cache (fastest, request-scoped)
        const memCached = this.hookDetailsCache.get(cacheKey);
        if (memCached) {
            return memCached;
        }

        // 2. Persistent cache (across restarts) — only if not stale
        if (params.typeName && this.schemaStore) {
            const persisted = this.schemaStore.get(params.typeName);
            if (persisted && !this.isStale(persisted.lastModifiedMs)) {
                this.hookDetailsCache.set(cacheKey, persisted.schema);
                return persisted.schema;
            }
        }

        // 3. Cache miss or stale — fetch from CloudFormation
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
