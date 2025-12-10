import { OperationEvent } from '@aws-sdk/client-cloudformation';
import { CfnService } from '../services/CfnService';
import { StackOperationGroup } from './StackRequestType';

export class StackOperationEventManager {
    private static readonly MAX_REFRESH_PAGES = 5;

    private mostRecentEventId?: string;
    private stackName?: string;

    constructor(private readonly cfnService: CfnService) {}

    async fetchEvents(
        stackName: string,
        nextToken?: string,
    ): Promise<{ operations: StackOperationGroup[]; nextToken?: string }> {
        if (this.stackName !== stackName) {
            this.clear();
            this.stackName = stackName;
        }

        const response = await this.cfnService.describeEvents({ StackName: stackName, NextToken: nextToken });
        const events = response.OperationEvents ?? [];

        if (!nextToken && events.length > 0) {
            this.mostRecentEventId = events[0].EventId;
        }

        return { operations: this.groupByOperation(events), nextToken: response.NextToken };
    }

    async refresh(stackName: string): Promise<{ operations: StackOperationGroup[]; gapDetected: boolean }> {
        if (this.stackName !== stackName) {
            const result = await this.fetchEvents(stackName);
            return { operations: result.operations, gapDetected: false };
        }

        const newEvents: OperationEvent[] = [];
        let token: string | undefined = undefined;
        let pagesChecked = 0;

        while (pagesChecked < StackOperationEventManager.MAX_REFRESH_PAGES) {
            const response = await this.cfnService.describeEvents({ StackName: stackName, NextToken: token });
            const events = response.OperationEvents ?? [];

            for (const event of events) {
                if (event.EventId === this.mostRecentEventId) {
                    if (newEvents.length > 0) {
                        this.mostRecentEventId = newEvents[0].EventId;
                    }
                    return { operations: this.groupByOperation(newEvents), gapDetected: false };
                }
                newEvents.push(event);
            }

            token = response.NextToken;
            pagesChecked++;
            if (!token) break;
        }

        if (newEvents.length > 0) {
            this.mostRecentEventId = newEvents[0].EventId;
        }

        return {
            operations: this.groupByOperation(newEvents),
            gapDetected: pagesChecked === StackOperationEventManager.MAX_REFRESH_PAGES && !!token,
        };
    }

    clear(): void {
        this.mostRecentEventId = undefined;
        this.stackName = undefined;
    }

    private groupByOperation(events: OperationEvent[]): StackOperationGroup[] {
        const groups = new Map<string, OperationEvent[]>();

        for (const event of events) {
            const opId = event.OperationId ?? 'unknown';
            const existing = groups.get(opId);
            if (existing) {
                existing.push(event);
            } else {
                groups.set(opId, [event]);
            }
        }

        return [...groups.entries()].map(([operationId, opEvents]) => ({
            operationId,
            events: opEvents.sort((a, b) => (b.Timestamp?.getTime() ?? 0) - (a.Timestamp?.getTime() ?? 0)),
        }));
    }
}
