export enum OperationType {
    HOVER = 'hover',
    COMPLETION = 'completion',
}

export interface OperationTester {
    testAllScenarios(uri: string): Promise<void>;
}

export interface TesterConfig {
    retryTimeoutMs: number;
    avgDurationLimitMs: number;
    maxDurationLimitMs: number;
}

export const TESTER_CONFIG: Record<OperationType, TesterConfig> = {
    [OperationType.HOVER]: {
        retryTimeoutMs: 3000,
        avgDurationLimitMs: 150,
        maxDurationLimitMs: 3000,
    },
    [OperationType.COMPLETION]: {
        retryTimeoutMs: 5000,
        avgDurationLimitMs: 300,
        maxDurationLimitMs: 5000,
    },
};
