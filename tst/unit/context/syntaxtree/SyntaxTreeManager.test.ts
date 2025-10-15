import { Point } from 'tree-sitter';
import { describe, it, expect, beforeEach, afterEach, vi, Mocked, MockedClass } from 'vitest';
import { JsonSyntaxTree } from '../../../../src/context/syntaxtree/JsonSyntaxTree';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { YamlSyntaxTree } from '../../../../src/context/syntaxtree/YamlSyntaxTree';
import { DocumentType } from '../../../../src/document/Document';
import { point } from '../../../utils/TemplateUtils';

vi.mock('../../../../src/context/syntaxtree/JsonSyntaxTree');
vi.mock('../../../../src/context/syntaxtree/YamlSyntaxTree');

describe('SyntaxTreeManager', () => {
    let syntaxTreeManager: SyntaxTreeManager;
    const testUri1 = 'file:///test1.yaml';
    const testUri2 = 'file:///test2.json';
    const testUri3 = 'file:///test3.template';
    const MockedJsonSyntaxTree = JsonSyntaxTree as MockedClass<typeof JsonSyntaxTree>;
    const MockedYamlSyntaxTree = YamlSyntaxTree as MockedClass<typeof YamlSyntaxTree>;

    // Mock syntax tree instances
    let mockJsonTree: Mocked<JsonSyntaxTree>;
    let mockYamlTree: Mocked<YamlSyntaxTree>;

    beforeEach(() => {
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

        MockedJsonSyntaxTree.mockImplementation(() => mockJsonTree);
        MockedYamlSyntaxTree.mockImplementation(() => mockYamlTree);

        syntaxTreeManager = new SyntaxTreeManager();
    });

    afterEach(() => {
        syntaxTreeManager.deleteAllTrees();
    });

    describe('add', () => {
        it('should create JSON syntax tree for .json file extension', () => {
            const content = '{"key": "value"}';

            syntaxTreeManager.add(testUri2, content);

            expect(MockedJsonSyntaxTree).toHaveBeenCalledWith(content);
            expect(MockedYamlSyntaxTree).not.toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(testUri2)).toBe(mockJsonTree);
        });

        it('should create JSON syntax tree for content starting with {', () => {
            const content = '{"Resources": {}}';

            syntaxTreeManager.add(testUri3, content);

            expect(MockedJsonSyntaxTree).toHaveBeenCalledWith(content);
            expect(MockedYamlSyntaxTree).not.toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(testUri3)).toBe(mockJsonTree);
        });

        it('should create JSON syntax tree for content starting with [', () => {
            const content = '[{"key": "value"}]';

            syntaxTreeManager.add(testUri3, content);

            expect(MockedJsonSyntaxTree).toHaveBeenCalledWith(content);
            expect(MockedYamlSyntaxTree).not.toHaveBeenCalled();
            expect(syntaxTreeManager.getSyntaxTree(testUri3)).toBe(mockJsonTree);
        });

        it('should create YAML syntax tree for .yaml file extension', () => {
            const content = 'key: value';

            syntaxTreeManager.add(testUri1, content);

            expect(MockedYamlSyntaxTree).toHaveBeenCalledWith(content);
            expect(MockedJsonSyntaxTree).not.toHaveBeenCalled();
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
        it('should handle case-insensitive file extensions', () => {
            syntaxTreeManager.add('file:///test.JSON', '{"key": "value"}');
            syntaxTreeManager.add('file:///test.YAML', 'key: value');

            expect(MockedJsonSyntaxTree).toHaveBeenCalled();
            expect(MockedYamlSyntaxTree).toHaveBeenCalled();
        });
    });
});
