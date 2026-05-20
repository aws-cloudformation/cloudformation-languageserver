import type { TypeSummary } from '@aws-sdk/client-cloudformation';
import type { CfnService } from '../services/CfnService';
import type { HookSummary, DescribeHookResult, DescribeHookParams, ListHooksResult } from './HooksRequestType';

export class HooksManager {
    private readonly hooksCache: Map<string, HookSummary> = new Map();
    private readonly hookDetailsCache: Map<string, DescribeHookResult> = new Map();
    private nextToken?: string;

    constructor(private readonly cfnService: CfnService) {}

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

        const cached = this.hookDetailsCache.get(cacheKey);
        if (cached) {
            return cached;
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
        return result;
    }

    public clearCache(): void {
        this.hooksCache.clear();
        this.hookDetailsCache.clear();
        this.nextToken = undefined;
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
