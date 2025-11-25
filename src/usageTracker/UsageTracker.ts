export enum EventType {
    DidDeployment = 'DidDeployment',
    DidValidation = 'DidValidation',
    DidImportResources = 'DidImportResources',
    MeaningfulHover = 'MeaningfulHover',
    MeaningfulCompletion = 'MeaningfulCompletion',
}

export class UsageTracker {
    private readonly events = new Set<EventType>();

    track(event: EventType): void {
        this.events.add(event);
    }

    allUsed(...events: EventType[]): boolean {
        return events.every((event) => {
            return this.events.has(event);
        });
    }

    someUsed(...events: EventType[]): boolean {
        return events.some((event) => {
            return this.events.has(event);
        });
    }
}
