import { Point } from 'tree-sitter';
import { describe, it, expect, beforeEach, afterEach, vi, Mocked } from 'vitest';
import { JsonSyntaxTree } from '../../../../src/context/syntaxtree/JsonSyntaxTree';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { YamlSyntaxTree } from '../../../../src/context/syntaxtree/YamlSyntaxTree';
import { DocumentType, CloudFormationFileType } from '../../../../src/document/Document';
import { point } from '../../../utils/TemplateUtils';

let mockJsonTree: Mocked<JsonSyntaxTree>;
let mockYamlTree: Mocked<YamlSyntaxTree>;

vi.mock('../../../../src/context/syntaxtree/SyntaxTreeFactory', () => ({
    syntaxTreeFactory: {
        createSyntaxTree: vi.fn((content: string, documentType: DocumentType) => {
            if (documentType === DocumentType.JSON) {
                return mockJsonTree;
            }
            return mockYamlTree;
        }),
    },
}));

describe('SyntaxTreeManager', () => {
    let syntaxTreeManager: SyntaxTreeManager;
    const testUri1 = 'file:///test1.yaml';
    const testUri2 = 'file:///test2.json';
    const testUri3 = 'file:///test3.template';

    beforeEach(async () => {
        vi.clearAllMocks();
        mockJsonTree = {
            type: DocumentType.JSON,
            update: vi.fn(),
            cleanup: vi.fn(),
        } as any;
        mockYamlTree = {
            type: DocumentType.YAML,
            update: vi.fn(),
            cleanup: vi.fn(),
        } as any;

        const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');
        vi.mocked(syntaxTreeFactory.createSyntaxTree).mockImplementation(
            (content: string, documentType: DocumentType) => {
                if (documentType === DocumentType.JSON) {
                    return mockJsonTree;
                }
                return mockYamlTree;
            },
        );

        syntaxTreeManager = new SyntaxTreeManager();
    });

    afterEach(() => {
        syntaxTreeManager.deleteAllTrees();
    });

    describe('add', () => {
        it('should create JSON syntax tree for .json file extension', async () => {
            const content = '{"key": "value"}';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.add(testUri2, content);

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledWith(content, DocumentType.JSON);
            expect(syntaxTreeManager.getSyntaxTree(testUri2)).toBe(mockJsonTree);
        });

        it('should create JSON syntax tree for content starting with {', async () => {
            const content = '{"Resources": {}}';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.add(testUri3, content);

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledWith(content, DocumentType.JSON);
            expect(syntaxTreeManager.getSyntaxTree(testUri3)).toBe(mockJsonTree);
        });

        it('should create JSON syntax tree for content starting with [', async () => {
            const content = '[{"key": "value"}]';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.add(testUri3, content);

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledWith(content, DocumentType.JSON);
            expect(syntaxTreeManager.getSyntaxTree(testUri3)).toBe(mockJsonTree);
        });

        it('should create YAML syntax tree for .yaml file extension', async () => {
            const content = 'key: value';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.add(testUri1, content);

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledWith(content, DocumentType.YAML);
            expect(syntaxTreeManager.getSyntaxTree(testUri1)).toBe(mockYamlTree);
        });
    });

    describe('getSyntaxTree', () => {
        it('should return the syntax tree for an existing URI', () => {
            syntaxTreeManager.add(testUri1, 'key: value');

            const result = syntaxTreeManager.getSyntaxTree(testUri1);

            expect(result).toBe(mockYamlTree);
        });

        it('should return undefined for a non-existent URI', () => {
            const result = syntaxTreeManager.getSyntaxTree('non-existent');

            expect(result).toBeUndefined();
        });
    });

    describe('deleteSyntaxTree', () => {
        it('should delete a syntax tree and return true if it existed', () => {
            syntaxTreeManager.add(testUri1, 'key: value');

            const result = syntaxTreeManager.deleteSyntaxTree(testUri1);

            expect(result).toBe(true);
            expect(mockYamlTree.cleanup).toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(testUri1)).toBeUndefined();
        });

        it('should return false if no syntax tree existed for the URI', () => {
            const result = syntaxTreeManager.deleteSyntaxTree('non-existent');

            expect(result).toBe(false);
        });

        it('should not call cleanup if tree does not exist', () => {
            syntaxTreeManager.deleteSyntaxTree('non-existent');

            expect(mockYamlTree.cleanup).not.toHaveBeenCalled();
            expect(mockJsonTree.cleanup).not.toHaveBeenCalled();
        });
    });

    describe('updateSyntaxTree', () => {
        it('should call update on existing syntax tree', () => {
            const newText = 'NewBucket';
            const startPoint: Point = point(2, 2);
            const endPoint: Point = point(2, 10);

            syntaxTreeManager.add(testUri1, 'key: value');
            syntaxTreeManager.updateSyntaxTree(testUri1, newText, startPoint, endPoint);

            expect(mockYamlTree.update).toHaveBeenCalledWith(newText, startPoint, endPoint);
        });

        it('should not throw when no syntax tree exists', () => {
            const text = 'new text';
            const startPoint: Point = point(0, 0);
            const endPoint: Point = point(0, 5);

            expect(() => {
                syntaxTreeManager.updateSyntaxTree('non-existent', text, startPoint, endPoint);
            }).not.toThrow();
        });

        it('should not call update when syntax tree does not exist', () => {
            const text = 'new text';
            const startPoint: Point = point(0, 0);
            const endPoint: Point = point(0, 5);

            syntaxTreeManager.updateSyntaxTree('non-existent', text, startPoint, endPoint);

            expect(mockYamlTree.update).not.toHaveBeenCalled();
            expect(mockJsonTree.update).not.toHaveBeenCalled();
        });
    });

    describe('deleteAllTrees', () => {
        it('should cleanup and delete all syntax trees', () => {
            syntaxTreeManager.add(testUri1, 'key: value');
            syntaxTreeManager.add(testUri2, '{"key": "value"}');

            syntaxTreeManager.deleteAllTrees();

            expect(mockYamlTree.cleanup).toHaveBeenCalled();
            expect(mockJsonTree.cleanup).toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(testUri1)).toBeUndefined();
            expect(syntaxTreeManager.getSyntaxTree(testUri2)).toBeUndefined();
        });
    });

    describe('file extension detection', () => {
        it('should handle case-insensitive file extensions', async () => {
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.add('file:///test.JSON', '{"key": "value"}');
            syntaxTreeManager.add('file:///test.YAML', 'key: value');

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledTimes(2);
        });
    });

    describe('addWithTypes', () => {
        it('should create syntax tree for empty files', async () => {
            const uri = 'file:///empty.yaml';
            const content = '';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.addWithTypes(uri, content, DocumentType.YAML, CloudFormationFileType.Empty);

            expect(syntaxTreeFactory.createSyntaxTree).toHaveBeenCalledWith(content, DocumentType.YAML);
            expect(syntaxTreeManager.getSyntaxTree(uri)).toBe(mockYamlTree);
        });

        it('should not create syntax tree for other file types', async () => {
            const uri = 'file:///other.yaml';
            const content = 'name: my-app\nversion: 1.0.0';
            const { syntaxTreeFactory } = await import('../../../../src/context/syntaxtree/SyntaxTreeFactory');

            syntaxTreeManager.addWithTypes(uri, content, DocumentType.YAML, CloudFormationFileType.Other);

            expect(syntaxTreeFactory.createSyntaxTree).not.toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(uri)).toBeUndefined();
        });
    });
});
