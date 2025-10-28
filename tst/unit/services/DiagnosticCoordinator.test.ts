import { SyntaxNode } from 'tree-sitter';
import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Diagnostic, DiagnosticSeverity, Range, Position } from 'vscode-languageserver';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { DiagnosticCoordinator } from '../../../src/services/DiagnosticCoordinator';
import { CFN_VALIDATION_SOURCE } from '../../../src/stacks/actions/ValidationWorkflow';
import { createMockLspDiagnostics, createMockSyntaxTreeManager } from '../../utils/MockServerComponents';

// Mock NodeType module
vi.mock('../../../src/context/syntaxtree/utils/NodeType', () => ({
    NodeType: {
        isPairNode: vi.fn().mockReturnValue(true),
    },
}));

describe('DiagnosticCoordinator', () => {
    let coordinator: DiagnosticCoordinator;
    let mockPublishDiagnostics: ReturnType<typeof vi.fn>;
    let mockSyntaxTreeManager: ReturnType<typeof createMockSyntaxTreeManager>;

    const testUri = 'file:///test/template.yaml';
    const testUri2 = 'file:///test/template2.yaml';

    // Helper function to create diagnostic
    const createDiagnostic = (
        line: number,
        character: number,
        message: string,
        severity: DiagnosticSeverity = DiagnosticSeverity.Error,
        source?: string,
        code?: string,
    ): Diagnostic => ({
        range: Range.create(Position.create(line, character), Position.create(line, character + 10)),
        message,
        severity,
        source,
        code,
    });

    beforeEach(() => {
        mockPublishDiagnostics = vi.fn().mockResolvedValue(undefined);
        const mockLspDiagnostics = createMockLspDiagnostics();
        mockLspDiagnostics.publishDiagnostics.callsFake(mockPublishDiagnostics);

        mockSyntaxTreeManager = createMockSyntaxTreeManager();
        coordinator = new DiagnosticCoordinator(mockLspDiagnostics, mockSyntaxTreeManager);
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('publishDiagnostics', () => {
        it('should publish diagnostics from a single source', async () => {
            const diagnostics = [
                createDiagnostic(0, 0, 'Error 1', DiagnosticSeverity.Error, 'cfn-lint'),
                createDiagnostic(1, 0, 'Warning 1', DiagnosticSeverity.Warning, 'cfn-lint'),
            ];

            await coordinator.publishDiagnostics('cfn-lint', testUri, diagnostics);

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics,
            });
        });

        it('should merge diagnostics from multiple sources', async () => {
            const cfnLintDiagnostics = [
                createDiagnostic(0, 0, 'CFN Error', DiagnosticSeverity.Error, 'cfn-lint'),
                createDiagnostic(2, 0, 'CFN Warning', DiagnosticSeverity.Warning, 'cfn-lint'),
            ];

            const guardDiagnostics = [
                createDiagnostic(1, 0, 'Guard Error', DiagnosticSeverity.Error, 'guard'),
                createDiagnostic(3, 0, 'Guard Info', DiagnosticSeverity.Information, 'guard'),
            ];

            // Publish from first source
            await coordinator.publishDiagnostics('cfn-lint', testUri, cfnLintDiagnostics);

            // Publish from second source
            await coordinator.publishDiagnostics('guard', testUri, guardDiagnostics);

            // Should have been called twice, second call should contain merged diagnostics
            expect(mockPublishDiagnostics).toHaveBeenCalledTimes(2);

            const lastCall = mockPublishDiagnostics.mock.calls[1][0];
            expect(lastCall.uri).toBe(testUri);
            expect(lastCall.diagnostics).toHaveLength(4);

            // Verify diagnostics are sorted by line number
            expect(lastCall.diagnostics[0].range.start.line).toBe(0); // CFN Error
            expect(lastCall.diagnostics[1].range.start.line).toBe(1); // Guard Error
            expect(lastCall.diagnostics[2].range.start.line).toBe(2); // CFN Warning
            expect(lastCall.diagnostics[3].range.start.line).toBe(3); // Guard Info
        });

        it('should preserve original diagnostic properties when merging', async () => {
            const cfnDiagnostic = createDiagnostic(0, 0, 'CFN Error', DiagnosticSeverity.Error, 'cfn-lint', 'E001');
            const guardDiagnostic = createDiagnostic(
                1,
                0,
                'Guard Warning',
                DiagnosticSeverity.Warning,
                'guard',
                'G001',
            );

            await coordinator.publishDiagnostics('cfn-lint', testUri, [cfnDiagnostic]);
            await coordinator.publishDiagnostics('guard', testUri, [guardDiagnostic]);

            const lastCall = mockPublishDiagnostics.mock.calls[1][0];
            const mergedDiagnostics = lastCall.diagnostics;

            expect(mergedDiagnostics[0]).toEqual(cfnDiagnostic);
            expect(mergedDiagnostics[1]).toEqual(guardDiagnostic);
        });

        it('should update diagnostics when source publishes again', async () => {
            const initialDiagnostics = [createDiagnostic(0, 0, 'Initial Error')];
            const updatedDiagnostics = [createDiagnostic(0, 0, 'Updated Error'), createDiagnostic(1, 0, 'New Error')];

            // Initial publish
            await coordinator.publishDiagnostics('cfn-lint', testUri, initialDiagnostics);
            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: initialDiagnostics,
            });

            // Update from same source
            await coordinator.publishDiagnostics('cfn-lint', testUri, updatedDiagnostics);
            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: updatedDiagnostics,
            });
        });

        it('should handle empty diagnostics array', async () => {
            await coordinator.publishDiagnostics('cfn-lint', testUri, []);

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: [],
            });
        });

        it('should throw error when LSP publishing fails', async () => {
            const error = new Error('LSP connection failed');
            mockPublishDiagnostics.mockRejectedValue(error);

            const diagnostics = [createDiagnostic(0, 0, 'Test Error')];

            await expect(coordinator.publishDiagnostics('cfn-lint', testUri, diagnostics)).rejects.toThrow(
                'LSP connection failed',
            );
        });
    });

    describe('clearDiagnosticsForUri', () => {
        beforeEach(async () => {
            // Set up initial diagnostics from multiple sources
            await coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'CFN Error')]);
            await coordinator.publishDiagnostics('guard', testUri, [createDiagnostic(1, 0, 'Guard Error')]);
            vi.clearAllMocks(); // Clear setup calls
        });

        it('should clear all diagnostics for a document', async () => {
            await coordinator.clearDiagnosticsForUri(testUri);

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: [],
            });

            // Verify internal state is cleaned up
            expect(coordinator.getDiagnostics(testUri)).toEqual([]);
            expect(coordinator.getSources(testUri)).toEqual([]);
        });

        it('should handle clearing non-existent URI gracefully', async () => {
            await coordinator.clearDiagnosticsForUri('file:///non-existent.yaml');

            // Should not publish anything since URI doesn't exist
            expect(mockPublishDiagnostics).not.toHaveBeenCalled();
        });

        it('should throw error when LSP publishing fails during clear all', async () => {
            const error = new Error('LSP connection failed');
            mockPublishDiagnostics.mockRejectedValue(error);

            await expect(coordinator.clearDiagnosticsForUri(testUri)).rejects.toThrow('LSP connection failed');
        });
    });

    describe('getDiagnostics', () => {
        it('should return merged diagnostics for a document', async () => {
            const cfnDiagnostics = [createDiagnostic(0, 0, 'CFN Error')];
            const guardDiagnostics = [createDiagnostic(1, 0, 'Guard Error')];

            await coordinator.publishDiagnostics('cfn-lint', testUri, cfnDiagnostics);
            await coordinator.publishDiagnostics('guard', testUri, guardDiagnostics);

            const result = coordinator.getDiagnostics(testUri);

            expect(result).toHaveLength(2);
            expect(result[0].message).toBe('CFN Error');
            expect(result[1].message).toBe('Guard Error');
        });

        it('should return empty array for non-existent document', () => {
            const result = coordinator.getDiagnostics('file:///non-existent.yaml');
            expect(result).toEqual([]);
        });

        it('should return diagnostics sorted by line and column', async () => {
            const diagnostics = [
                createDiagnostic(2, 5, 'Error at 2:5'),
                createDiagnostic(1, 10, 'Error at 1:10'),
                createDiagnostic(1, 5, 'Error at 1:5'),
                createDiagnostic(2, 0, 'Error at 2:0'),
            ];

            await coordinator.publishDiagnostics('test', testUri, diagnostics);

            const result = coordinator.getDiagnostics(testUri);

            expect(result[0].message).toBe('Error at 1:5');
            expect(result[1].message).toBe('Error at 1:10');
            expect(result[2].message).toBe('Error at 2:0');
            expect(result[3].message).toBe('Error at 2:5');
        });
    });

    describe('getSources', () => {
        it('should return list of sources for a document', async () => {
            await coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'Error')]);
            await coordinator.publishDiagnostics('guard', testUri, [createDiagnostic(1, 0, 'Error')]);

            const sources = coordinator.getSources(testUri);

            expect(sources).toContain('cfn-lint');
            expect(sources).toContain('guard');
            expect(sources).toHaveLength(2);
        });

        it('should return empty array for non-existent document', () => {
            const sources = coordinator.getSources('file:///non-existent.yaml');
            expect(sources).toEqual([]);
        });
    });

    describe('source isolation and independence', () => {
        it('should maintain independence between different sources', async () => {
            // Publish from cfn-lint
            await coordinator.publishDiagnostics('cfn-lint', testUri, [
                createDiagnostic(0, 0, 'CFN Error 1'),
                createDiagnostic(1, 0, 'CFN Error 2'),
            ]);

            // Publish from guard
            await coordinator.publishDiagnostics('guard', testUri, [createDiagnostic(2, 0, 'Guard Error 1')]);

            // Update cfn-lint diagnostics
            await coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'Updated CFN Error')]);

            const diagnostics = coordinator.getDiagnostics(testUri);

            // Should have updated CFN diagnostic and unchanged Guard diagnostic
            expect(diagnostics).toHaveLength(2);
            expect(diagnostics[0].message).toBe('Updated CFN Error');
            expect(diagnostics[1].message).toBe('Guard Error 1');
        });

        it('should isolate diagnostics between different documents', async () => {
            // Publish diagnostics for first document
            await coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'Error in doc 1')]);

            // Publish diagnostics for second document
            await coordinator.publishDiagnostics('cfn-lint', testUri2, [createDiagnostic(0, 0, 'Error in doc 2')]);

            // Verify isolation
            expect(coordinator.getDiagnostics(testUri)).toHaveLength(1);
            expect(coordinator.getDiagnostics(testUri2)).toHaveLength(1);
            expect(coordinator.getDiagnostics(testUri)[0].message).toBe('Error in doc 1');
            expect(coordinator.getDiagnostics(testUri2)[0].message).toBe('Error in doc 2');

            // Clear diagnostics from first document
            await coordinator.clearDiagnosticsForUri(testUri);

            // Second document should be unaffected
            expect(coordinator.getDiagnostics(testUri)).toHaveLength(0);
            expect(coordinator.getDiagnostics(testUri2)).toHaveLength(1);
        });

        it('should handle source failures independently', async () => {
            // Set up diagnostics from multiple sources
            await coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'CFN Error')]);
            await coordinator.publishDiagnostics('guard', testUri, [createDiagnostic(1, 0, 'Guard Error')]);

            // Mock LSP failure for one operation
            mockPublishDiagnostics.mockRejectedValueOnce(new Error('LSP failed'));

            // Try to update cfn-lint (should fail)
            await expect(
                coordinator.publishDiagnostics('cfn-lint', testUri, [createDiagnostic(0, 0, 'Updated CFN Error')]),
            ).rejects.toThrow('LSP failed');

            // Guard diagnostics should still be accessible
            const sources = coordinator.getSources(testUri);
            expect(sources).toContain('guard');

            // Reset mock and verify guard can still publish
            mockPublishDiagnostics.mockResolvedValue(undefined);
            await coordinator.publishDiagnostics('guard', testUri, [createDiagnostic(1, 0, 'Updated Guard Error')]);

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: expect.arrayContaining([expect.objectContaining({ message: 'Updated Guard Error' })]),
            });
        });
    });

    describe('error handling scenarios', () => {
        it('should handle malformed diagnostic objects gracefully', async () => {
            const malformedDiagnostic = {
                range: Range.create(Position.create(0, 0), Position.create(0, 10)),
                message: 'Test error',
                // Missing severity, source, etc.
            } as Diagnostic;

            // Should not throw
            await expect(coordinator.publishDiagnostics('test', testUri, [malformedDiagnostic])).resolves.not.toThrow();

            const diagnostics = coordinator.getDiagnostics(testUri);
            expect(diagnostics).toHaveLength(1);
            expect(diagnostics[0].message).toBe('Test error');
        });

        it('should handle very large diagnostic arrays', async () => {
            const largeDiagnosticArray = Array.from({ length: 1000 }, (_, i) => createDiagnostic(i, 0, `Error ${i}`));

            await expect(coordinator.publishDiagnostics('test', testUri, largeDiagnosticArray)).resolves.not.toThrow();

            const diagnostics = coordinator.getDiagnostics(testUri);
            expect(diagnostics).toHaveLength(1000);
        });

        it('should handle concurrent operations safely', async () => {
            const promises = [];

            // Simulate concurrent operations from different sources
            for (let i = 0; i < 10; i++) {
                promises.push(
                    coordinator.publishDiagnostics(`source-${i}`, testUri, [
                        createDiagnostic(i, 0, `Error from source ${i}`),
                    ]),
                );
            }

            await Promise.all(promises);

            const diagnostics = coordinator.getDiagnostics(testUri);
            expect(diagnostics).toHaveLength(10);

            const sources = coordinator.getSources(testUri);
            expect(sources).toHaveLength(10);
        });

        it('should handle empty source names', async () => {
            await expect(
                coordinator.publishDiagnostics('', testUri, [createDiagnostic(0, 0, 'Error')]),
            ).resolves.not.toThrow();

            expect(coordinator.getSources(testUri)).toContain('');
        });

        it('should handle special characters in URIs and source names', async () => {
            const specialUri = 'file:///test/file%20with%20spaces.yaml';
            const specialSource = 'source-with-special-chars!@#$%';

            await expect(
                coordinator.publishDiagnostics(specialSource, specialUri, [createDiagnostic(0, 0, 'Error')]),
            ).resolves.not.toThrow();

            expect(coordinator.getSources(specialUri)).toContain(specialSource);
        });
    });

    describe('handleClearCfnDiagnostic', () => {
        it('should clear diagnostic by ID', async () => {
            const diagnostic1 = { ...createDiagnostic(0, 0, 'Error 1'), data: 'id-1' };
            const diagnostic2 = { ...createDiagnostic(1, 0, 'Error 2'), data: 'id-2' };

            await coordinator.publishDiagnostics(CFN_VALIDATION_SOURCE, testUri, [diagnostic1, diagnostic2]);
            vi.clearAllMocks();

            await coordinator.handleClearCfnDiagnostic(testUri, 'id-1');

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: [diagnostic2],
            });
        });

        it('should handle non-existent URI gracefully', async () => {
            await coordinator.handleClearCfnDiagnostic('non-existent', 'id-1');
            expect(mockPublishDiagnostics).not.toHaveBeenCalled();
        });

        it('should handle non-existent diagnostic ID gracefully', async () => {
            const diagnostic = { ...createDiagnostic(0, 0, 'Error'), data: 'id-1' };
            await coordinator.publishDiagnostics(CFN_VALIDATION_SOURCE, testUri, [diagnostic]);
            vi.clearAllMocks();

            await coordinator.handleClearCfnDiagnostic(testUri, 'non-existent-id');

            expect(mockPublishDiagnostics).toHaveBeenCalledWith({
                uri: testUri,
                diagnostics: [diagnostic],
            });
        });
    });

    describe('getKeyRangeFromPath', () => {
        it('should return undefined when no syntax tree is found', () => {
            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');
            expect(result).toBeUndefined();
        });

        it('should return undefined when syntax tree manager returns undefined', () => {
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);
            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');
            expect(result).toBeUndefined();
        });

        it('should return undefined when getNodeByPath returns no node', () => {
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: undefined, fullyResolved: false });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');
            expect(result).toBeUndefined();
        });

        it('should return undefined when node is not a pair node', () => {
            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(null);
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');
            expect(result).toBeUndefined();
        });

        it('should return undefined when pair node has no key child', () => {
            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(null);
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');
            expect(result).toBeUndefined();
        });

        it('should return key range when valid pair node with key is found', () => {
            const mockKeyNode = stubInterface<SyntaxNode>();
            mockKeyNode.startPosition = { row: 5, column: 2 };
            mockKeyNode.endPosition = { row: 5, column: 10 };

            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(mockKeyNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket');

            expect(result).toEqual({
                start: { line: 5, character: 2 },
                end: { line: 5, character: 10 },
            });
            expect(mockNode.childForFieldName.calledWith('key')).toBe(true);
        });

        it('should handle path with leading slash', () => {
            const mockKeyNode = stubInterface<SyntaxNode>();
            mockKeyNode.startPosition = { row: 3, column: 4 };
            mockKeyNode.endPosition = { row: 3, column: 12 };

            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(mockKeyNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '/Resources/MyBucket/Properties');

            expect(mockSyntaxTree.getNodeByPath.calledWith(['Resources', 'MyBucket', 'Properties'])).toBe(true);
            expect(result).toEqual({
                start: { line: 3, character: 4 },
                end: { line: 3, character: 12 },
            });
        });

        it('should handle path without leading slash', () => {
            const mockKeyNode = stubInterface<SyntaxNode>();
            mockKeyNode.startPosition = { row: 1, column: 0 };
            mockKeyNode.endPosition = { row: 1, column: 8 };

            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(mockKeyNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, 'Parameters/BucketName');

            expect(mockSyntaxTree.getNodeByPath.calledWith(['Parameters', 'BucketName'])).toBe(true);
            expect(result).toEqual({
                start: { line: 1, character: 0 },
                end: { line: 1, character: 8 },
            });
        });

        it('should handle complex nested paths', () => {
            const mockKeyNode = stubInterface<SyntaxNode>();
            mockKeyNode.startPosition = { row: 10, column: 6 };
            mockKeyNode.endPosition = { row: 10, column: 20 };

            const mockNode = stubInterface<SyntaxNode>();
            mockNode.childForFieldName.returns(mockKeyNode);

            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: mockNode, fullyResolved: true });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(
                testUri,
                '/Resources/MyBucket/Properties/NotificationConfiguration/TopicConfigurations/0/Topic',
            );

            expect(
                mockSyntaxTree.getNodeByPath.calledWith([
                    'Resources',
                    'MyBucket',
                    'Properties',
                    'NotificationConfiguration',
                    'TopicConfigurations',
                    '0',
                    'Topic',
                ]),
            ).toBe(true);
            expect(result).toEqual({
                start: { line: 10, character: 6 },
                end: { line: 10, character: 20 },
            });
        });

        it('should handle empty path gracefully', () => {
            const mockSyntaxTree = stubInterface<SyntaxTree>();
            mockSyntaxTree.getNodeByPath.returns({ node: undefined, fullyResolved: false });
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const result = coordinator.getKeyRangeFromPath(testUri, '');

            expect(mockSyntaxTree.getNodeByPath.calledWith([''])).toBe(true);
            expect(result).toBeUndefined();
        });
    });
});
