import type { TypeSummary } from '@aws-sdk/client-cloudformation';
import { z } from 'zod';
import type { CfnService } from '../services/CfnService';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { HookCache } from './HookCache';
import type {
    HookSummary,
    DescribeHookResult,
    DescribeHookParams,
    ListHooksResult,
    ListHooksDetailedResult,
    DetailedHook,
} from './HooksRequestType';

const log = LoggerFactory.getLogger('HooksManager');

const DetailedFetchConcurrency = 10;

export type ParsedHookConfiguration = {
    configured: boolean;
    failureMode?: string;
    invocationStatus?: string;
    targetOperations?: string[];
    ruleUri?: string;
};

function lenient<T extends z.ZodType>(schema: T) {
    return z
        .unknown()
        .optional()
        .transform((value) => {
            const result = schema.safeParse(value);
            return result.success ? result.data : undefined;
        });
}

const StringListSchema = z
    .array(z.unknown())
    .transform((items) => items.filter((item): item is string => typeof item === 'string'));

const RuleLocationSchema = z.union([z.string(), z.looseObject({ uri: z.string() })]);

const HookConfigurationSchema = z.looseObject({
    FailureMode: lenient(z.string()),
    HookInvocationStatus: lenient(z.string()),
    TargetOperations: lenient(StringListSchema),
    Properties: lenient(z.looseObject({ ruleLocation: lenient(RuleLocationSchema) })),
});

const HookConfigurationEnvelopeSchema = z.looseObject({
    CloudFormationConfiguration: lenient(z.looseObject({ HookConfiguration: lenient(HookConfigurationSchema) })),
});

export function parseHookConfiguration(rawConfiguration: string): ParsedHookConfiguration {
    let raw: unknown;
    try {
        raw = JSON.parse(rawConfiguration);
    } catch {
        return { configured: false };
    }

    const envelope = HookConfigurationEnvelopeSchema.safeParse(raw);
    const hookConfiguration = envelope.success
        ? envelope.data.CloudFormationConfiguration?.HookConfiguration
        : undefined;

    if (!hookConfiguration || Object.keys(hookConfiguration).length === 0) {
        return { configured: false };
    }

    const ruleLocation = hookConfiguration.Properties?.ruleLocation;

    return {
        configured: true,
        failureMode: hookConfiguration.FailureMode,
        invocationStatus: hookConfiguration.HookInvocationStatus,
        targetOperations: hookConfiguration.TargetOperations,
        ruleUri: typeof ruleLocation === 'string' ? ruleLocation : ruleLocation?.uri,
    };
}

export class HooksManager {
    private readonly hooksCache: Map<string, HookSummary> = new Map();
    private readonly hookDetailsCache: Map<string, DescribeHookResult> = new Map();
    private readonly inFlightDescribes: Map<string, Promise<DescribeHookResult>> = new Map();
    private nextToken?: string;

    constructor(
        private readonly cfnService: CfnService,
        private readonly hookCache: HookCache = new HookCache(),
    ) {}

    public async listHooksDetailed(loadMore?: boolean): Promise<ListHooksDetailedResult> {
        const listed = await this.listHooks(loadMore);
        const detailed: DetailedHook[] = [];
        for (let i = 0; i < listed.hooks.length; i += DetailedFetchConcurrency) {
            const batch = listed.hooks.slice(i, i + DetailedFetchConcurrency);
            const resolved = await Promise.all(
                batch.map(async (hook) => {
                    let parsed: ParsedHookConfiguration;
                    let configuration: string | undefined;
                    try {
                        configuration = await this.hookCache.getConfiguration(hook.typeName, () =>
                            this.cfnService.getHookConfiguration(hook.typeName),
                        );
                        parsed = parseHookConfiguration(configuration);
                    } catch (error) {
                        log.warn(error, `Failed to read configuration for hook ${hook.typeName}`);
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
        } else if (!this.nextToken) {
            return { hooks: [...this.hooksCache.values()], nextToken: undefined };
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

        const inFlight = this.inFlightDescribes.get(cacheKey);
        if (inFlight) {
            return await inFlight;
        }

        const pending = this.fetchHookDetails(params, cacheKey);
        this.inFlightDescribes.set(cacheKey, pending);
        try {
            return await pending;
        } finally {
            this.inFlightDescribes.delete(cacheKey);
        }
    }

    private async fetchHookDetails(params: DescribeHookParams, cacheKey: string): Promise<DescribeHookResult> {
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

        for (const key of new Set([cacheKey, result.typeName, result.arn])) {
            if (key) {
                this.hookDetailsCache.set(key, result);
            }
        }
        return result;
    }

    public clearCache(): void {
        this.hooksCache.clear();
        this.hookDetailsCache.clear();
        this.hookCache.invalidateAll();
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
