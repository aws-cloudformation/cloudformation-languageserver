import { StackStatus, StackSummary } from '@aws-sdk/client-cloudformation';
import equal from 'fast-deep-equal';
import { CfnService } from '../services/CfnService';

export class StackManager {
    private readonly stacksCache: Map<string, StackSummary> = new Map();
    private nextToken?: string;
    private statusToInclude?: StackStatus[];
    private statusToExclude?: StackStatus[];

    constructor(private readonly cfnService: CfnService) {}

    public async listStacks(
        statusToInclude?: StackStatus[],
        statusToExclude?: StackStatus[],
        loadMore?: boolean,
    ): Promise<{ stacks: StackSummary[]; nextToken?: string }> {
        // If filters changed or initial load, clear cache
        if (!loadMore || this.filtersChanged(statusToInclude, statusToExclude)) {
            this.stacksCache.clear();
            this.nextToken = undefined;
            this.statusToInclude = statusToInclude;
            this.statusToExclude = statusToExclude;
        }

        const response = await this.cfnService.listStacks(
            statusToInclude,
            statusToExclude,
            loadMore ? this.nextToken : undefined,
        );

        for (const stackSummary of response.stacks) {
            if (stackSummary.StackId) {
                this.stacksCache.set(stackSummary.StackId, stackSummary);
            }
        }

        // Update nextToken
        this.nextToken = response.nextToken;

        // Return all cached stacks
        return {
            stacks: [...this.stacksCache.values()],
            nextToken: this.nextToken,
        };
    }

    private filtersChanged(statusToInclude?: StackStatus[], statusToExclude?: StackStatus[]): boolean {
        return !equal(this.statusToInclude, statusToInclude) || !equal(this.statusToExclude, statusToExclude);
    }

    public clearCache(): void {
        this.stacksCache.clear();
        this.nextToken = undefined;
    }
}
