import { z } from 'zod';
import { getRegion } from '../utils/Region';
import { ProfileSettings, Settings } from './Settings';

function createProfileSchema(defaults: Settings['profile']) {
    return z
        .object({
            region: z
                .string()
                .nullish()
                .transform((val) => getRegion(val ?? defaults.region)),
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
    const customizationSchema = z
        .object({
            ignoreChecks: z.array(z.string()).readonly().optional(),
            includeChecks: z.array(z.string()).readonly().optional(),
            mandatoryChecks: z.array(z.string()).readonly().optional(),
            includeExperimental: z.boolean().optional(),
            configureRules: z.array(z.string()).readonly().optional(),
            regions: z.array(z.string()).readonly().optional(),
            customRules: z.array(z.string()).readonly().optional(),
            appendRules: z.array(z.string()).readonly().optional(),
            overrideSpec: z.string().optional(),
            registrySchemas: z.array(z.string()).readonly().optional(),
        })
        .optional();

    return z
        .object({
            enabled: z.boolean().default(defaults.enabled),
            delayMs: z.number().default(defaults.delayMs),
            lintOnChange: z.boolean().default(defaults.lintOnChange),
            path: z.string().optional(),
            initialization: createCfnLintInitializationSchema(defaults.initialization),
            ignoreChecks: z.array(z.string()).readonly().default(defaults.ignoreChecks),
            includeChecks: z.array(z.string()).readonly().default(defaults.includeChecks),
            mandatoryChecks: z.array(z.string()).readonly().default(defaults.mandatoryChecks),
            includeExperimental: z.boolean().default(defaults.includeExperimental),
            configureRules: z.array(z.string()).readonly().default(defaults.configureRules),
            regions: z.array(z.string()).readonly().default(defaults.regions),
            customRules: z.array(z.string()).readonly().default(defaults.customRules),
            appendRules: z.array(z.string()).readonly().default(defaults.appendRules),
            overrideSpec: z.string().default(defaults.overrideSpec),
            registrySchemas: z.array(z.string()).readonly().default(defaults.registrySchemas),
            customization: customizationSchema,
        })
        .transform((data) => {
            // Merge customization settings into main object
            if (data.customization) {
                const { customization, ...rest } = data;
                return {
                    ...rest,
                    ignoreChecks: customization.ignoreChecks ?? data.ignoreChecks,
                    includeChecks: customization.includeChecks ?? data.includeChecks,
                    mandatoryChecks: customization.mandatoryChecks ?? data.mandatoryChecks,
                    includeExperimental: customization.includeExperimental ?? data.includeExperimental,
                    configureRules: customization.configureRules ?? data.configureRules,
                    regions: customization.regions ?? data.regions,
                    customRules: customization.customRules ?? data.customRules,
                    appendRules: customization.appendRules ?? data.appendRules,
                    overrideSpec: customization.overrideSpec ?? data.overrideSpec,
                    registrySchemas: customization.registrySchemas ?? data.registrySchemas,
                };
            }
            return data;
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
            rulesFile: z.string().optional(),
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
            editor: createEditorSchema(defaults.editor),
            awsClient: z
                .object({
                    cloudformation: z
                        .object({
                            waiter: z
                                .object({
                                    changeSet: z
                                        .object({
                                            minDelay: z
                                                .number()
                                                .default(defaults.awsClient.cloudformation.waiter.changeSet.minDelay),
                                            maxDelay: z
                                                .number()
                                                .default(defaults.awsClient.cloudformation.waiter.changeSet.maxDelay),
                                            maxWaitTime: z
                                                .number()
                                                .default(
                                                    defaults.awsClient.cloudformation.waiter.changeSet.maxWaitTime,
                                                ),
                                        })
                                        .default(defaults.awsClient.cloudformation.waiter.changeSet),
                                    stack: z
                                        .object({
                                            minDelay: z
                                                .number()
                                                .default(defaults.awsClient.cloudformation.waiter.stack.minDelay),
                                            maxDelay: z
                                                .number()
                                                .default(defaults.awsClient.cloudformation.waiter.stack.maxDelay),
                                            maxWaitTime: z
                                                .number()
                                                .default(defaults.awsClient.cloudformation.waiter.stack.maxWaitTime),
                                        })
                                        .default(defaults.awsClient.cloudformation.waiter.stack),
                                })
                                .default(defaults.awsClient.cloudformation.waiter),
                        })
                        .default(defaults.awsClient.cloudformation),
                })
                .default(defaults.awsClient),
        })
        .default(defaults);
}

export function parseSettings(input: unknown, defaults: Settings): Settings {
    return createSettingsSchema(defaults).parse(input);
}

export function parseProfile(input: unknown, defaults: ProfileSettings): ProfileSettings {
    return createProfileSchema(defaults).parse(input);
}
