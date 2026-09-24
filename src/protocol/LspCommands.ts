import { DeepReadonly } from 'ts-essentials';
import { ExtendedInitializeParams } from '../server/InitParams';

export type LspCommands = DeepReadonly<{
    clearDiagnostic: string;
    trackCodeActionAccepted: string;
    updateRegion: string;
}>;

const BaseCommands: LspCommands = {
    clearDiagnostic: '/command/template/clear-diagnostic',
    trackCodeActionAccepted: '/command/codeAction/track',
    updateRegion: '/command/region/update',
};

const MaxSuffixLength = 64;

export function createLspCommands(suffix?: string): LspCommands {
    if (!suffix) {
        return BaseCommands;
    }

    return {
        clearDiagnostic: `${BaseCommands.clearDiagnostic}.${suffix}`,
        trackCodeActionAccepted: `${BaseCommands.trackCodeActionAccepted}.${suffix}`,
        updateRegion: `${BaseCommands.updateRegion}.${suffix}`,
    };
}

export function resolveCommandSuffix(params: ExtendedInitializeParams): string | undefined {
    const name: unknown = params.initializationOptions?.aws?.clientInfo?.extension?.name;
    if (name === undefined) {
        return undefined;
    }
    if (typeof name !== 'string') {
        throw new TypeError(
            `Invalid initializationOptions.aws.clientInfo.extension.name: expected a string, received ${typeof name}`,
        );
    }

    return sanitizeCommandSuffix(name);
}

export function sanitizeCommandSuffix(name: string): string | undefined {
    const sanitized = name
        .replaceAll(/[^A-Za-z0-9._-]+/g, '-')
        .slice(0, MaxSuffixLength)
        .replaceAll(/^[._-]+|[._-]+$/g, '');

    return sanitized || undefined;
}
