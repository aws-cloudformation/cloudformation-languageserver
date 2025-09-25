import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FileContext } from '../../../src/context/FileContext';
import { FileContextManager } from '../../../src/context/FileContextManager';
import { DocumentType } from '../../../src/document/Document';
import { createMockDocumentManager, createMockComponents } from '../../utils/MockServerComponents';

// Mock the FileContext class
vi.mock('../../../src/context/FileContext', () => ({
    FileContext: vi.fn(),
}));

const MockedFileContext = vi.mocked(FileContext);

describe('FileContextManager', () => {
    let fileContextManager: FileContextManager;
    let mockDocumentManager: ReturnType<typeof createMockDocumentManager>;
    const testUri = 'file:///test.yaml';

    beforeEach(() => {
        vi.clearAllMocks();
        mockDocumentManager = createMockDocumentManager();
        fileContextManager = new FileContextManager(mockDocumentManager);
    });

    describe('Constructor', () => {
        it('should initialize with DocumentManager', () => {
            expect(fileContextManager).toBeInstanceOf(FileContextManager);
        });
    });

    describe('getFileContext', () => {
        it('should return FileContext for valid CloudFormation template', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };
            const mockFileContext = {} as FileContext;

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => mockFileContext);

            const result = fileContextManager.getFileContext(testUri);

            expect(mockDocumentManager.get.calledWith(testUri)).toBe(true);
            expect(mockDocumentManager.isTemplate.calledWith(testUri)).toBe(true);
            expect(MockedFileContext).toHaveBeenCalledWith(
                testUri,
                DocumentType.YAML,
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
            );
            expect(result).toBe(mockFileContext);
        });

        it('should return FileContext for JSON CloudFormation template', () => {
            const mockDocument = {
                documentType: DocumentType.JSON,
                contents: vi.fn().mockReturnValue('{"Resources": {"MyBucket": {"Type": "AWS::S3::Bucket"}}}'),
            };
            const mockFileContext = {} as FileContext;

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => mockFileContext);

            const result = fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).toHaveBeenCalledWith(
                testUri,
                DocumentType.JSON,
                '{"Resources": {"MyBucket": {"Type": "AWS::S3::Bucket"}}}',
            );
            expect(result).toBe(mockFileContext);
        });

        it('should return undefined when document is not found', () => {
            mockDocumentManager.get.returns(undefined);

            const result = fileContextManager.getFileContext(testUri);

            expect(mockDocumentManager.get.calledWith(testUri)).toBe(true);
            expect(mockDocumentManager.isTemplate.called).toBe(false);
            expect(MockedFileContext).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when document is not a CloudFormation template', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('some: yaml\ncontent: here'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(false);

            const result = fileContextManager.getFileContext(testUri);

            expect(mockDocumentManager.get.calledWith(testUri)).toBe(true);
            expect(mockDocumentManager.isTemplate.calledWith(testUri)).toBe(true);
            expect(MockedFileContext).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        it('should return undefined when FileContext constructor throws error', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => {
                throw new Error('FileContext creation failed');
            });

            const result = fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).toHaveBeenCalledWith(
                testUri,
                DocumentType.YAML,
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
            );
            expect(result).toBeUndefined();
        });

        it('should handle different document types correctly', () => {
            const yamlDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };
            const jsonDocument = {
                documentType: DocumentType.JSON,
                contents: vi.fn().mockReturnValue('{"Resources": {"MyBucket": {"Type": "AWS::S3::Bucket"}}}'),
            };

            // Test YAML document
            mockDocumentManager.get.returns(yamlDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            fileContextManager.getFileContext('file:///test.yaml');

            expect(MockedFileContext).toHaveBeenCalledWith(
                'file:///test.yaml',
                DocumentType.YAML,
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
            );

            // Reset mocks
            vi.clearAllMocks();

            // Test JSON document
            mockDocumentManager.get.returns(jsonDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            fileContextManager.getFileContext('file:///test.json');

            expect(MockedFileContext).toHaveBeenCalledWith(
                'file:///test.json',
                DocumentType.JSON,
                '{"Resources": {"MyBucket": {"Type": "AWS::S3::Bucket"}}}',
            );
        });

        it('should handle empty document contents', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue(''),
            };
            const mockFileContext = {} as FileContext;

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => mockFileContext);

            const result = fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).toHaveBeenCalledWith(testUri, DocumentType.YAML, '');
            expect(result).toBe(mockFileContext);
        });

        it('should handle complex CloudFormation templates', () => {
            const complexTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Complex CloudFormation template'
Parameters:
  InstanceType:
    Type: String
    Default: t2.micro
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub '\${AWS::StackName}-bucket'
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
Outputs:
  BucketName:
    Value: !Ref MyBucket`;

            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue(complexTemplate),
            };
            const mockFileContext = {} as FileContext;

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => mockFileContext);

            const result = fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).toHaveBeenCalledWith(testUri, DocumentType.YAML, complexTemplate);
            expect(result).toBe(mockFileContext);
        });
    });

    describe('Static Factory Method', () => {
        it('should create FileContextManager with ServerComponents', () => {
            const mockComponents = createMockComponents();

            const manager = FileContextManager.create(mockComponents);

            expect(manager).toBeInstanceOf(FileContextManager);
        });

        it('should use DocumentManager from ServerComponents', () => {
            const mockComponents = createMockComponents();
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };

            mockComponents.documentManager.get.returns(mockDocument as any);
            mockComponents.documentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            const manager = FileContextManager.create(mockComponents);
            const result = manager.getFileContext(testUri);

            expect(mockComponents.documentManager.get.calledWith(testUri)).toBe(true);
            expect(mockComponents.documentManager.isTemplate.calledWith(testUri)).toBe(true);
            expect(result).toBeDefined();
        });
    });

    describe('Error Handling and Edge Cases', () => {
        it('should handle null document gracefully', () => {
            mockDocumentManager.get.returns(null as any);

            const result = fileContextManager.getFileContext(testUri);

            expect(result).toBeUndefined();
        });

        it('should handle document with undefined contents', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue(undefined),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            const result = fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).toHaveBeenCalledWith(testUri, DocumentType.YAML, undefined);
            expect(result).toBeDefined();
        });

        it('should handle DocumentManager throwing errors', () => {
            mockDocumentManager.get.throws(new Error('DocumentManager error'));

            expect(() => fileContextManager.getFileContext(testUri)).toThrow('DocumentManager error');
        });

        it('should handle isTemplate throwing errors', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.throws(new Error('isTemplate error'));

            expect(() => fileContextManager.getFileContext(testUri)).toThrow('isTemplate error');
        });

        it('should handle various URI formats', () => {
            const uris = [
                'file:///path/to/template.yaml',
                'file:///path/to/template.yml',
                'file:///path/to/template.json',
                'file:///C:/Windows/path/template.yaml',
                'file:///home/user/template.yaml',
            ];

            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            for (const uri of uris) {
                const result = fileContextManager.getFileContext(uri);
                expect(result).toBeDefined();
                expect(MockedFileContext).toHaveBeenCalledWith(
                    uri,
                    DocumentType.YAML,
                    'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                );
            }
        });

        it('should handle malformed CloudFormation templates', () => {
            const malformedTemplate = `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: [unclosed array`;

            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue(malformedTemplate),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => {
                throw new Error('Malformed template');
            });

            const result = fileContextManager.getFileContext(testUri);

            expect(result).toBeUndefined();
        });
    });

    describe('Integration with DocumentManager', () => {
        it('should call DocumentManager methods in correct order', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(true);
            MockedFileContext.mockImplementation(() => ({}) as FileContext);

            fileContextManager.getFileContext(testUri);

            // Verify the order of calls
            expect(mockDocumentManager.get.calledBefore(mockDocumentManager.isTemplate)).toBe(true);
        });

        it('should not call isTemplate if document is not found', () => {
            mockDocumentManager.get.returns(undefined);

            fileContextManager.getFileContext(testUri);

            expect(mockDocumentManager.get.calledWith(testUri)).toBe(true);
            expect(mockDocumentManager.isTemplate.called).toBe(false);
        });

        it('should not create FileContext if document is not a template', () => {
            const mockDocument = {
                documentType: DocumentType.YAML,
                contents: vi.fn().mockReturnValue('some: yaml\ncontent: here'),
            };

            mockDocumentManager.get.returns(mockDocument as any);
            mockDocumentManager.isTemplate.returns(false);

            fileContextManager.getFileContext(testUri);

            expect(MockedFileContext).not.toHaveBeenCalled();
        });
    });
});
