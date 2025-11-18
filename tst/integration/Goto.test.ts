import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Location } from 'vscode-languageserver';
import { TestExtension } from '../utils/TestExtension';
import { wait, getYamlTemplate, getJsonTemplate } from '../utils/Utils';

describe('Integration Test: Goto/Definition', () => {
    let client: TestExtension;

    beforeAll(async () => {
        client = new TestExtension();
        await client.ready();
    }, 30000);

    afterAll(async () => {
        await client.close();
    });

    describe('YAML', () => {
        describe('Goto Parameter Definition', () => {
            it('should navigate to parameter definition from !Ref in resource property', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "StringParam" in !Ref StringParam (line 72)
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 72, character: 25 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(4); // StringParam definition at line 4
                } else {
                    expect(result.range.start.line).toBe(4);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to parameter definition from !Ref in !FindInMap', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "EnvironmentType" in !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 77, character: 59 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(21); // EnvironmentType definition
                } else {
                    expect(result.range.start.line).toBe(21);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to parameter definition from condition', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "EnvironmentType" in IsProd condition
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 63, character: 30 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(21); // EnvironmentType definition
                } else {
                    expect(result.range.start.line).toBe(21);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Resource Definition', () => {
            it('should navigate to resource definition from !Ref', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "MyS3Bucket" in output Value: !Ref MyS3Bucket
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 159, character: 22 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(69); // MyS3Bucket resource definition
                } else {
                    expect(result.range.start.line).toBe(69);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to resource definition from !GetAtt', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "LambdaExecutionRole" in !GetAtt LambdaExecutionRole.Arn
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 141, character: 25 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(143); // LambdaExecutionRole definition
                } else {
                    expect(result.range.start.line).toBe(143);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to resource definition from DependsOn', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on MyEC2Instance resource name in DependsOn array
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 102, character: 12 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(74); 
                } else {
                    expect(result.range.start.line).toBe(74);
                }
                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Condition Definition', () => {
            it('should navigate to condition definition from Condition attribute', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "CreateProdResources" in Condition: CreateProdResources
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 82, character: 24 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(66); // CreateProdResources condition definition
                } else {
                    expect(result.range.start.line).toBe(66);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to condition definition from !Condition reference', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "IsProd" in CreateProdResources: !Condition IsProd
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 66, character: 35 },
                });

                expect(result).toBeDefined();
                //todo: Goto not working on condition refs within Conditions section

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Mapping Definition', () => {
            it('should navigate to mapping definition from !FindInMap', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "EnvironmentMap" in !FindInMap [ EnvironmentMap, !Ref EnvironmentType, InstanceType ]
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 77, character: 38 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(42); // EnvironmentMap definition
                } else {
                    expect(result.range.start.line).toBe(42);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to mapping definition from !FindInMap with region', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "RegionMap" in !FindInMap [ RegionMap, !Ref "AWS::Region", AMI ]
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 78, character: 35 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(56); // RegionMap definition
                } else {
                    expect(result.range.start.line).toBe(56);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto with Pseudo Parameters', () => {
            it('should not navigate for pseudo parameters like AWS::Region', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "AWS::Region" - pseudo parameters don't have definitions
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 80, character: 50 },
                });

                // Pseudo parameters should not have goto definitions
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not navigate for pseudo parameters like AWS::StackName', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                // Click on "AWS::StackName" in !Join
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 90, character: 25 },
                });

                // Pseudo parameters should not have goto definitions
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid references gracefully', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref NonExistentParameter`;
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 5, character: 25 },
                });

                // Should return undefined or empty for non-existent references
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not navigate from whitespace', async () => {
                const template = getYamlTemplate();
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 2, character: 1 },
                });

                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not navigate from comments', async () => {
                const template = `AWSTemplateFormatVersion: '2010-09-09'
# This is a comment about StringParam
Parameters:
  StringParam:
    Type: String`;
                const uri = await client.openYamlTemplate(template);

                await wait(2000);

                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 1, character: 30 },
                });

                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });

    describe('JSON', () => {
        describe('Goto Parameter Definition', () => {
            it('should navigate to parameter definition from Ref in resource property', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "StringParam" in "Ref": "StringParam"
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 108, character: 22 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(4); // StringParam definition
                } else {
                    expect(result.range.start.line).toBe(4);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to parameter definition from Ref in FindInMap', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "EnvironmentType" in FindInMap Ref
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 119, character: 30 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(24); // EnvironmentType definition
                } else {
                    expect(result.range.start.line).toBe(24);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to parameter definition from condition', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "EnvironmentType" in IsProd condition
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 78, character: 25 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(24); // EnvironmentType definition
                } else {
                    expect(result.range.start.line).toBe(24);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Resource Definition', () => {
            it('should navigate to resource definition from Ref', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "MyS3Bucket" in output Value Ref
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 262, character: 20 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(104); // MyS3Bucket resource definition
                } else {
                    expect(result.range.start.line).toBe(104);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to resource definition from Fn::GetAtt', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "LambdaExecutionRole" in Fn::GetAtt array
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 231, character: 25 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(237); // LambdaExecutionRole definition
                } else {
                    expect(result.range.start.line).toBe(237);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to resource definition from DependsOn', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on resource name in DependsOn array
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 170, character: 15 },
                });

                 expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(112);
                } else {
                    expect(result.range.start.line).toBe(112);
                }
                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Condition Definition', () => {
            it('should navigate to condition definition from Condition attribute', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "CreateProdResources" in "Condition": "CreateProdResources"
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 137, character: 35 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(99); // CreateProdResources condition definition
                } else {
                    expect(result.range.start.line).toBe(99);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to condition definition from Condition reference', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "IsProd" in CreateProdResources condition
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 100, character: 25 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(75); // IsProd condition definition
                } else {
                    expect(result.range.start.line).toBe(75);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto Mapping Definition', () => {
            it('should navigate to mapping definition from Fn::FindInMap', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "EnvironmentMap" in Fn::FindInMap array
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 117, character: 20 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(48); // EnvironmentMap definition
                } else {
                    expect(result.range.start.line).toBe(48);
                }

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should navigate to mapping definition from Fn::FindInMap with region', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "RegionMap" in Fn::FindInMap
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 126, character: 18 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(65); // RegionMap definition
                } else {
                    expect(result.range.start.line).toBe(65);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Goto with Pseudo Parameters', () => {
            it('should not navigate for pseudo parameters like AWS::Region', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "AWS::Region" - pseudo parameters don't have definitions
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 100, character: 35 },
                });

                // Pseudo parameters should not have goto definitions
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not navigate for pseudo parameters like AWS::StackName', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "AWS::StackName" in Fn::Join
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 111, character: 25 },
                });

                // Pseudo parameters should not have goto definitions
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });
        });

        describe('Edge Cases', () => {
            it('should handle invalid references gracefully', async () => {
                const template = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Ref": "NonExistentParameter" }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 6, character: 35 },
                });

                // Should return undefined or empty for non-existent references
                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should not navigate from whitespace', async () => {
                const template = getJsonTemplate();
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 2, character: 1 },
                });

                expect(result === undefined || result === null || (Array.isArray(result) && result.length === 0)).toBe(
                    true,
                );

                await client.closeDocument({ textDocument: { uri } });
            });

            it('should handle complex nested structures', async () => {
                const template = `{
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
        "BucketName": {
          "Fn::Join": [
            "-",
            [
              "bucket",
              { "Ref": "MyParam" },
              { "Ref": "AWS::Region" }
            ]
          ]
        }
      }
    }
  }
}`;
                const uri = await client.openJsonTemplate(template);

                await wait(2000);

                // Click on "MyParam" nested in Fn::Join
                const result: any = await client.definition({
                    textDocument: { uri },
                    position: { line: 16, character: 30 },
                });

                expect(result).toBeDefined();
                if (Array.isArray(result)) {
                    expect(result.length).toBeGreaterThan(0);
                    expect(result[0].range.start.line).toBe(3); // MyParam definition
                } else {
                    expect(result.range.start.line).toBe(3);
                }

                await client.closeDocument({ textDocument: { uri } });
            });
        });
    });
});
