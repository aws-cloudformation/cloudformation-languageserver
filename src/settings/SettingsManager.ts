import { diff } from 'deep-object-diff';
import { LspWorkspace } from '../protocol/LspWorkspace';
import { ServerComponents } from '../server/ServerComponents';
import { ClientMessage } from '../telemetry/ClientMessage';
import { isBeta, isDev } from '../utils/Environment';
import { extractErrorMessage } from '../utils/Errors';
import { AwsRegion } from '../utils/Region';
import { toString } from '../utils/String';
import { PartialDataObserver, SubscriptionManager } from '../utils/SubscriptionManager';
import { parseWithPrettyError } from '../utils/ZodErrorWrapper';
import { DefaultSettings, ISettingsSubscriber, Settings, SettingsPathKey, SettingsState } from './Settings';
import { parseSettings } from './SettingsParser';

export class SettingsManager implements ISettingsSubscriber {
    private readonly settingsState = new SettingsState();
    private readonly subscriptionManager = new SubscriptionManager<Settings>();

    constructor(
        private readonly workspace: LspWorkspace,
        private readonly clientMessage: ClientMessage,
    ) {}

    /**
     * Get current settings synchronously
     */
    getCurrentSettings(): Settings {
        return this.settingsState.toSettings();
    }

    /**
     * Subscribe to settings changes
     * Overloaded to support both full and partial subscriptions
     */
    subscribe<K extends SettingsPathKey>(path: K, observer: PartialDataObserver<Settings[K]>) {
        const currentSettings = this.getCurrentSettings();
        return this.subscriptionManager.addPartialSubscription(path, observer, currentSettings);
    }

    /**
     * Sync configuration from LSP workspace
     * Maintains existing behavior while adding notification support
     */
    async syncConfiguration(): Promise<void> {
        try {
            // Get CloudFormation-specific settings
            const cfnConfig: unknown = await this.workspace.getConfiguration('aws.cloudformation');

            // Get editor settings
            const editorConfig: unknown = await this.workspace.getConfiguration('editor');

            const mergedConfig = structuredClone({
                ...(cfnConfig as Record<string, unknown>),
                editor: editorConfig,
            });

            const settings = parseWithPrettyError(parseSettings, mergedConfig, this.getCurrentSettings());
            this.validateAndUpdate(settings);
        } catch (error) {
            this.clientMessage.error(
                `Failed to sync configuration, keeping previous settings: ${extractErrorMessage(error)}`,
            );
        }
    }

    updateProfileSettings(profile: string, region: AwsRegion): void {
        try {
            const currentSettings = this.getCurrentSettings();
            this.validateAndUpdate({
                ...currentSettings,
                profile: {
                    profile,
                    region,
                },
            });
        } catch (error) {
            this.clientMessage.error(
                `Failed to update profile configuration, keeping previous settings: ${extractErrorMessage(error)}`,
            );
        }
    }

    /**
     * Clear all subscriptions (useful for cleanup)
     */
    clearSubscriptions(): void {
        this.subscriptionManager.clear();
    }

    /**
     * Validate and update settings with notification support
     * Maintains all existing validation logic from SettingsManager
     */
    private validateAndUpdate(newSettings: Settings): void {
        const oldSettings = this.settingsState.toSettings();
        if (isDev || isBeta) {
            newSettings.telemetry.enabled = DefaultSettings.telemetry.enabled;
        }

        newSettings.diagnostics.cfnLint.initialization.maxDelayMs = clipNumber(
            newSettings.diagnostics.cfnLint.initialization.maxDelayMs,
            oldSettings.diagnostics.cfnLint.initialization.maxDelayMs,
            {
                greaterThan: 0,
            },
        );

        newSettings.diagnostics.cfnLint.initialization.initialDelayMs = clipNumber(
            newSettings.diagnostics.cfnLint.initialization.initialDelayMs,
            oldSettings.diagnostics.cfnLint.initialization.initialDelayMs,
            {
                greaterThan: 0,
            },
        );
        newSettings.diagnostics.cfnLint.initialization.maxDelayMs = Math.max(
            newSettings.diagnostics.cfnLint.initialization.maxDelayMs,
            newSettings.diagnostics.cfnLint.initialization.initialDelayMs,
        );

        // Validate Guard settings
        newSettings.diagnostics.cfnGuard.delayMs = clipNumber(
            newSettings.diagnostics.cfnGuard.delayMs,
            oldSettings.diagnostics.cfnGuard.delayMs,
            {
                greaterThan: 0,
            },
        );

        newSettings.diagnostics.cfnGuard.timeout = clipNumber(
            newSettings.diagnostics.cfnGuard.timeout,
            oldSettings.diagnostics.cfnGuard.timeout,
            {
                greaterThan: 0,
            },
        );

        const difference = diff(oldSettings, newSettings);
        const hasChanged = Object.keys(difference).length > 0;

        if (hasChanged) {
            this.settingsState.update(newSettings);
            this.clientMessage.info(`Settings updated: ${toString(difference)}`);
            this.subscriptionManager.notify(newSettings, oldSettings);
        }
    }

    static create(components: ServerComponents): SettingsManager {
        return new SettingsManager(components.workspace, components.clientMessage);
    }
}

function clipNumber(
    value: number,
    defaultValue: number,
    conditions: {
        greaterThan?: number;
        lessThan?: number;
    },
): number {
    const { greaterThan = Number.NEGATIVE_INFINITY, lessThan = Number.POSITIVE_INFINITY } = conditions;

    if (value <= greaterThan) {
        return defaultValue;
    }

    if (value >= lessThan) {
        return defaultValue;
    }

    return value;
}
