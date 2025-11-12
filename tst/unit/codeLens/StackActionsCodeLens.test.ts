import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getStackActionsCodeLenses } from '../../../src/codeLens/StackActionsCodeLens';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { Document } from '../../../src/document/Document';
import { createMockSyntaxTreeManager } from '../../utils/MockServerComponents';

vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('StackActionsCodeLens', () => {
    let mockSyntaxTreeManager: ReturnType<typeof createMockSyntaxTreeManager>;
    let mockGetEntityMap: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSyntaxTreeManager = createMockSyntaxTreeManager();
        mockGetEntityMap = vi.mocked(getEntityMap);
    });

    it('should return empty array when syntax tree is not found', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toEqual([]);
    });

    it('should return empty array when Resources section is not found', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(undefined);

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'AWSTemplateFormatVersion: "2010-09-09"'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toEqual([]);
    });

    it('should return empty array when Resources section is empty', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map());

        const document = new Document(TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources: {}'));

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toEqual([]);
    });

    it('should return empty array for non-template files', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'some: random\nyaml: content'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toEqual([]);
    });

    it('should return two code lenses for valid CFN template with Resources', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toHaveLength(2);
        expect(result[0].command?.title).toBe('Validate Deployment');
        expect(result[0].command?.command).toBe('aws.cloudformation.api.validateDeployment');
        expect(result[0].command?.arguments).toEqual(['file:///test.yaml']);
        expect(result[1].command?.title).toBe('Deploy Template');
        expect(result[1].command?.command).toBe('aws.cloudformation.api.deployTemplate');
        expect(result[1].command?.arguments).toEqual(['file:///test.yaml']);
    });

    it('should place code lens on line 0 for simple template', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result[0].range.start.line).toBe(0);
        expect(result[0].range.end.line).toBe(0);
    });

    it('should skip empty lines and place code lens on first non-empty line', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create('file:///test.yaml', 'yaml', 1, '\n\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket'),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result[0].range.start.line).toBe(2);
    });

    it('should skip comment lines and place code lens on first non-comment line', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                '# This is a comment\n# Another comment\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result[0].range.start.line).toBe(2);
    });

    it('should skip empty and comment lines together', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                '\n# Comment\n\n# Another comment\n\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result[0].range.start.line).toBe(5);
    });

    it('should handle template with AWSTemplateFormatVersion', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                'AWSTemplateFormatVersion: "2010-09-09"\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toHaveLength(2);
        expect(result[0].range.start.line).toBe(0);
    });

    it('should handle template with Transform', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Function', {}]]));

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                'Transform: AWS::Serverless-2016-10-31\nResources:\n  Function:\n    Type: AWS::Serverless::Function',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toHaveLength(2);
    });

    it('should handle JSON template', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create('file:///test.json', 'json', 1, '{"Resources":{"Bucket":{"Type":"AWS::S3::Bucket"}}}'),
        );

        const result = getStackActionsCodeLenses('file:///test.json', document, mockSyntaxTreeManager);

        expect(result).toHaveLength(2);
    });

    it('should handle template with multiple resources', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(
            new Map([
                ['Bucket', {}],
                ['Table', {}],
                ['Function', {}],
            ]),
        );

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\n  Table:\n    Type: AWS::DynamoDB::Table',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result).toHaveLength(2);
    });

    it('should handle whitespace-only lines correctly', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({ rootNode: {} } as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', {}]]));

        const document = new Document(
            TextDocument.create(
                'file:///test.yaml',
                'yaml',
                1,
                '   \n\t\n  \nResources:\n  Bucket:\n    Type: AWS::S3::Bucket',
            ),
        );

        const result = getStackActionsCodeLenses('file:///test.yaml', document, mockSyntaxTreeManager);

        expect(result[0].range.start.line).toBe(3);
    });
});
