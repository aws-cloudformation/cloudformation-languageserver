import { DeepReadonly } from 'ts-essentials';
import { AwsRegion } from '../utils/Region';

// Core Settings Types
export type Toggleable<T = Record<string, unknown>> = {
    enabled: boolean;
} & T;

export type CfnLintInitializationSettings = {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    totalTimeoutMs: number;
};

export type ProfileSettings = {
    region: AwsRegion;
    profile: string;
};

export type HoverSettings = Toggleable<object>;

export type CompletionSettings = Toggleable<{
    maxCompletions: number;
}>;

export type CfnLintSettings = Toggleable<{
    delayMs: number;
    lintOnChange: boolean;
    initialization: CfnLintInitializationSettings;
}>;

export type GuardSettings = Toggleable<{
    delayMs: number;
    validateOnChange: boolean;
    enabledRulePacks: readonly string[];
    rulesFile?: string;
    timeout: number;
    maxConcurrentValidations: number;
    maxQueueSize: number;
    memoryCleanupInterval: number;
    maxMemoryUsage: number;
    defaultSeverity: 'error' | 'warning' | 'information' | 'hint';
}>;

export type DiagnosticsSettings = {
    cfnLint: CfnLintSettings;
    cfnGuard: GuardSettings;
};

export type EditorSettings = {
    tabSize: number;
    insertSpaces: boolean;
    detectIndentation: boolean;
};

export interface Settings {
    profile: ProfileSettings;
    hover: HoverSettings;
    completion: CompletionSettings;
    diagnostics: DiagnosticsSettings;
    editor: EditorSettings;
}

export const DefaultSettings: DeepReadonly<Settings> = {
    profile: {
        region: AwsRegion.US_EAST_1,
        profile: 'default',
    },
    hover: {
        enabled: true,
    },
    completion: {
        enabled: true,
        maxCompletions: 100,
    },
    diagnostics: {
        cfnLint: {
            enabled: true,
            delayMs: 3000, // 3 seconds default delay
            lintOnChange: true,
            initialization: {
                maxRetries: 3,
                initialDelayMs: 1000,
                maxDelayMs: 30_000,
                backoffMultiplier: 2,
                totalTimeoutMs: 120_000, // 2 minutes total timeout
            },
        },
        cfnGuard: {
            enabled: true,
            delayMs: 1000, // Same as cfnLint for consistency
            validateOnChange: true,
            enabledRulePacks: ['cis-aws-benchmark-level-1'], // Default essential packs
            timeout: 30_000, // 30 seconds timeout
            maxConcurrentValidations: 3, // Maximum concurrent validations
            maxQueueSize: 10, // Maximum queued validation requests
            memoryCleanupInterval: 60_000, // Memory cleanup interval (1 minute)
            maxMemoryUsage: 100 * 1024 * 1024, // 100MB memory threshold
            defaultSeverity: 'information', // Default severity for Guard rules
        },
    },
    editor: {
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
    },
} as const;

export class SettingsState implements Settings {
    profile = structuredClone(DefaultSettings.profile);
    hover = structuredClone(DefaultSettings.hover);
    completion = structuredClone(DefaultSettings.completion);
    diagnostics = structuredClone(DefaultSettings.diagnostics);
    editor = structuredClone(DefaultSettings.editor);

    update(settings: Settings): void {
        Object.assign(this, structuredClone(settings));
    }

    toSettings(): Settings {
        return structuredClone(this);
    }
}
