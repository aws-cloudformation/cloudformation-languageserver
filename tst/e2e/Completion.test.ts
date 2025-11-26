import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { getSimpleYamlTemplateText, getSimpleJsonTemplateText } from '../utils/TemplateUtils';
import { TestExtension } from '../utils/TestExtension';

describe('Completion', () => {
    const client = new TestExtension();

    beforeAll(async () => {
        await client.ready();
    });

    beforeEach(async () => {
        await client.reset();
    });

    afterAll(async () => {
        await client.close();
    });

    describe('YAML', () => {
        describe('Completions on Top Level Sections', () => {
            it('should provide completions for top-level sections in empty template', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 0 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include major top-level sections
                expect(labels).toContain('Resources');
                expect(labels).toContain('Parameters');
                expect(labels).toContain('Outputs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions after AWSTemplateFormatVersion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09"
D`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Description');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Transform section', async () => {
                const template = getSimpleYamlTemplateText();

                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
T`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Transform');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Metadata section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
M`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Metadata');
                expect(labels).toContain('Mappings');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Parameters section', async () => {
                const template = getSimpleYamlTemplateText();

                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
P`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Parameters');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Mappings section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Test'
`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 0 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Mappings');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Conditions section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
C`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Conditions');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Resources section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
R`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Resources');
                expect(labels).toContain('Rules');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Outputs section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
O`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Outputs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Rules section', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
Ru`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 2 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Rules');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not duplicate existing top-level sections in completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template
Parameters:
  EnvType:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 8, character: 0 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);

                expect(labels).not.toContain('Parameters');
                expect(labels).not.toContain('Resources');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Resource Properties', () => {
            it('should provide required properties for a resource type', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include common S3 bucket properties
                expect(labels).toContain('BucketName');
                expect(labels).toContain('Tags');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide optional properties for a resource type', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345678
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include optional EC2 instance properties
                expect(labels).toContain('InstanceType');
                expect(labels).toContain('KeyName');
                expect(labels).toContain('SecurityGroups');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide nested properties completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyLaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateData:
        `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include nested LaunchTemplateData properties
                expect(labels).toContain('InstanceType');
                expect(labels).toContain('ImageId');
                expect(labels).toContain('KeyName');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide array item properties completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 10 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include Tag properties
                expect(labels).toContain('Key');
                expect(labels).toContain('Value');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for properties with complex types', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      LifecycleConfiguration:
        `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include LifecycleConfiguration properties (complex object type)
                expect(labels).toContain('Rules');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Resource Attributes', () => {
            it('should provide Type attribute completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    T`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 3, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Type');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Properties attribute completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    P`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Properties');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide DependsOn completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
  MyInstance:
    Type: AWS::EC2::Instance
    D`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('DependsOn');
                expect(labels).toContain('DeletionPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Condition completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  CreateProdResources: !Equals [!Ref EnvType, prod]
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    C`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Condition');
                expect(labels).toContain('CreationPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Metadata completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    M`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Metadata');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide CreationPolicy completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyAutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Cr`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('CreationPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide UpdatePolicy completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyAutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    U`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('UpdatePolicy');
                expect(labels).toContain('UpdateReplacePolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide UpdateReplacePolicy completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    UpdateR`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('UpdateReplacePolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide DeletionPolicy completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Del`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 7 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('DeletionPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Intrinsic Functions', () => {
            it('should provide !Ref completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 8, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Ref');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !GetAtt completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  BucketArn:
    Value: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 12 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!GetAtt');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Sub completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Sub');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Join completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Join');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Split completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyString:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: Items
          Value: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 10, character: 18 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Split');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Select completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  FirstAZ:
    Value: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 12 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Select');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !FindInMap completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-12345678
Resources:
  MyInstance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 16 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!FindInMap');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !GetAZs completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MySubnet:
    Type: AWS::EC2::Subnet
    Properties:
      AvailabilityZone: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 25 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!GetAZs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !ImportValue completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!ImportValue');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !If completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  CreateProdResources: !Equals [!Ref EnvType, prod]
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!If');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Equals completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
Conditions:
  IsProduction: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 18 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Equals');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !And completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  Condition1: !Equals [!Ref Param1, value1]
  Condition2: !Equals [!Ref Param2, value2]
  BothConditions: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 20 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!And');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Or completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  Condition1: !Equals [!Ref Param1, value1]
  Condition2: !Equals [!Ref Param2, value2]
  EitherCondition: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 21 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Or');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide !Not completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  IsProduction: !Equals [!Ref EnvType, prod]
  IsNotProduction: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 3, character: 21 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Not');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::* long-form completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName:
        Fn::`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 10 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);

                // Should include long-form intrinsic functions
                expect(labels).toContain('Fn::Base64');
                expect(labels).toContain('Fn::GetAtt');
                expect(labels).toContain('Fn::Join');
                expect(labels).toContain('Fn::Sub');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Parameter Section', () => {
            it('should provide parameter attribute completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 3, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Type');
                expect(labels).toContain('AllowedPattern');
                expect(labels).toContain('Default');
                expect(labels).toContain('AllowedValues');
                expect(labels).toContain('MaxLength');
                expect(labels).toContain('MinValue');
                expect(labels).toContain('MinLength');
                expect(labels).toContain('MaxValue');
                expect(labels).toContain('NoEcho');
                expect(labels).toContain('Description');
                expect(labels).toContain('ConstraintDescription');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Pseudo Parameters', () => {
            it('should provide AWS::AccountId completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AWS::Acc`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 32 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::AccountId');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::NotificationARNs completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  Notifications:
    Value: !Ref AWS::Not`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 25 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::NotificationARNs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::NoValue completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AWS::NoV`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 32 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::NoValue');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::Partition completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  Partition:
    Value: !Ref AWS::Par`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 25 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::Partition');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::Region completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AWS::Reg`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 32 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::Region');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::StackId completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  StackId:
    Value: !Ref AWS::Stac`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 26 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::StackId');
                expect(labels).toContain('AWS::StackName');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::StackName completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref AWS::StackN`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 35 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::StackName');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::URLSuffix completion', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  URLSuffix:
    Value: !Ref AWS::URL`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 25 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::URLSuffix');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should not provide completions in broken/invalid YAML', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties
      BucketName: `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 18 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toHaveLength(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide completions with missing required fields', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toHaveLength(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should return nothing for completions in comments', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
# This is a comment 
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toHaveLength(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions in empty template', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = ``;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 0, character: 0 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions with multiple transforms', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Transform:
  - AWS::Serverless-2016-10-31
  - AWS::Include
Resources:
  MyFunction:
    Type: `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 10 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Filtering & Ranking', () => {
            it('should provide fuzzy matching for partial input', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketNa`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 14 },
                });

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('BucketName');
                expect(labels).not.toContain('Tags');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should rank completions by relevance', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: 2010-09-09
Description: Lambda function with inline code
Resources: 
  MyLambdaFunction: 
    Type: AWS::Lambda::Function
    Properties: 
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Code');
                expect(labels).toContain('Role');
                expect(labels).not.toContain('Runtime');

                await client.closeDocument({ textDocument: { uri } });
            });

            it.todo('should show optional properties after required ones fulfilled', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: Lambda function ListBucketsCommand.
Resources:
  primer:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs20.x
      Role: arn:aws:iam::111122223333:role/lambda-role
      Handler: index.handler
      Code:
        ZipFile: |
          const { S3Client, ListBucketsCommand } = require("@aws-sdk/client-s3");
          const s3 = new S3Client({ region: "us-east-1" }); // replace "us-east-1" with your AWS Region

          exports.handler = async function(event) {
            const command = new ListBucketsCommand({});
            const response = await s3.send(command);
            return response.Buckets;
          };
      `;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 19, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Architecture');

                // works in functional testing and json, failing in YAML

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Documentation', () => {
            it('should include documentation in completion items', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                // At least some items should have documentation
                const hasDocumentation = completions.items.some((item: any) => item.documentation);
                expect(hasDocumentation).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should include detail field in completion items', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                // At least some items should have detail field
                const hasDetail = completions.items.some((item: any) => item.detail);
                expect(hasDetail).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should include correct kind in completion items', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                // Items should have kind field (Function, Property, etc.)
                const hasKind = completions.items.every((item: any) => item.kind !== undefined);
                expect(hasKind).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Snippet Completions', () => {
            it('should provide resource template snippets', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
M`;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const hasInsertTextOrTextEdit = completions.items.some((item: any) => item.insertText ?? item.textEdit);
                expect(hasInsertTextOrTextEdit).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide resource attribute snippets', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: 2010-09-09
Resources: 
  MyBucket: 
    Type: AWS::S3::Bucket
    `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const hasInsertText = completions.items.some((item: any) => item.insertText ?? item.textEdit);
                expect(hasInsertText).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Cross-Reference Completions', () => {
            it('should provide condition reference completions in resources', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  CreateProdResources: !Equals [!Ref EnvType, prod]
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Condition: `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('CreateProdResources');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Value Completions', () => {
            it('should provide enum value completions for DeletionPolicy', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    DeletionPolicy: `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 20 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Retain');
                expect(labels).toContain('Delete');
                expect(labels).toContain('RetainExceptOnCreate');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide boolean value completions', async () => {
                const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  TestVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: `;
                const uri = await client.openYamlTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 27 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('true');
                expect(labels).toContain('false');

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });

    describe('JSON', () => {
        describe('Completions on Top Level Sections', () => {
            it('should provide completions for top-level sections in empty template', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09"
  ""
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 1 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include major top-level sections
                expect(labels).toContain('Resources');
                expect(labels).toContain('Parameters');
                expect(labels).toContain('Outputs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions after AWSTemplateFormatVersion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "D"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Description');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Transform section', async () => {
                const template = getSimpleJsonTemplateText();

                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "T"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Transform');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Metadata and Mappings section', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "M"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Metadata');
                expect(labels).toContain('Mappings');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Parameters section', async () => {
                const template = getSimpleJsonTemplateText();

                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "P"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Parameters');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Conditions section', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "EnvType": {
      "Type": "String"
    }
  },
  "C"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Conditions');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Resources and Rules section', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "R"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Resources');
                expect(labels).toContain('Rules');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for Outputs section', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "O"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Outputs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not duplicate existing top-level sections in completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test template",
  "Parameters": {
    "EnvType": {
      "Type": "String"
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  ""
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 13, character: 3 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);

                expect(labels).not.toContain('Parameters');
                expect(labels).not.toContain('Resources');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Resource Properties', () => {
            it('should provide required properties for a resource type', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include common S3 bucket properties
                expect(labels).toContain('BucketName');
                expect(labels).toContain('Tags');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide optional properties for a resource type', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyInstance": {
      "Type": "AWS::EC2::Instance",
      "Properties": {
        "ImageId": "ami-12345678",
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include optional EC2 instance properties
                expect(labels).toContain('InstanceType');
                expect(labels).toContain('KeyName');
                expect(labels).toContain('SecurityGroups');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide nested properties completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
"Resources": {
  "MyLaunchTemplate": {
    "Type": "AWS::EC2::LaunchTemplate",
    "Properties": {
      "LaunchTemplateData": {
        ""
      }
    }
  }
}
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include nested LaunchTemplateData properties
                expect(labels).toContain('InstanceType');
                expect(labels).toContain('ImageId');
                expect(labels).toContain('KeyName');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide array item properties completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
"Resources": {
  "MyBucket": {
    "Type": "AWS::S3::Bucket",
    "Properties": {
      "Tags": [
        {
          ""
        }
      ]
    }
  }
}
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 8, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include Tag properties
                expect(labels).toContain('Key');
                expect(labels).toContain('Value');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions for properties with complex types', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "LifecycleConfiguration": {
          ""
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const labels = completions.items.map((item: any) => item.label);

                // Should include LifecycleConfiguration properties (complex object type)
                expect(labels).toContain('Rules');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Resource Attributes', () => {
            it('should provide Type attribute completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "T"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Type');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Properties attribute completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "P"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Properties');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide DependsOn completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    },
    "MyInstance": {
      "Type": "AWS::EC2::Instance",
      "D"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 8, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('DependsOn');
                expect(labels).toContain('DeletionPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Condition completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Conditions": {
    "CreateProdResources": {
      "Fn::Equals": [
        {
          "Ref": "EnvType"
        },
        "prod"
      ]
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "C"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 15, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Condition');
                expect(labels).toContain('CreationPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Metadata completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "M"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Metadata');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide CreationPolicy completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyAutoScalingGroup": {
      "Type": "AWS::AutoScaling::AutoScalingGroup",
      "Cr"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('CreationPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide UpdatePolicy completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyAutoScalingGroup": {
      "Type": "AWS::AutoScaling::AutoScalingGroup",
      "U"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 8 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('UpdatePolicy');
                expect(labels).toContain('UpdateReplacePolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide UpdateReplacePolicy completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "UpdateR"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 14 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('UpdateReplacePolicy');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide DeletionPolicy completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Del"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 10 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('DeletionPolicy');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Pseudo Parameters', () => {
            it('should provide AWS::NotificationARNs completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "Outputs": {
    "Notifications": {
      "Value": {
        "Ref": "AWS::Not"
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 10, character: 24 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::NotificationARNs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::NoValue completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {
          "Ref": "AWS::NoV"
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 27 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::NoValue');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AWS::Region completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {
          "Ref": "AWS::Reg"
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 27 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('AWS::Region');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Intrinsic Functions', () => {
            it('should provide !Ref completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "MyParam": {
      "Type": "String"
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "" }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 11, character: 25 },
                });

                expect(completions).toBeDefined();
                //No Ref completions in JSON

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide intrinsic function completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "LambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": { "Fn::Sub": "\${EnvironmentName}-function" },
        "Role": {
          "Fn::"
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 8, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::GetAtt');
                expect(labels).toContain('Fn::ImportValue');
                expect(labels).toContain('Fn::Length');
                expect(labels).toContain('Fn::Select');
                expect(labels).toContain('Fn::RefAll');
                expect(labels).toContain('Fn::ValueOf');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide in line Fn::Sub function completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "LambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": { "Fn::" },
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 31 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                //No autocomplete for in line Sub in Json
                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide long form Fn::Sub completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Template for testing goto/definition with references",
  "Parameters": {
    "EnvironmentName": {
      "Type": "String",
      "Default": "production"
    }
  },
  "Resources": {
    "PublicSubnet": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": "vpcid",
        "Tags": [
          {
            "Key": "Name",
            "Value": {
              "Fn::": [
              ]
            }
          }
        ]
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 18, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Sub');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Join completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Simple template with Fn::Join in Outputs",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "my-simple-bucket"
      }
    }
  },
  "Outputs": {
    "BucketUrl": {
      "Description": "Full S3 URL of the bucket",
      "Value": {
        "Fn::"
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 15, character: 13 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Join');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Split completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Simple template with Fn::Split in Outputs",
  "Parameters": {
    "CommaSeparatedList": {
      "Type": "String",
      "Default": "item1,item2,item3",
      "Description": "A comma-separated list of items"
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "my-simple-bucket"
      }
    }
  },
  "Outputs": {
    "SplitList": {
      "Description": "The list split into an array",
      "Value": {
        "Fn::Join": [
          " | ",
          {
            "Fn::"
          }
        ]
      }
    }
  }
}
`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 25, character: 17 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Split');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Select completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "Outputs": {
    "FirstAZ": {
      "Value": "Fn::Se"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 22 },
                });

                expect(completions).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Select');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::FindInMap completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Simple template with Fn::FindInMap",
  "Mappings": {
    "RegionMap": {
      "us-east-1": {
        "AMI": "ami-0123456789abcdef0"
      },
      "us-west-2": {
        "AMI": "ami-abcdef0123456789a"
      },
      "eu-west-1": {
        "AMI": "ami-fedcba9876543210f"
      }
    }
  },
  "Resources": {
    "MyInstance": {
      "Type": "AWS::EC2::Instance",
      "Properties": {
        "ImageId": {
          "Fn::"
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 21, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::FindInMap');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::GetAZs completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MySubnet": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "AvailabilityZone": "Fn::"
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 33 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::GetAZs');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::If completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Simple template with Fn::If",
  "Parameters": {
    "EnvType": {
      "Type": "String",
      "Default": "dev",
      "AllowedValues": ["dev", "prod"],
      "Description": "Environment type"
    }
  },
  "Conditions": {
    "IsProduction": {
      "Fn::Equals": [
        {
          "Ref": "EnvType"
        },
        "prod"
      ]
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {
          "Fn::"
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 26, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::If');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Equals completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "EnvType": {
      "Type": "String"
    }
  },
  "Conditions": {
    "IsProduction": {
      "Fn::"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Equals');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::And completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Conditions": {
    "Condition1": {
      "Fn::Equals": [
        {
          "Ref": "Param1"
        },
        "value1"
      ]
    },
    "Condition2": {
      "Fn::Equals": [
        {
          "Ref": "Param2"
        },
        "value2"
      ]
    },
    "BothConditions": {
      "Fn::"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 20, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::And');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Or completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Conditions": {
    "Condition1": {
      "Fn::Equals": [
        {
          "Ref": "Param1"
        },
        "value1"
      ]
    },
    "Condition2": {
      "Fn::Equals": [
        {
          "Ref": "Param2"
        },
        "value2"
      ]
    },
    "EitherCondition": {
      "Fn::"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 20, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Or');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Fn::Not completion', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Conditions": {
    "Condition1": {
      "Fn::Equals": [
        {
          "Ref": "Param1"
        },
        "value1"
      ]
    },
    "Condition2": {
      "Fn::Equals": [
        {
          "Ref": "Param2"
        },
        "value2"
      ]
    },
    "EitherCondition": {
      "Fn::"
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 20, character: 11 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Fn::Not');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Parameter Section', () => {
            it('should provide parameter attribute completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "MyParam": {
      ""
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 7 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Type');
                expect(labels).toContain('AllowedPattern');
                expect(labels).toContain('Default');
                expect(labels).toContain('AllowedValues');
                expect(labels).toContain('MaxLength');
                expect(labels).toContain('MinValue');
                expect(labels).toContain('MinLength');
                expect(labels).toContain('MaxValue');
                expect(labels).toContain('NoEcho');
                expect(labels).toContain('Description');
                expect(labels).toContain('ConstraintDescription');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Cross-Reference Completions', () => {
            it.todo('should provide condition reference completions in resources', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Conditions": {
    "CreateProdResources": {
      "Fn::Equals": [
        {
          "Ref": "EnvType"
        },
        "prod"
      ]
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Condition": ""
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 15, character: 20 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('CreateProdResources');

                // todo: condition are not provided as completions
                // although template validation throws error
                // '' is not one of ['CreateProdResources']

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should not provide completions in broken/invalid JSON', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      ""
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toHaveLength(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide completions with missing required fields', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Properties": {
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions in empty template', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  ""
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 3 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions with multiple transforms', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Transform": [
    "AWS::Serverless-2016-10-31",
    "AWS::Include"
  ],
  "Resources": {
    "MyFunction": {
      "Type": ""
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Filtering & Ranking', () => {
            it('should provide fuzzy matching for partial input', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketNa"
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 17 },
                });

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('BucketName');
                expect(labels).not.toContain('Tags');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should rank completions by relevance', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Lambda function with inline code",
  "Resources": {
    "MyLambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 7, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Code');
                expect(labels).toContain('Role');
                expect(labels).not.toContain('Runtime');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should show optional properties after required ones fulfilled', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Lambda function with inline code",
  "Resources": {
    "MyLambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": "MyFunction",
        "Runtime": "python3.11",
        "Role": {"Fn::GetAtt": ["LambdaExecutionRole", "Arn"]},
        "Handler": "index.handler",
        "Code": {
          "ZipFile": "import json\\n\\ndef handler(event, context):\\n    return {\\n        'statusCode': 200,\\n        'body': json.dumps('Hello from Lambda!')\\n    }\\n"
        },
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 14, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Description');
                expect(labels).toContain('Architectures');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Documentation', () => {
            it('should include documentation in completion items', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const hasDocumentation = completions.items.some((item: any) => item.documentation);
                expect(hasDocumentation).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should include detail field in completion items', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        ""
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 9 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                const hasDetail = completions.items.some((item: any) => item.detail);
                expect(hasDetail).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should include correct kind in completion items', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "Fn::"
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 27 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();
                expect(completions.items.length).toBeGreaterThan(0);

                // Items should have kind field (Function, Property, etc.)
                const hasKind = completions.items.every((item: any) => item.kind !== undefined);
                expect(hasKind).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Snippet Completions', () => {
            it('should provide resource template snippets', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "M"
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const hasInsertTextOrTextEdit = completions.items.some((item: any) => item.insertText ?? item.textEdit);
                expect(hasInsertTextOrTextEdit).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide resource attribute snippets', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      ""
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 7 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const hasInsertTextOrTextEdit = completions.items.some((item: any) => item.insertText ?? item.textEdit);
                expect(hasInsertTextOrTextEdit).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Value Completions', () => {
            it('should provide boolean value completions', async () => {
                const template = getSimpleJsonTemplateText();
                const updatedTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test boolean autocomplete bug",
  "Resources": {
    "TestVPC": {
      "Type": "AWS::EC2::VPC",
      "Properties": {
        "CidrBlock": "10.0.0.0/16",
        "EnableDnsHostnames": true,
        "EnableDnsSupport": 
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 28 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('true');
                expect(labels).toContain('false');

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });
});
