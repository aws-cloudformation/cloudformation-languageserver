import { ScopedTelemetry } from '../telemetry/ScopedTelemetry';
import { Telemetry } from '../telemetry/TelemetryDecorator';
import { EventType, UsageTracker } from './UsageTracker';

export class UsageTrackerMetrics {
    @Telemetry() private readonly telemetry!: ScopedTelemetry;

    constructor(private readonly usageTracker: UsageTracker) {
        this.registerMetrics();
    }

    private registerMetrics(): void {
        this.telemetry.registerGaugeProvider('cloudformation.used', () =>
            this.usageTracker.someUsed(
                EventType.DidDeployment,
                EventType.DidValidation,
                EventType.DidImportResources,
                EventType.MeaningfulHover,
                EventType.MeaningfulCompletion,
            )
                ? 1
                : 0,
        );
    }
}
