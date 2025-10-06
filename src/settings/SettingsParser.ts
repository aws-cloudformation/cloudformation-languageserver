import { LevelWithSilent } from 'pino';
import { z } from 'zod';
import { LogLevel } from '../telemetry/LoggerFactory';
import { AwsRegion } from '../utils/Region';
import { ProfileSettings, Settings } from './Settings';

const AwsRegionSchema = z.enum(Object.values(AwsRegion));

const LogLevelSchema = z.enum(Object.keys(LogLevel) as LevelWithSilent[]);

function createProfileSchema(defaults: Settings['profile']) {
    return z
        .object({
            region: AwsRegionSchema.nullish().transform((val) => val ?? defaults.region),
            profile: z
                .string()
                .nullish()
                .transform((val) => val ?? defaults.profile),
        })
        .nullish()
        .transform((val) => val ?? defaults);
}

function createHoverSchema(defaults: Settings['hover']) {
    return z
        .object({
            enabled: z.boolean().default(defaults.enabled),
        })
        .default(defaults);
}

function createCompletionSchema(defaults: Settings['completion']) {
    return z
        .object({
            enabled: z.boolean().default(defaults.enabled),
            maxCompletions: z.number().default(defaults.maxCompletions),
        })
        .default(defaults);
}

function createCfnLintInitializationSchema(defaults: Settings['diagnostics']['cfnLint']['initialization']) {
    return z
        .object({
            maxRetries: z.number().default(defaults.maxRetries),
            initialDelayMs: z.number().default(defaults.initialDelayMs),
            maxDelayMs: z.number().default(defaults.maxDelayMs),
            backoffMultiplier: z.number().default(defaults.backoffMultiplier),
            totalTimeoutMs: z.number().default(defaults.totalTimeoutMs),
        })
        .default(defaults);
}

function createCfnLintSchema(defaults: Settings['diagnostics']['cfnLint']) {
    return z
        .object({
            enabled: z.boolean().default(defaults.enabled),
            delayMs: z.number().default(defaults.delayMs),
            lintOnChange: z.boolean().default(defaults.lintOnChange),
            initialization: createCfnLintInitializationSchema(defaults.initialization),
        })
        .default(defaults);
}

function createGuardSchema(defaults: Settings['diagnostics']['cfnGuard']) {
    return z
        .object({
            enabled: z.boolean().default(defaults.enabled),
            delayMs: z.number().default(defaults.delayMs),
            validateOnChange: z.boolean().default(defaults.validateOnChange),
            enabledRulePacks: z.array(z.string()).readonly().default(defaults.enabledRulePacks),
            timeout: z.number().default(defaults.timeout),
            maxConcurrentValidations: z.number().default(defaults.maxConcurrentValidations),
            maxQueueSize: z.number().default(defaults.maxQueueSize),
            memoryCleanupInterval: z.number().default(defaults.memoryCleanupInterval),
            maxMemoryUsage: z.number().default(defaults.maxMemoryUsage),
            defaultSeverity: z.enum(['error', 'warning', 'information', 'hint']).default(defaults.defaultSeverity),
        })
        .default(defaults);
}

function createDiagnosticsSchema(defaults: Settings['diagnostics']) {
    return z
        .object({
            cfnLint: createCfnLintSchema(defaults.cfnLint),
            cfnGuard: createGuardSchema(defaults.cfnGuard),
        })
        .default(defaults);
}

function createTelemetrySchema(defaults: Settings['telemetry']) {
    return z
        .object({
            enabled: z
                .boolean()
                .nullish()
                .transform((val) => val ?? defaults.enabled),
            logLevel: LogLevelSchema.nullish().transform((val) => val ?? defaults.logLevel),
        })
        .nullish()
        .transform((val) => val ?? defaults);
}

function createEditorSchema(defaults: Settings['editor']) {
    return z
        .object({
            tabSize: z.number().default(defaults.tabSize),
            insertSpaces: z.boolean().default(defaults.insertSpaces),
            detectIndentation: z.boolean().default(defaults.detectIndentation),
        })
        .default(defaults);
}

function createSettingsSchema(defaults: Settings) {
    return z
        .object({
            profile: createProfileSchema(defaults.profile),
            hover: createHoverSchema(defaults.hover),
            completion: createCompletionSchema(defaults.completion),
            diagnostics: createDiagnosticsSchema(defaults.diagnostics),
            telemetry: createTelemetrySchema(defaults.telemetry),
            editor: createEditorSchema(defaults.editor),
        })
        .default(defaults);
}

export function parseSettings(input: unknown, defaults: Settings): Settings {
    return createSettingsSchema(defaults).parse(input);
}

export function parseProfile(input: unknown, defaults: ProfileSettings): ProfileSettings {
    return createProfileSchema(defaults).parse(input);
}
