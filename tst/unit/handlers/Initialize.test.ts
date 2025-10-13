import { describe, expect, test, vi, beforeEach } from 'vitest';
import { WorkspaceFolder } from 'vscode-languageserver';
import { initializedHandler } from '../../../src/handlers/Initialize';
import { createMockComponents } from '../../utils/MockServerComponents';
import { flushAllPromises } from '../../utils/Utils';

describe('InitializeHandler', () => {
    const mockWorkspaceFolder: WorkspaceFolder = {
        uri: 'file:///test',
        name: 'test',
    };
    let mockServices: ReturnType<typeof createMockComponents>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockServices = createMockComponents();
        mockServices.workspace.getAllWorkspaceFolders.returns([mockWorkspaceFolder]);
        mockServices.cfnLintService.initialize.returns(Promise.resolve());
        mockServices.cfnLintService.mountFolder.returns(Promise.resolve());

        // Mock the settingsManager.syncConfiguration method
        vi.spyOn(mockServices.settingsManager, 'syncConfiguration').mockResolvedValue();
    });

    test('should sync configuration and initialize cfnLintService', async () => {
        mockServices.workspace.getAllWorkspaceFolders.returns([mockWorkspaceFolder]);
        mockServices.cfnLintService.initialize.returns(Promise.resolve());

        const syncConfigSpy = vi.spyOn(mockServices.settingsManager, 'syncConfiguration').mockResolvedValue();

        const handler = initializedHandler(mockServices.lsp.workspace, mockServices);
        handler();

        // Wait for all async operations to complete
        await flushAllPromises();

        expect(syncConfigSpy).toHaveBeenCalled();
        expect(mockServices.cfnLintService.initialize.called).toBe(true);
        expect(mockServices.cfnLintService.mountFolder.calledWith(mockWorkspaceFolder)).toBe(true);
    });
});
