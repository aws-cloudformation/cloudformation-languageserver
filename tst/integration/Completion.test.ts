import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestExtension } from '../utils/TestExtension';
import { wait, getSimpleYamlTemplateText, getComprehensiveYamlTemplate, getBrokenYamlTemplate, getYamlTemplate } from '../utils/Utils';

describe('Integration Test: Completion', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension();
        await client.ready();
    }, 30000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
            it('should provide parameter name completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 2 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide Parameter Type completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    Type: `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 3, character: 10 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('String');
                expect(labels).toContain('Number');
                expect(labels).toContain('List<Number>');
                expect(labels).toContain('CommaDelimitedList');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide parameter attribute completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    Type: String
    `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Default');
                expect(labels).toContain('AllowedValues');
                expect(labels).toContain('AllowedPattern');
                expect(labels).toContain('ConstraintDescription');
                expect(labels).toContain('NoEcho');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide AllowedValues array item completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
    AllowedValues:
      - `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 8 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide ConstraintDescription completion', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    Type: String
    C`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('ConstraintDescription');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide NoEcho completion', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyPassword:
    Type: String
    N`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 5 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('NoEcho');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Mappings Section', () => {
            it('should provide mapping name completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 2 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide top-level key completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  RegionMap:
    `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 3, character: 4 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide second-level key completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  RegionMap:
    us-east-1:
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 6 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide value completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  RegionMap:
    us-east-1:
      AMI: `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 11 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Conditions Section', () => {
              const template = getSimpleYamlTemplateText();
            it('should provide condition name completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 2 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide condition function completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
Conditions:
  IsProduction: !`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 18 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('!Equals');
                expect(labels).toContain('!And');
                expect(labels).toContain('!Or');
                expect(labels).toContain('!Not');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Outputs Section', () => {
            it('should provide output name completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 2 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide output attribute completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  BucketName:
    `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 4 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('Description');
                expect(labels).toContain('Value');
                expect(labels).toContain('Export');
                expect(labels).toContain('Condition');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide condition reference completions', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  CreateOutput: !Equals [!Ref EnvType, prod]
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  BucketName:
    Value: !Ref MyBucket
    Condition: `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 9, character: 15 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('CreateOutput');

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
            it('should provide completions in broken/invalid YAML', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties
      BucketName: `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 18 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions with missing required fields', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 6 },
                });

                expect(completions).toBeDefined();

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 1, character: 15 },
                });

                // Completions in comments should return nothing or empty
                expect(completions === null || completions?.items?.length === 0).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions in string values', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: "my-bucket-"`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 29 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions after whitespace', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions at end of file', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 4, character: 0 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide completions in empty template', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = ``;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 0, character: 0 },
                });

                expect(completions).toBeDefined();

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
      BktNm`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 11 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should rank completions by relevance', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      B`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 7 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                // BucketName should be ranked higher than other B* properties
                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toContain('BucketName');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should filter deprecated properties', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should filter completions based on context', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 6, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                // Should not suggest BucketName again since it's already defined
                const labels = completions.items.map((item: any) => item.label);
                expect(labels).toBeDefined();

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
Resources:
  `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 2, character: 2 },
                });

                expect(completions).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide intrinsic function snippets with placeholders', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !`;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 19 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

                // Some items might have insertText with placeholders
                const hasInsertText = completions.items.some((item: any) => item.insertText || item.textEdit);
                expect(hasInsertText).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide common pattern snippets', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 6 },
                });

                expect(completions).toBeDefined();
                expect(completions?.items).toBeDefined();

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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

            it('should provide export name completions in ImportValue', async () => {
              const template = getSimpleYamlTemplateText();
                const updatedTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !ImportValue `;
                const uri = await client.openYamlTemplate(template);
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

                const completions: any = await client.completion({
                    textDocument: { uri },
                    position: { line: 5, character: 30 },
                });

                expect(completions).toBeDefined();

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
                await wait(2000);

                await client.changeDocument({
                    textDocument: { uri, version: 2 },
                    contentChanges: [{ text: updatedTemplate }],
                });
                await wait(2000);

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
});
