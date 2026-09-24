import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CancellationToken } from 'vscode-jsonrpc';
import { ExecuteCommandParams } from 'vscode-languageserver';
import { executionHandler } from '../../../src/handlers/ExecutionHandler';
import { createLspCommands } from '../../../src/protocol/LspCommands';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';
import { AwsRegion } from '../../../src/utils/Region';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('executionHandler', () => {
    const token = {} as CancellationToken;
    const suffixedCommands = createLspCommands('aws.cloudformation');
    const unsuffixedCommands = createLspCommands();

    let components: ReturnType<typeof createMockComponents>;
    let telemetryCount: ReturnType<typeof vi.fn>;

    function invoke(command: string, args: unknown[] = []) {
        const params: ExecuteCommandParams = { command, arguments: args };
        return executionHandler(components)(params, token, undefined as never, undefined);
    }

    beforeEach(() => {
        components = createMockComponents({ commands: suffixedCommands });
        components.diagnosticCoordinator.handleClearCfnDiagnostic.resolves();

        telemetryCount = vi.fn();
        vi.spyOn(TelemetryService.instance, 'get').mockReturnValue({ count: telemetryCount } as never);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should clear a diagnostic for the client-specific clear-diagnostic command', () => {
        invoke(suffixedCommands.clearDiagnostic, ['file:///template.yaml', 'diagnostic-1']);

        expect(
            components.diagnosticCoordinator.handleClearCfnDiagnostic.calledOnceWithExactly(
                'file:///template.yaml',
                'diagnostic-1',
            ),
        ).toBe(true);
        expect(telemetryCount).toHaveBeenCalledWith('accepted.clearDiagnostic', 1);
    });

    it('should not clear a diagnostic when the arguments are incomplete', () => {
        invoke(suffixedCommands.clearDiagnostic, ['file:///template.yaml']);

        expect(components.diagnosticCoordinator.handleClearCfnDiagnostic.called).toBe(false);
    });

    it('should track the accepted code action for the client-specific track command', () => {
        invoke(suffixedCommands.trackCodeActionAccepted, ['extractToParameter']);

        expect(telemetryCount).toHaveBeenCalledWith('accepted.extractToParameter', 1);
    });

    it('should update the region for the client-specific update-region command', () => {
        invoke(suffixedCommands.updateRegion, [AwsRegion.US_WEST_2]);

        expect(components.awsCredentials.handleIamCredentialsDelete.calledOnce).toBe(true);
        expect(components.settingsManager.updateRegion.calledOnceWithExactly(AwsRegion.US_WEST_2)).toBe(true);
    });

    it("should ignore another client's command ids", () => {
        const otherClient = createLspCommands('amazonwebservices.aws-toolkit-vscode');

        invoke(otherClient.clearDiagnostic, ['file:///template.yaml', 'diagnostic-1']);
        invoke(otherClient.updateRegion, [AwsRegion.US_WEST_2]);

        expect(components.diagnosticCoordinator.handleClearCfnDiagnostic.called).toBe(false);
        expect(components.awsCredentials.handleIamCredentialsDelete.called).toBe(false);
        expect(components.settingsManager.updateRegion.called).toBe(false);
    });

    it('should ignore the unsuffixed command ids when the client commands are suffixed', () => {
        invoke(unsuffixedCommands.clearDiagnostic, ['file:///template.yaml', 'diagnostic-1']);

        expect(components.diagnosticCoordinator.handleClearCfnDiagnostic.called).toBe(false);
    });

    it('should ignore unknown commands', () => {
        expect(invoke('/command/unknown', ['anything'])).toBeUndefined();

        expect(components.diagnosticCoordinator.handleClearCfnDiagnostic.called).toBe(false);
        expect(components.awsCredentials.handleIamCredentialsDelete.called).toBe(false);
        expect(components.settingsManager.updateRegion.called).toBe(false);
    });

    it('should keep routing the unsuffixed command ids for clients without an extension name', () => {
        components = createMockComponents({ commands: unsuffixedCommands });
        components.diagnosticCoordinator.handleClearCfnDiagnostic.resolves();

        invoke(unsuffixedCommands.clearDiagnostic, ['file:///template.yaml', 'diagnostic-1']);
        invoke(unsuffixedCommands.updateRegion, [AwsRegion.US_WEST_2]);

        expect(components.diagnosticCoordinator.handleClearCfnDiagnostic.calledOnce).toBe(true);
        expect(components.settingsManager.updateRegion.calledOnceWithExactly(AwsRegion.US_WEST_2)).toBe(true);
    });
});
