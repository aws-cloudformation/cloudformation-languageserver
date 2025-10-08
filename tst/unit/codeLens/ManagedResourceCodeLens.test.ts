import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ManagedResourceCodeLens } from '../../../src/codeLens/ManagedResourceCodeLens';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { createMockSyntaxTreeManager } from '../../utils/MockServerComponents';

// Mock the SectionContextBuilder module
vi.mock('../../../src/context/SectionContextBuilder', () => ({
    getEntityMap: vi.fn(),
}));

describe('ManagedResourceCodeLens', () => {
    let mockSyntaxTreeManager: ReturnType<typeof createMockSyntaxTreeManager>;
    let codeLens: ManagedResourceCodeLens;
    let mockGetEntityMap: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockSyntaxTreeManager = createMockSyntaxTreeManager();
        codeLens = new ManagedResourceCodeLens(mockSyntaxTreeManager);
        mockGetEntityMap = vi.mocked(getEntityMap);
    });

    it('should return empty array when syntax tree is not found', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({} as any);

        const document = TextDocument.create(
            'file:///test.yaml',
            'yaml',
            1,
            'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket',
        );
        const result = codeLens.getCodeLenses('file:///test.yaml', document);

        expect(result).toEqual([]);
    });

    it('should return empty array when no resources found', () => {
        mockSyntaxTreeManager.getSyntaxTree.returns({} as any);
        mockGetEntityMap.mockReturnValue(undefined);

        const document = TextDocument.create('file:///test.yaml', 'yaml', 1, 'AWSTemplateFormatVersion: "2010-09-09"');
        const result = codeLens.getCodeLenses('file:///test.yaml', document);

        expect(result).toEqual([]);
    });

    it('should return code lens for managed resource with boolean ManagedByStack', () => {
        const yamlContent = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: test-stack
      PrimaryIdentifier: bucket-id`;

        const document = TextDocument.create('file:///test.yaml', 'yaml', 1, yamlContent);

        const mockResourceContext = {
            entity: {
                Metadata: {
                    ManagedByStack: true,
                    StackName: 'test-stack',
                    PrimaryIdentifier: 'bucket-id',
                },
            },
            startPosition: { row: 1 },
            endPosition: { row: 6 },
        };

        mockSyntaxTreeManager.getSyntaxTree.returns({} as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', mockResourceContext]]));

        const result = codeLens.getCodeLenses('file:///test.yaml', document);

        expect(result).toHaveLength(1);
        expect(result[0].command?.title).toBe('Open Stack Template');
        expect(result[0].command?.command).toBe('aws.cloudformation.api.openStackTemplate');
        expect(result[0].command?.arguments).toEqual(['test-stack', 'bucket-id']);
    });

    it('should not return code lens for resource with string ManagedByStack', () => {
        const yamlContent = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: "true"
      StackName: test-stack
      PrimaryIdentifier: bucket-id`;

        const document = TextDocument.create('file:///test.yaml', 'yaml', 1, yamlContent);

        const mockResourceContext = {
            entity: {
                Metadata: {
                    ManagedByStack: 'true', // string instead of boolean
                    StackName: 'test-stack',
                    PrimaryIdentifier: 'bucket-id',
                },
            },
            startPosition: { row: 1 },
            endPosition: { row: 6 },
        };

        mockSyntaxTreeManager.getSyntaxTree.returns({} as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', mockResourceContext]]));

        const result = codeLens.getCodeLenses('file:///test.yaml', document);

        expect(result).toEqual([]);
    });

    it('should not return code lens when missing required metadata fields', () => {
        const yamlContent = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: test-stack`;

        const document = TextDocument.create('file:///test.yaml', 'yaml', 1, yamlContent);

        const mockResourceContext = {
            entity: {
                Metadata: {
                    ManagedByStack: true,
                    StackName: 'test-stack',
                    // Missing PrimaryIdentifier
                },
            },
            startPosition: { row: 1 },
            endPosition: { row: 5 },
        };

        mockSyntaxTreeManager.getSyntaxTree.returns({} as any);
        mockGetEntityMap.mockReturnValue(new Map([['Bucket', mockResourceContext]]));

        const result = codeLens.getCodeLenses('file:///test.yaml', document);

        expect(result).toEqual([]);
    });
});
