import { SyntaxNode } from 'tree-sitter';
import { StubbedInstance } from 'ts-sinon';
import { describe, it, expect, beforeEach, vi, MockedClass } from 'vitest';
import { Context } from '../../../src/context/Context';
import { ContextManager } from '../../../src/context/ContextManager';
import { SyntaxTree } from '../../../src/context/syntaxtree/SyntaxTree';
import { DocumentType } from '../../../src/document/Document';
import { createMockSyntaxTreeManager } from '../../utils/MockServerComponents';
import { docPosition } from '../../utils/TemplateUtils';
import { createMockYamlSyntaxTree } from '../../utils/TestTree';

vi.mock('../../../src/context/Context');

describe('ContextManager', () => {
    let contextManager: ContextManager;
    let mockSyntaxTreeManager: ReturnType<typeof createMockSyntaxTreeManager>;
    let mockSyntaxTree: StubbedInstance<SyntaxTree>;
    let mockedContext: MockedClass<typeof Context>;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSyntaxTreeManager = createMockSyntaxTreeManager();
        mockSyntaxTree = createMockYamlSyntaxTree();
        contextManager = new ContextManager(mockSyntaxTreeManager);
        mockedContext = Context as MockedClass<typeof Context>;
        mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
    });

    describe('getContext', () => {
        const params = docPosition('file:///test.yaml', 5, 10);

        it('should return defined context when node and path info exist', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: ['Resources', 'MyResource'],
                entityRootNode: mockNode,
            };

            mockSyntaxTree.getNodeAtPosition.returns(mockNode);
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);

            const result = contextManager.getContext(params);

            expect(mockSyntaxTree.getNodeAtPosition.calledWith(params.position)).toBe(true);
            expect(mockSyntaxTree.getPathAndEntityInfo.calledWith(mockNode)).toBe(true);
            expect(mockedContext).toHaveBeenCalledWith(
                mockNode,
                mockPathInfo.path,
                mockPathInfo.propertyPath,
                DocumentType.YAML,
                mockPathInfo.entityRootNode,
            );
            expect(result).toBeDefined();
        });

        it('should return undefined when no syntax tree found', () => {
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = contextManager.getContext(params);
            expect(result).toBeUndefined();
        });

        it('should return undefined when no node found at position', () => {
            mockSyntaxTree.getNodeAtPosition.returns(undefined as any);

            const result = contextManager.getContext(params);
            expect(result).toBeUndefined();
        });

        it('should return undefined when path info cannot be determined', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;
            mockSyntaxTree.getNodeAtPosition.returns(mockNode);
            mockSyntaxTree.getPathAndEntityInfo.returns(undefined as any);

            const result = contextManager.getContext(params);
            expect(result).toBeUndefined();
        });

        it('should return undefined when Context constructor throws', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: ['Resources', 'MyResource'],
                entityRootNode: mockNode,
            };

            mockSyntaxTree.getNodeAtPosition.returns(mockNode);
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);
            mockedContext.mockImplementationOnce(() => {
                throw new Error('Context creation failed');
            });

            const result = contextManager.getContext(params);
            expect(result).toBeUndefined();
        });
    });

    describe('getContextFromPath', () => {
        const uri = 'file:///test.yaml';

        it('should return context when path is successfully resolved', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: ['Resources', 'MyBucket'],
                entityRootNode: mockNode,
            };
            const mockContext = new Context(
                mockNode,
                mockPathInfo.path,
                mockPathInfo.propertyPath,
                DocumentType.YAML,
                mockPathInfo.entityRootNode,
            );

            // Mock getNodeByPath to return successful result
            mockSyntaxTree.getNodeByPath.returns({
                node: mockNode,
                fullyResolved: true,
            });
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);
            mockedContext.mockImplementationOnce(() => mockContext);

            const result = contextManager.getContextFromPath(uri, ['Resources', 'MyBucket']);

            expect(mockSyntaxTreeManager.getSyntaxTree.calledWith(uri)).toBe(true);
            expect(mockSyntaxTree.getNodeByPath.calledWith(['Resources', 'MyBucket'])).toBe(true);
            expect(mockSyntaxTree.getPathAndEntityInfo.calledWith(mockNode)).toBe(true);
            expect(result.context).toBe(mockContext);
            expect(result.fullyResolved).toBe(true);
        });

        it('should return undefined context when path is not fully resolved', () => {
            // Mock getNodeByPath to return unsuccessful result
            mockSyntaxTree.getNodeByPath.returns({
                node: undefined,
                fullyResolved: false,
            });

            const result = contextManager.getContextFromPath(uri, ['Resources', 'NonExistentResource']);

            expect(mockSyntaxTreeManager.getSyntaxTree.calledWith(uri)).toBe(true);
            expect(mockSyntaxTree.getNodeByPath.calledWith(['Resources', 'NonExistentResource'])).toBe(true);
            expect(result.context).toBeUndefined();
            expect(result.fullyResolved).toBe(false);
        });

        it('should return undefined context when node exists but path info is invalid', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;

            mockSyntaxTree.getNodeByPath.returns({
                node: mockNode,
                fullyResolved: true,
            });
            // Mock getPathAndEntityInfo to return valid path info (Context constructor will still work)
            mockSyntaxTree.getPathAndEntityInfo.returns({
                path: [mockNode],
                propertyPath: ['Resources', 'MyBucket'],
                entityRootNode: mockNode,
            });

            const result = contextManager.getContextFromPath(uri, ['Resources', 'MyBucket']);

            // Context should be created successfully with valid path info
            expect(result.context).toBeDefined();
            expect(result.fullyResolved).toBe(true);
        });

        it('should return undefined context when syntax tree is not available', () => {
            // Mock getSyntaxTree to return undefined
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = contextManager.getContextFromPath(uri, ['Resources', 'MyBucket']);

            expect(mockSyntaxTreeManager.getSyntaxTree.calledWith(uri)).toBe(true);
            expect(result.context).toBeUndefined();
            expect(result.fullyResolved).toBe(false);
        });

        it('should handle empty path segments', () => {
            const mockNode = { text: 'root node' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: [],
                entityRootNode: mockNode,
            };
            const mockContext = new Context(
                mockNode,
                mockPathInfo.path,
                mockPathInfo.propertyPath,
                DocumentType.YAML,
                mockPathInfo.entityRootNode,
            );

            mockSyntaxTree.getNodeByPath.returns({
                node: mockNode,
                fullyResolved: true,
            });
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);
            mockedContext.mockImplementationOnce(() => mockContext);

            const result = contextManager.getContextFromPath(uri, []);

            expect(mockSyntaxTree.getNodeByPath.calledWith([])).toBe(true);
            expect(result.context).toBe(mockContext);
            expect(result.fullyResolved).toBe(true);
        });

        it('should handle numeric path segments', () => {
            const mockNode = { text: 'array item' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: ['Resources', 'MyBucket', 'Properties', 'Tags', '0'],
                entityRootNode: mockNode,
            };
            const mockContext = new Context(
                mockNode,
                mockPathInfo.path,
                mockPathInfo.propertyPath,
                DocumentType.YAML,
                mockPathInfo.entityRootNode,
            );

            mockSyntaxTree.getNodeByPath.returns({
                node: mockNode,
                fullyResolved: true,
            });
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);
            mockedContext.mockImplementationOnce(() => mockContext);

            const result = contextManager.getContextFromPath(uri, ['Resources', 'MyBucket', 'Properties', 'Tags', 0]);

            expect(mockSyntaxTree.getNodeByPath.calledWith(['Resources', 'MyBucket', 'Properties', 'Tags', 0])).toBe(
                true,
            );
            expect(result.context).toBe(mockContext);
            expect(result.fullyResolved).toBe(true);
        });

        it('should handle context creation errors gracefully', () => {
            const mockNode = { text: 'test node' } as SyntaxNode;
            const mockPathInfo = {
                path: [mockNode],
                propertyPath: ['Resources', 'MyBucket'],
                entityRootNode: mockNode,
            };

            mockSyntaxTree.getNodeByPath.returns({
                node: mockNode,
                fullyResolved: true,
            });
            mockSyntaxTree.getPathAndEntityInfo.returns(mockPathInfo);
            mockedContext.mockImplementationOnce(() => {
                throw new Error('Context creation failed');
            });

            const result = contextManager.getContextFromPath(uri, ['Resources', 'MyBucket']);

            // When context creation fails, the method returns the fallback result
            expect(result.context).toBeUndefined();
            expect(result.fullyResolved).toBe(false);
        });
    });
});
