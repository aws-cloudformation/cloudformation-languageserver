import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { CodeLens } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';

describe('CodeLens', () => {
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
        describe('Stack Actions CodeLens', () => {
            it('should provide Validate and Deploy CodeLens for valid template', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template for CodeLens
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket`;

                const uri = await client.openYamlTemplate(template);

                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBeGreaterThan(0);

                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.command?.title).toBe('Validate and Deploy');
                expect(deployCodeLens?.command?.arguments).toEqual([uri]);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should place CodeLens on first non-comment line', async () => {
                const template = `# This is a comment
# Another comment
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.range.start.line).toBe(2); // Line with AWSTemplateFormatVersion

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens for template without Resources', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Description: Template without resources`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens for empty Resources section', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should skip empty lines when placing CodeLens', async () => {
                const template = `

AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.range.start.line).toBe(2);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide CodeLens for template with Parameters and Resources', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  BucketName:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.command?.title).toBe('Validate and Deploy');

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Managed Resource CodeLens', () => {
            it('should provide "Open Stack Template" CodeLens for managed resource', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeDefined();
                expect(managedCodeLens?.command?.title).toBe('Open Stack Template');
                expect(managedCodeLens?.command?.arguments).toEqual(['parent-stack', 'bucket-123']);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should place CodeLens on StackName line', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeDefined();
                expect(managedCodeLens?.range.start.line).toBe(6);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without ManagedByStack metadata', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  RegularBucket:
    Type: AWS::S3::Bucket
    Metadata:
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: regular-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without StackName', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without PrimaryIdentifier', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens when ManagedByStack is false', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: false
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Combined Scenarios', () => {
            it('should provide both CodeLens types in same template', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  RegularBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: regular-bucket
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
    Properties:
      BucketName: managed-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBe(2);

                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(managedCodeLens).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide multiple managed resource CodeLenses', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ManagedBucket1:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack-1
      PrimaryIdentifier: bucket-1
    Properties:
      BucketName: managed-bucket-1
  ManagedBucket2:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack-2
      PrimaryIdentifier: bucket-2
    Properties:
      BucketName: managed-bucket-2`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLenses = result.filter(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLenses.length).toBe(2);
                expect(managedCodeLenses[0].command?.arguments).toEqual(['parent-stack-1', 'bucket-1']);
                expect(managedCodeLenses[1].command?.arguments).toEqual(['parent-stack-2', 'bucket-2']);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle mixed managed and regular resources', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  RegularBucket:
    Type: AWS::S3::Bucket
  ManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
      PrimaryIdentifier: bucket-123
  AnotherRegularBucket:
    Type: AWS::S3::Bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();

                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );
                const managedCodeLenses = result.filter(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(managedCodeLenses.length).toBe(1);

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid template gracefully', async () => {
                const template = `This is not a valid CloudFormation template
Resources:
  InvalidResource`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(Array.isArray(result)).toBe(true);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle empty template', async () => {
                const template = '';

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle template with only comments', async () => {
                const template = `# Comment 1
# Comment 2
# Comment 3`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBe(0);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle resource with partial metadata', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  PartialManagedBucket:
    Type: AWS::S3::Bucket
    Metadata:
      ManagedByStack: true
      StackName: parent-stack
      SomeOtherField: value
    Properties:
      BucketName: partial-bucket`;

                const uri = await client.openYamlTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                // Should not provide managed CodeLens without PrimaryIdentifier
                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });

    describe('JSON', () => {
        describe('Stack Actions CodeLens', () => {
            it('should provide Validate and Deploy CodeLens for valid template', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test template for CodeLens",
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
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBeGreaterThan(0);

                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.command?.title).toBe('Validate and Deploy');
                expect(deployCodeLens?.command?.arguments).toEqual([uri]);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should place CodeLens on first non-empty line', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(deployCodeLens?.range.start.line).toBe(0); // First line with opening brace

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens for template without Resources', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Template without resources"
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens for empty Resources section', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {}
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );

                expect(deployCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Managed Resource CodeLens', () => {
            it('should provide "Open Stack Template" CodeLens for managed resource', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ManagedBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack",
        "PrimaryIdentifier": "bucket-123"
      },
      "Properties": {
        "BucketName": "managed-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeDefined();
                expect(managedCodeLens?.command?.title).toBe('Open Stack Template');
                expect(managedCodeLens?.command?.arguments).toEqual(['parent-stack', 'bucket-123']);

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should place CodeLens on StackName line', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ManagedBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack",
        "PrimaryIdentifier": "bucket-123"
      },
      "Properties": {
        "BucketName": "managed-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeDefined();
                expect(managedCodeLens?.range.start.line).toBe(7); // Line with "StackName"

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without ManagedByStack metadata', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "RegularBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "StackName": "parent-stack",
        "PrimaryIdentifier": "bucket-123"
      },
      "Properties": {
        "BucketName": "regular-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without StackName', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ManagedBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "PrimaryIdentifier": "bucket-123"
      },
      "Properties": {
        "BucketName": "managed-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not provide CodeLens without PrimaryIdentifier', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ManagedBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack"
      },
      "Properties": {
        "BucketName": "managed-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(managedCodeLens).toBeUndefined();

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Combined Scenarios', () => {
            it('should provide both CodeLens types in same template', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "RegularBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "regular-bucket"
      }
    },
    "ManagedBucket": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack",
        "PrimaryIdentifier": "bucket-123"
      },
      "Properties": {
        "BucketName": "managed-bucket"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
                expect(result.length).toBe(2);

                const deployCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.deployTemplate',
                );
                const managedCodeLens = result.find(
                    (lens) => lens.command?.command === 'aws.cloudformation.api.openStackTemplate',
                );

                expect(deployCodeLens).toBeDefined();
                expect(managedCodeLens).toBeDefined();

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should provide multiple managed resource CodeLenses', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "ManagedBucket1": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack-1",
        "PrimaryIdentifier": "bucket-1"
      },
      "Properties": {
        "BucketName": "managed-bucket-1"
      }
    },
    "ManagedBucket2": {
      "Type": "AWS::S3::Bucket",
      "Metadata": {
        "ManagedByStack": true,
        "StackName": "parent-stack-2",
        "PrimaryIdentifier": "bucket-2"
      },
      "Properties": {
        "BucketName": "managed-bucket-2"
      }
    }
  }
}`;

                const uri = await client.openJsonTemplate(template);
                const result = (await client.codeLens({
                    textDocument: { uri },
                })) as CodeLens[];

                expect(result).toBeDefined();
            });
        });
    });
});
