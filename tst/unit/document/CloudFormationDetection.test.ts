import { describe, it, expect } from 'vitest';
import {
    isCloudFormationTemplate,
    isGitSyncDeploymentFile,
    detectCfnFileType,
} from '../../../src/document/CloudFormationDetection';
import { DocumentType, CloudFormationFileType } from '../../../src/document/Document';

describe('CloudFormationDetection', () => {
    describe('detectCfnFileType', () => {
        it('should detect CloudFormation template', () => {
            const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';

            const result = detectCfnFileType(content, DocumentType.YAML);

            expect(result).toBe(CloudFormationFileType.Template);
        });

        it('should detect GitSync deployment file', () => {
            const content = 'template-file-path: ./template.yaml\nparameters:\n  BucketName: test';

            const result = detectCfnFileType(content, DocumentType.YAML);

            expect(result).toBe(CloudFormationFileType.GitSyncDeployment);
        });

        it('should prioritize GitSync over Template detection', () => {
            const content = 'template-file-path: ./template.yaml\nResources:\n  Bucket:\n    Type: AWS::S3::Bucket';

            const result = detectCfnFileType(content, DocumentType.YAML);

            expect(result).toBe(CloudFormationFileType.GitSyncDeployment);
        });

        it('should return Unknown for regular files', () => {
            const content = 'name: my-app\nversion: 1.0.0';

            const result = detectCfnFileType(content, DocumentType.YAML);

            expect(result).toBe(CloudFormationFileType.Unknown);
        });

        it('should handle JSON CloudFormation templates', () => {
            const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';

            const result = detectCfnFileType(content, DocumentType.JSON);

            expect(result).toBe(CloudFormationFileType.Template);
        });

        it('should handle JSON GitSync deployment files', () => {
            const content = '{"templateFilePath": "./template.yaml", "parameters": {"BucketName": "test"}}';

            const result = detectCfnFileType(content, DocumentType.JSON);

            expect(result).toBe(CloudFormationFileType.GitSyncDeployment);
        });

        it('should handle empty content', () => {
            const result = detectCfnFileType('', DocumentType.YAML);

            expect(result).toBe(CloudFormationFileType.Unknown);
        });
    });

    describe('isCloudFormationTemplate', () => {
        describe('JSON templates', () => {
            it('should detect template with Resources and Parameters', () => {
                const content = '{"Resources": {}, "Parameters": {}}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(true);
            });

            it('should detect template with AWSTemplateFormatVersion only', () => {
                const content = '{"AWSTemplateFormatVersion": "2010-09-09"}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(true);
            });

            it('should detect template with Transform only', () => {
                const content = '{"Transform": "AWS::Serverless-2016-10-31"}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(true);
            });

            it('should detect template with Resources only', () => {
                const content = '{"Resources": {"Bucket": {"Type": "AWS::S3::Bucket"}}}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(true);
            });

            it('should handle whitespace variations', () => {
                const content = '{ "Resources"   :   {}, "Parameters"  : {} }';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(true);
            });

            it('should reject non-CloudFormation JSON', () => {
                const content = '{"name": "package", "version": "1.0.0"}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(false);
            });

            it('should handle case sensitivity', () => {
                const content = '{"resources": {}, "parameters": {}}';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(false);
            });
        });

        describe('YAML templates', () => {
            it('should detect template with Resources and Parameters', () => {
                const content =
                    'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket\nParameters:\n  BucketName:\n    Type: String';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });

            it('should detect template with AWSTemplateFormatVersion only', () => {
                const content = 'AWSTemplateFormatVersion: "2010-09-09"';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });

            it('should detect template with Transform only', () => {
                const content = 'Transform: AWS::Serverless-2016-10-31';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });

            it('should handle indented keys', () => {
                const content =
                    '  Resources:\n    Bucket:\n      Type: AWS::S3::Bucket\n  Parameters:\n    BucketName:\n      Type: String';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });

            it('should handle whitespace variations', () => {
                const content =
                    'Resources   :\n  Bucket:\n    Type: AWS::S3::Bucket\nParameters  :\n  BucketName:\n    Type: String';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });

            it('should reject non-CloudFormation YAML', () => {
                const content = 'name: my-app\nversion: 1.0.0\ndescription: A sample app';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(false);
            });

            it('should handle incomplete content', () => {
                const content = 'Resources:';

                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(true);
            });
        });

        describe('edge cases', () => {
            it('should handle empty content', () => {
                expect(isCloudFormationTemplate('', DocumentType.JSON)).toBe(false);
                expect(isCloudFormationTemplate('', DocumentType.YAML)).toBe(false);
            });

            it('should handle whitespace-only content', () => {
                const content = '   \n\t  ';

                expect(isCloudFormationTemplate(content, DocumentType.JSON)).toBe(false);
                expect(isCloudFormationTemplate(content, DocumentType.YAML)).toBe(false);
            });

            it('should detect templates with multiple special keys', () => {
                const jsonContent =
                    '{"AWSTemplateFormatVersion": "2010-09-09", "Resources": {}, "Transform": "AWS::Serverless-2016-10-31"}';
                const yamlContent =
                    'AWSTemplateFormatVersion: "2010-09-09"\nResources:\nTransform: AWS::Serverless-2016-10-31';

                expect(isCloudFormationTemplate(jsonContent, DocumentType.JSON)).toBe(true);
                expect(isCloudFormationTemplate(yamlContent, DocumentType.YAML)).toBe(true);
            });
        });
    });

    describe('isGitSyncDeploymentFile', () => {
        describe('YAML deployment files', () => {
            it('should detect file with template-file-path', () => {
                const content = 'template-file-path: ./template.yaml\nparameters:\n  BucketName: test';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(true);
            });

            it('should detect file with templateFilePath', () => {
                const content = 'templateFilePath: ./template.yaml\nparameters:\n  BucketName: test';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(true);
            });

            it('should detect file with templatePath', () => {
                const content = 'templatePath: ./template.yaml\nparameters:\n  BucketName: test';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(true);
            });

            it('should handle indented keys', () => {
                const content = '  template-file-path: ./template.yaml\n  parameters:\n    BucketName: test';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(true);
            });
        });

        describe('JSON deployment files', () => {
            it('should detect file with template-file-path', () => {
                const content = '{"template-file-path": "./template.yaml", "parameters": {"BucketName": "test"}}';

                expect(isGitSyncDeploymentFile(content, DocumentType.JSON)).toBe(true);
            });

            it('should detect file with templateFilePath', () => {
                const content = '{"templateFilePath": "./template.yaml", "parameters": {"BucketName": "test"}}';

                expect(isGitSyncDeploymentFile(content, DocumentType.JSON)).toBe(true);
            });

            it('should detect file with templatePath', () => {
                const content = '{"templatePath": "./template.yaml", "parameters": {"BucketName": "test"}}';

                expect(isGitSyncDeploymentFile(content, DocumentType.JSON)).toBe(true);
            });

            it('should handle whitespace variations', () => {
                const content = '{ "template-file-path"  :  "./template.yaml" }';

                expect(isGitSyncDeploymentFile(content, DocumentType.JSON)).toBe(true);
            });
        });

        describe('non-deployment files', () => {
            it('should reject regular YAML files', () => {
                const content = 'name: my-app\nversion: 1.0.0';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(false);
            });

            it('should reject regular JSON files', () => {
                const content = '{"name": "my-app", "version": "1.0.0"}';

                expect(isGitSyncDeploymentFile(content, DocumentType.JSON)).toBe(false);
            });

            it('should reject CloudFormation templates', () => {
                const content = 'Resources:\n  Bucket:\n    Type: AWS::S3::Bucket';

                expect(isGitSyncDeploymentFile(content, DocumentType.YAML)).toBe(false);
            });

            it('should handle empty content', () => {
                expect(isGitSyncDeploymentFile('', DocumentType.JSON)).toBe(false);
                expect(isGitSyncDeploymentFile('', DocumentType.YAML)).toBe(false);
            });
        });
    });
});
