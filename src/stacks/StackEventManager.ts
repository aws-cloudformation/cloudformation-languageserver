import { StackEvent } from '@aws-sdk/client-cloudformation';
import { CfnService } from '../services/CfnService';

export class StackEventManager {
    private mostRecentEventId?: string;
    private stackName?: string;

    constructor(private readonly cfnService: CfnService) {}

    async fetchEvents(stackName: string, nextToken?: string): Promise<{ events: StackEvent[]; nextToken?: string }> {
        if (this.stackName !== stackName) {
            this.clear();
            this.stackName = stackName;
        }

        const response = await this.cfnService.describeStackEvents({ StackName: stackName }, { nextToken });
        const events = response.StackEvents ?? [];

        if (!nextToken && events.length > 0) {
            this.mostRecentEventId = events[0].EventId;
        }

        return { events, nextToken: response.NextToken };
    }

    async refresh(stackName: string): Promise<StackEvent[]> {
        if (this.stackName !== stackName) {
            const eventsResponse = await this.fetchEvents(stackName);
            return eventsResponse.events;
        }

        const newEvents: StackEvent[] = [];
        let token: string | undefined;
        let pagesChecked = 0;
        const maxPages = 5;

        while (pagesChecked < maxPages) {
            const response = await this.cfnService.describeStackEvents({ StackName: stackName }, { nextToken: token });
            const events = response.StackEvents ?? [];

            for (const event of events) {
                if (event.EventId === this.mostRecentEventId) {
                    if (newEvents.length > 0) {
                        this.mostRecentEventId = newEvents[0].EventId;
                    }
                    return newEvents;
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

        return newEvents;
    }

    clear(): void {
        this.mostRecentEventId = undefined;
        this.stackName = undefined;
    }
}
