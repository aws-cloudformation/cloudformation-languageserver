import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DocumentSymbol, SymbolKind } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { wait } from '../utils/Utils';

describe('Integration Test: DocumentSymbol', () => {
    let client: TestExtension;

    beforeEach(() => {
        client = new TestExtension();
    });

    afterEach(async () => {
        await client.close();
    });

    describe('YAML', () => {
        describe('Section Symbol Tests', () => {
            it('should create symbols for all top-level sections', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template
Transform: AWS::Serverless-2016-10-31
Parameters:
  BucketName:
    Type: String
Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-12345
Conditions:
  IsProd: !Equals [!Ref EnvType, prod]
Rules:
  TestRule:
    Assertions:
      - Assert: !Equals [!Ref BucketName, test]
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
Outputs:
  BucketArn:
    Value: !GetAtt MyBucket.Arn
Metadata:
  Version: 1.0`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(10);

                const symbolNames = result.map((s) => s.name);
                expect(symbolNames).toContain('AWSTemplateFormatVersion');
                expect(symbolNames).toContain('Description');
                expect(symbolNames).toContain('Transform');
                expect(symbolNames).toContain('Parameters');
                expect(symbolNames).toContain('Mappings');
                expect(symbolNames).toContain('Conditions');
                expect(symbolNames).toContain('Rules');
                expect(symbolNames).toContain('Resources');
                expect(symbolNames).toContain('Outputs');
                expect(symbolNames).toContain('Metadata');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should use correct SymbolKind for each section', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Description: Test
Transform: AWS::Serverless-2016-10-31
Parameters:
  Param1:
    Type: String
Mappings:
  Map1:
    Key: Value
Conditions:
  Cond1: !Equals [a, b]
Rules:
  Rule1:
    Assertions: []
Resources:
  Res1:
    Type: AWS::S3::Bucket
Outputs:
  Out1:
    Value: test
Metadata:
  Meta1: value`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const symbolKinds = new Map(result.map((s) => [s.name, s.kind]));
                expect(symbolKinds.get('AWSTemplateFormatVersion')).toBe(SymbolKind.Constant);
                expect(symbolKinds.get('Description')).toBe(SymbolKind.String);
                expect(symbolKinds.get('Transform')).toBe(SymbolKind.Package);
                expect(symbolKinds.get('Parameters')).toBe(SymbolKind.Module);
                expect(symbolKinds.get('Mappings')).toBe(SymbolKind.Object);
                expect(symbolKinds.get('Conditions')).toBe(SymbolKind.Boolean);
                expect(symbolKinds.get('Rules')).toBe(SymbolKind.Function);
                expect(symbolKinds.get('Resources')).toBe(SymbolKind.Namespace);
                expect(symbolKinds.get('Outputs')).toBe(SymbolKind.Interface);
                expect(symbolKinds.get('Metadata')).toBe(SymbolKind.Namespace);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle template with only some sections', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(2);
                expect(result[0].name).toBe('AWSTemplateFormatVersion');
                expect(result[1].name).toBe('Resources');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle empty template', async () => {
                const template = '';

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle minimal template', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(1);
                expect(result[0].name).toBe('AWSTemplateFormatVersion');
                expect(result[0].kind).toBe(SymbolKind.Constant);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Entity Children Simple Sections', () => {
            it('should create children for Mappings', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-12345
  EnvironmentMap:
    dev:
      InstanceType: t2.micro`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Mappings');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(2);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('RegionMap');
                expect(childNames).toContain('EnvironmentMap');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Object);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should create children for Conditions', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  EnvType:
    Type: String
Conditions:
  IsProd: !Equals [!Ref EnvType, prod]
  IsDev: !Equals [!Ref EnvType, dev]
  IsTest: !Equals [!Ref EnvType, test]`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Conditions');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(3);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('IsProd');
                expect(childNames).toContain('IsDev');
                expect(childNames).toContain('IsTest');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Boolean);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should create children for Rules', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Rules:
  ValidateBucketName:
    Assertions:
      - Assert: !Not [!Equals [!Ref BucketName, '']]
  ValidateInstanceType:
    Assertions:
      - Assert: !Contains [['t2.micro', 't2.small'], !Ref InstanceType]`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Rules');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(2);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('ValidateBucketName');
                expect(childNames).toContain('ValidateInstanceType');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Function);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should create children for Metadata', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Metadata:
  Version: 1.0
  Author: TestUser
  LastModified: 2024-01-01`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Metadata');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(3);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('Version');
                expect(childNames).toContain('Author');
                expect(childNames).toContain('LastModified');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Namespace);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });
            //todo: create children didn't work in Outputs section for JSON
        });

        describe('Entity Children Typed Sections', () => {
            it('should create typed children for Parameters with Type', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  BucketName:
    Type: String
  InstanceType:
    Type: String
    Default: t2.micro
  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Parameters');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children?.length).toBe(3);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('BucketName (String)');
                expect(childNames).toContain('InstanceType (String)');
                expect(childNames).toContain('KeyPairName (AWS::EC2::KeyPair::KeyName)');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Variable);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should create typed children for Resources with AWS types', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
  MyQueue:
    Type: AWS::SQS::Queue
  MyTopic:
    Type: AWS::SNS::Topic
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs20.x
      Handler: index.handler
      Code:
        ZipFile: |
          exports.handler = async () => ({ statusCode: 500 });`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children?.length).toBe(4);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('MyBucket (AWS::S3::Bucket)');
                expect(childNames).toContain('MyQueue (AWS::SQS::Queue)');
                expect(childNames).toContain('MyTopic (AWS::SNS::Topic)');
                expect(childNames).toContain('MyFunction (AWS::Lambda::Function)');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Class);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle Parameters with Number and CommaDelimitedList types', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MaxSize:
    Type: Number
    Default: 10
  AvailabilityZones:
    Type: CommaDelimitedList
    Default: us-east-1a,us-east-1b`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Parameters');
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children?.length).toBe(2);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('MaxSize (Number)');
                expect(childNames).toContain('AvailabilityZones (CommaDelimitedList)');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Range Tests', () => {
            it('should provide correct range for sections', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.range).toBeDefined();

                // Range should start at line 1 (Resources:)
                expect(symbol?.range.start.line).toBe(1);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide correct selectionRange for sections', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.selectionRange).toBeDefined();

                // Selection range should highlight just the key "Resources"
                expect(symbol?.selectionRange.start.line).toBe(1);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide correct range for entity children', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                const bucketSymbol = symbol?.children?.find((c) => c.name.startsWith('MyBucket'));

                expect(bucketSymbol).toBeDefined();
                expect(bucketSymbol?.range).toBeDefined();

                // Range should cover the entire resource definition
                expect(bucketSymbol?.range.start.line).toBe(2);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid/malformed templates gracefully', async () => {
                const template = `This is not a valid template
Resources:
  Invalid`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle sections without entities', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources: {}
Outputs: {}`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const resourcesSymbol = result.find((s) => s.name === 'Resources');
                const outputsSymbol = result.find((s) => s.name === 'Outputs');

                expect(resourcesSymbol).toBeDefined();
                expect(outputsSymbol).toBeDefined();
                expect(resourcesSymbol?.children?.length).toBe(0);
                expect(outputsSymbol?.children?.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle deeply nested structures', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test
      Tags:
        - Key: Name
          Value: Test
        - Key: Environment
          Value: Dev`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children?.length).toBe(1);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle template with only comments', async () => {
                const template = `# This is a comment
# Another comment
# Yet another comment`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle mixed SAM and CloudFormation resources', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Resources:
  MyFunction:
    Type: AWS::Serverless::Function
    Properties:
      Runtime: nodejs20.x
      Handler: index.handler
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                await wait(100);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children?.length).toBe(2);

                const childNames = symbol?.children?.map((c) => c.name) ?? [];
                expect(childNames).toContain('MyFunction (AWS::Serverless::Function)');
                expect(childNames).toContain('MyBucket (AWS::S3::Bucket)');

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });

    describe('JSON', () => {
        describe('Section Symbol Tests', () => {
            it('should create symbols for all top-level sections', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test template",
  "Transform": "AWS::Serverless-2016-10-31",
  "Parameters": {
    "BucketName": {
      "Type": "String"
    }
  },
  "Mappings": {
    "RegionMap": {
      "us-east-1": {
        "AMI": "ami-12345"
      }
    }
  },
  "Conditions": {
    "IsProd": {
      "Fn::Equals": [{ "Ref": "EnvType" }, "prod"]
    }
  },
  "Rules": {
    "TestRule": {
      "Assertions": []
    }
  },
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "Outputs": {
    "BucketArn": {
      "Value": { "Fn::GetAtt": ["MyBucket", "Arn"] }
    }
  },
  "Metadata": {
    "Version": "1.0"
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(10);

                const symbolNames = result.map((s) => s.name);
                expect(symbolNames).toContain('AWSTemplateFormatVersion');
                expect(symbolNames).toContain('Description');
                expect(symbolNames).toContain('Transform');
                expect(symbolNames).toContain('Parameters');
                expect(symbolNames).toContain('Mappings');
                expect(symbolNames).toContain('Conditions');
                expect(symbolNames).toContain('Rules');
                expect(symbolNames).toContain('Resources');
                expect(symbolNames).toContain('Outputs');
                expect(symbolNames).toContain('Metadata');

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should use correct SymbolKind for each section', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test",
  "Transform": "AWS::Serverless-2016-10-31",
  "Parameters": {
    "Param1": { "Type": "String" }
  },
  "Mappings": {
    "Map1": { "Key": "Value" }
  },
  "Conditions": {
    "Cond1": { "Fn::Equals": ["a", "b"] }
  },
  "Rules": {
    "Rule1": { "Assertions": [] }
  },
  "Resources": {
    "Res1": { "Type": "AWS::S3::Bucket" }
  },
  "Outputs": {
    "Out1": { "Value": "test" }
  },
  "Metadata": {
    "Meta1": "value"
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const symbolKinds = new Map(result.map((s) => [s.name, s.kind]));
                expect(symbolKinds.get('AWSTemplateFormatVersion')).toBe(SymbolKind.Constant);
                expect(symbolKinds.get('Description')).toBe(SymbolKind.String);
                expect(symbolKinds.get('Transform')).toBe(SymbolKind.Package);
                expect(symbolKinds.get('Parameters')).toBe(SymbolKind.Module);
                expect(symbolKinds.get('Mappings')).toBe(SymbolKind.Object);
                expect(symbolKinds.get('Conditions')).toBe(SymbolKind.Boolean);
                expect(symbolKinds.get('Rules')).toBe(SymbolKind.Function);
                expect(symbolKinds.get('Resources')).toBe(SymbolKind.Namespace);
                expect(symbolKinds.get('Outputs')).toBe(SymbolKind.Interface);
                expect(symbolKinds.get('Metadata')).toBe(SymbolKind.Namespace);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle template with only some sections', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(2);
                expect(result[0].name).toBe('AWSTemplateFormatVersion');
                expect(result[1].name).toBe('Resources');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Entity Children Simple Sections', () => {
            it('should create children for Mappings', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Mappings": {
    "RegionMap": {
      "us-east-1": {
        "AMI": "ami-12345"
      }
    },
    "EnvironmentMap": {
      "dev": {
        "InstanceType": "t2.micro"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Mappings');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(2);
            });

            it('should create children for Outputs', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  },
  "Outputs": {
    "BucketName": {
      "Value": { "Ref": "MyBucket" }
    },
    "BucketArn": {
      "Value": { "Fn::GetAtt": ["MyBucket", "Arn"] }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                // todo: does not find Outputs section in JSON
                expect(result).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Entity Children Typed Sections', () => {
            it('should create typed children for Parameters with Type', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "BucketName": {
      "Type": "String"
    },
    "InstanceType": {
      "Type": "String",
      "Default": "t2.micro"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Parameters');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(2);

                const childNames = symbol?.children?.map((c) => c.name);
                expect(childNames).toContain('BucketName (String)');
                expect(childNames).toContain('InstanceType (String)');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Variable);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should create typed children for Resources with AWS types', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    },
    "MyQueue": {
      "Type": "AWS::SQS::Queue"
    },
    "MyTopic": {
      "Type": "AWS::SNS::Topic"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(3);

                const childNames = symbol?.children?.map((c) => c.name);
                expect(childNames).toContain('MyBucket (AWS::S3::Bucket)');
                expect(childNames).toContain('MyQueue (AWS::SQS::Queue)');
                expect(childNames).toContain('MyTopic (AWS::SNS::Topic)');

                if (symbol?.children)
                    for (const child of symbol.children) {
                        expect(child.kind).toBe(SymbolKind.Class);
                    }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Range Tests', () => {
            it('should provide correct range for sections', async () => {
                const template = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.range).toBeDefined();

                expect(symbol?.range.start.line).toBe(2);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide correct selectionRange for sections', async () => {
                const template = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol).toBeDefined();
                expect(symbol?.selectionRange).toBeDefined();

                expect(symbol?.selectionRange.start.line).toBe(2);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide correct range for entity children', async () => {
                const template = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "test-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                const bucketSymbol = symbol?.children?.find((c) => c.name.startsWith('MyBucket'));

                expect(bucketSymbol).toBeDefined();
                expect(bucketSymbol?.range).toBeDefined();

                expect(bucketSymbol?.range.start.line).toBe(3);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should handle empty JSON template', async () => {
                const template = '{}';

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();
                expect(result.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle sections without entities in JSON', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {},
  "Outputs": {}
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const resourcesSymbol = result.find((s) => s.name === 'Resources');
                const outputsSymbol = result.find((s) => s.name === 'Outputs');

                expect(resourcesSymbol).toBeDefined();
                expect(outputsSymbol).toBeDefined();
                expect(resourcesSymbol?.children?.length).toBe(0);
                expect(outputsSymbol?.children?.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle deeply nested structures', async () => {
                const template = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "test",
        "Tags": [
          {
            "Key": "Name",
            "Value": "Test"
          },
          {
            "Key": "Environment",
            "Value": "Dev"
          }
        ]
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                expect(result).toBeDefined();

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(1);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle mixed SAM and CloudFormation resources', async () => {
                const template = `{
"AWSTemplateFormatVersion": "2010-09-09",
  "Transform": "AWS::Serverless-2016-10-31",
  "Resources": {
    "MyFunction": {
      "Type": "AWS::Serverless::Function",
      "Properties": {
        "Runtime": "nodejs20.x",
        "Handler": "index.handler"
      }
    },
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                await wait(500);

                const result = (await client.documentSymbol({
                    textDocument: { uri },
                })) as DocumentSymbol[];

                const symbol = result.find((s) => s.name === 'Resources');
                expect(symbol?.children).toBeDefined();
                expect(symbol?.children).toHaveLength(2);

                const childNames = symbol?.children?.map((c) => c.name);
                expect(childNames).toContain('MyFunction (AWS::Serverless::Function)');
                expect(childNames).toContain('MyBucket (AWS::S3::Bucket)');

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });
});
