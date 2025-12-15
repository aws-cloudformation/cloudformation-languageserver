import { SyntaxNode } from 'tree-sitter';
import { describe, it, expect } from 'vitest';
import {
    referencedLogicalIds,
    selectText,
    isLogicalIdCandidate,
} from '../../../../src/context/semantic/LogicalIdReferenceFinder';
import { DocumentType } from '../../../../src/document/Document';

const createMockSyntaxNode = (text: string) =>
    ({
        text,
    }) as SyntaxNode;

describe('LogicalIdReferenceFinder', () => {
    describe('selectText', () => {
        it('should return specificNode text when fullEntitySearch is false', () => {
            const specificNode = createMockSyntaxNode('specific text');
            const rootNode = createMockSyntaxNode('root text');

            const result = selectText(specificNode, false, rootNode);

            expect(result).toBe('specific text');
        });

        it('should return rootNode text when fullEntitySearch is true and rootNode exists', () => {
            const specificNode = createMockSyntaxNode('specific text');
            const rootNode = createMockSyntaxNode('root text');

            const result = selectText(specificNode, true, rootNode);

            expect(result).toBe('root text');
        });

        it('should return specificNode text when fullEntitySearch is true but rootNode is undefined', () => {
            const specificNode = createMockSyntaxNode('specific text');
            const result = selectText(specificNode, true);
            expect(result).toBe('specific text');
        });

        it('should return specificNode text when fullEntitySearch is true but rootNode has no text', () => {
            const specificNode = createMockSyntaxNode('specific text');
            const rootNode = createMockSyntaxNode('');
            rootNode.text = undefined as any; // Simulate undefined text

            const result = selectText(specificNode, true, rootNode);

            expect(result).toBe('specific text');
        });

        it('should return empty string when specificNode has no text', () => {
            const specificNode = createMockSyntaxNode('');
            specificNode.text = undefined as any; // Simulate undefined text

            const result = selectText(specificNode, false);

            expect(result).toBe('');
        });

        it('should handle null specificNode text gracefully', () => {
            const specificNode = createMockSyntaxNode('');
            specificNode.text = null as any; // Simulate null text

            const result = selectText(specificNode, false);

            expect(result).toBe('');
        });

        it('should prioritize rootNode text over specificNode text when fullEntitySearch is true', () => {
            const specificNode = createMockSyntaxNode('specific text');
            const rootNode = createMockSyntaxNode('root text');

            const result = selectText(specificNode, true, rootNode);

            expect(result).toBe('root text');
        });

        it('should work without rootNode parameter when fullEntitySearch is false', () => {
            const specificNode = createMockSyntaxNode('specific text');

            const result = selectText(specificNode, false);

            expect(result).toBe('specific text');
        });
    });

    describe('referencedLogicalIds', () => {
        describe('JSON format', () => {
            describe('Ref pattern', () => {
                it('should find single Ref reference', () => {
                    const text = '{"Ref": "MyResource"}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });

                it('should find multiple Ref references', () => {
                    const text = '{"Ref": "Resource1"}, {"Ref": "Resource2"}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['Resource1', 'Resource2']));
                });

                it('should handle Ref with whitespace', () => {
                    const text = '{ "Ref" : "MyResource" }';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });
            });

            describe('Fn::GetAtt pattern', () => {
                it('should find GetAtt reference', () => {
                    const text = '{"Fn::GetAtt": ["MyResource", "Arn"]}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });

                it('should handle GetAtt with whitespace', () => {
                    const text = '{ "Fn::GetAtt" : [ "MyResource" , "Arn" ] }';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });
            });

            describe('Fn::FindInMap pattern', () => {
                it('should find FindInMap reference', () => {
                    const text = '{"Fn::FindInMap": ["MyMapping", "Key1", "Key2"]}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyMapping']));
                });
            });

            describe('Fn::Sub pattern', () => {
                it('should find variables in Sub template', () => {
                    const text = '{"Fn::Sub": "Hello ${MyResource}"}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });

                it('should find multiple variables in Sub template', () => {
                    const text = '{"Fn::Sub": "Hello ${Resource1} and ${Resource2}"}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['Resource1', 'Resource2']));
                });

                it('should handle AWS pseudo parameters', () => {
                    const text = '{"Fn::Sub": "Hello ${AWS::Region} and ${MyResource}"}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });
            });

            describe('Fn::If pattern', () => {
                it('should find If condition reference', () => {
                    const text = '{"Fn::If": ["MyCondition", "TrueValue", "FalseValue"]}';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyCondition']));
                });
            });

            describe('Condition pattern', () => {
                it('should find Condition reference', () => {
                    const text = '"Condition": "MyCondition"';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyCondition']));
                });
            });

            describe('DependsOn pattern', () => {
                it('should find single DependsOn reference', () => {
                    const text = '"DependsOn": "MyResource"';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['MyResource']));
                });

                it('should find array DependsOn references', () => {
                    const text = '"DependsOn": ["Resource1", "Resource2"]';
                    const result = referencedLogicalIds(text, '', DocumentType.JSON);
                    expect(result).toEqual(new Set(['Resource1', 'Resource2']));
                });
            });
        });
    });

    describe('YAML format', () => {
        describe('!Ref pattern', () => {
            it('should find !Ref reference', () => {
                const text = '!Ref MyResource';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find multiple !Ref references', () => {
                const text = '!Ref Resource1\n!Ref Resource2';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Resource1', 'Resource2']));
            });
        });

        describe('!GetAtt pattern', () => {
            it('should find !GetAtt reference', () => {
                const text = '!GetAtt MyResource.Arn';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        describe('!FindInMap pattern', () => {
            it('should find !FindInMap reference', () => {
                const text = '!FindInMap [MyMapping, Key1, Key2]';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyMapping']));
            });
        });

        describe('!Sub pattern', () => {
            it('should find variables in !Sub template', () => {
                const text = '!Sub "Hello ${MyResource}"';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find variables in !Sub without quotes', () => {
                const text = '!Sub Hello ${MyResource}';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });
        });

        describe('Long form YAML patterns', () => {
            it('should find Ref: reference', () => {
                const text = 'Ref: MyResource';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find Fn::GetAtt: reference', () => {
                const text = 'Fn::GetAtt: [MyResource, Arn]';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find Fn::FindInMap: reference', () => {
                const text = 'Fn::FindInMap: [MyMapping, Key1, Key2]';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyMapping']));
            });

            it('should find Fn::Sub: reference', () => {
                const text = 'Fn::Sub: "Hello ${MyResource}"';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find Condition: reference', () => {
                const text = 'Condition: MyCondition';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyCondition']));
            });
        });

        describe('DependsOn YAML patterns', () => {
            it('should find single DependsOn reference', () => {
                const text = 'DependsOn: MyResource';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource']));
            });

            it('should find YAML list DependsOn references', () => {
                const text = `DependsOn:
  - Resource1
  - Resource2`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Resource1', 'Resource2']));
            });

            it('should find inline array DependsOn references', () => {
                const text = 'DependsOn: [Resource1, Resource2]';
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['Resource1', 'Resource2']));
            });
        });

        describe('Inline list items', () => {
            it('should find standalone list items', () => {
                const text = `- MyResource1
- MyResource2`;
                const result = referencedLogicalIds(text, '', DocumentType.YAML);
                expect(result).toEqual(new Set(['MyResource1', 'MyResource2']));
            });
        });
    });

    describe('Edge cases', () => {
        it('should exclude current logical ID', () => {
            const text = '{"Ref": "MyResource"}';
            const result = referencedLogicalIds(text, 'MyResource', DocumentType.JSON);
            expect(result).toEqual(new Set());
        });

        it('should exclude common properties', () => {
            const text = '{"Ref": "Type"}, {"Ref": "Properties"}';
            const result = referencedLogicalIds(text, '', DocumentType.JSON);
            expect(result).toEqual(new Set());
        });

        it('should handle empty text', () => {
            const result = referencedLogicalIds('', '', DocumentType.JSON);
            expect(result).toEqual(new Set());
        });

        it('should handle whitespace-only text', () => {
            const result = referencedLogicalIds('   \n\t  ', '', DocumentType.JSON);
            expect(result).toEqual(new Set());
        });

        it('should validate logical ID format', () => {
            const text = '{"Ref": "123Invalid"}, {"Ref": "ValidId"}';
            const result = referencedLogicalIds(text, '', DocumentType.JSON);
            expect(result).toEqual(new Set(['ValidId']));
        });

        it('should handle mixed case common properties', () => {
            const text = '{"Ref": "type"}, {"Ref": "TYPE"}, {"Ref": "ValidId"}';
            const result = referencedLogicalIds(text, '', DocumentType.JSON);
            expect(result).toEqual(new Set(['ValidId']));
        });
    });

    describe('Complex scenarios', () => {
        it('should find references in complex JSON template', () => {
            const text = `{
                "Resources": {
                    "MyBucket": {
                        "Type": "AWS::S3::Bucket",
                        "DependsOn": ["MyRole", "MyPolicy"]
                    },
                    "MyLambda": {
                        "Type": "AWS::Lambda::Function",
                        "Properties": {
                            "Role": {"Fn::GetAtt": ["MyRole", "Arn"]},
                            "Environment": {
                                "Variables": {
                                    "BUCKET_NAME": {"Ref": "MyBucket"}
                                }
                            }
                        },
                        "Condition": "CreateLambda"
                    }
                }
            }`;
            const result = referencedLogicalIds(text, '', DocumentType.JSON);
            expect(result).toEqual(new Set(['MyRole', 'MyPolicy', 'MyBucket', 'CreateLambda']));
        });

        it('should find references in complex YAML template', () => {
            const text = `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    DependsOn:
      - MyRole
      - MyPolicy
  MyLambda:
    Type: AWS::Lambda::Function
    Properties:
      Role: !GetAtt MyRole.Arn
      Environment:
        Variables:
          BUCKET_NAME: !Ref MyBucket
          MESSAGE: !Sub "Hello \${MyParameter}"
    Condition: CreateLambda`;
            const result = referencedLogicalIds(text, '', DocumentType.YAML);
            expect(result).toEqual(new Set(['MyRole', 'MyPolicy', 'MyBucket', 'MyParameter', 'CreateLambda']));
        });

        it('should handle nested Fn::Sub with multiple variables', () => {
            const text = '{"Fn::Sub": "arn:aws:s3:::${BucketName}/logs/${AWS::AccountId}/${LogPrefix}"}';
            const result = referencedLogicalIds(text, '', DocumentType.JSON);
            expect(result).toEqual(new Set(['BucketName', 'LogPrefix']));
        });
    });

    describe('isLogicalIdCandidate', () => {
        describe('valid logical IDs', () => {
            it('should accept simple alphanumeric IDs', () => {
                expect(isLogicalIdCandidate('MyResource')).toBe(true);
                expect(isLogicalIdCandidate('MyBucket123')).toBe(true);
                expect(isLogicalIdCandidate('Resource1')).toBe(true);
            });

            it('should accept IDs with dots', () => {
                expect(isLogicalIdCandidate('My.Resource')).toBe(true);
                expect(isLogicalIdCandidate('Resource.Arn')).toBe(true);
            });

            it('should accept IDs starting with uppercase or lowercase', () => {
                expect(isLogicalIdCandidate('myResource')).toBe(true);
                expect(isLogicalIdCandidate('MyResource')).toBe(true);
            });
        });

        describe('invalid inputs', () => {
            it('should reject null and undefined', () => {
                expect(isLogicalIdCandidate(null)).toBe(false);
                expect(isLogicalIdCandidate(undefined)).toBe(false);
            });

            it('should reject non-string types', () => {
                expect(isLogicalIdCandidate(123)).toBe(false);
                expect(isLogicalIdCandidate({})).toBe(false);
                expect(isLogicalIdCandidate([])).toBe(false);
                expect(isLogicalIdCandidate(true)).toBe(false);
            });

            it('should reject empty string', () => {
                expect(isLogicalIdCandidate('')).toBe(false);
            });

            it('should reject single character strings', () => {
                expect(isLogicalIdCandidate('A')).toBe(false);
                expect(isLogicalIdCandidate('x')).toBe(false);
            });

            it('should reject IDs starting with numbers', () => {
                expect(isLogicalIdCandidate('123Resource')).toBe(false);
                expect(isLogicalIdCandidate('1Bucket')).toBe(false);
            });

            it('should reject special characters', () => {
                expect(isLogicalIdCandidate('-')).toBe(false);
                expect(isLogicalIdCandidate('.')).toBe(false);
                expect(isLogicalIdCandidate('_')).toBe(false);
            });

            it('should reject strings with substitution patterns', () => {
                expect(isLogicalIdCandidate('${MyVar}')).toBe(false);
                expect(isLogicalIdCandidate('prefix${Var}suffix')).toBe(false);
            });
        });

        describe('common properties exclusion', () => {
            it('should reject CloudFormation common properties', () => {
                expect(isLogicalIdCandidate('Type')).toBe(false);
                expect(isLogicalIdCandidate('Properties')).toBe(false);
                expect(isLogicalIdCandidate('Condition')).toBe(false);
                expect(isLogicalIdCandidate('DependsOn')).toBe(false);
                expect(isLogicalIdCandidate('Metadata')).toBe(false);
            });

            it('should reject common properties in different cases', () => {
                expect(isLogicalIdCandidate('type')).toBe(false);
                expect(isLogicalIdCandidate('TYPE')).toBe(false);
                expect(isLogicalIdCandidate('properties')).toBe(false);
                expect(isLogicalIdCandidate('PROPERTIES')).toBe(false);
            });

            it('should reject other common property names', () => {
                expect(isLogicalIdCandidate('Description')).toBe(false);
                expect(isLogicalIdCandidate('Value')).toBe(false);
                expect(isLogicalIdCandidate('Export')).toBe(false);
                expect(isLogicalIdCandidate('Name')).toBe(false);
            });
        });

        describe('pseudo parameters exclusion', () => {
            it('should reject AWS pseudo parameters', () => {
                expect(isLogicalIdCandidate('AWS::AccountId')).toBe(false);
                expect(isLogicalIdCandidate('AWS::Region')).toBe(false);
                expect(isLogicalIdCandidate('AWS::StackId')).toBe(false);
                expect(isLogicalIdCandidate('AWS::StackName')).toBe(false);
                expect(isLogicalIdCandidate('AWS::NotificationARNs')).toBe(false);
                expect(isLogicalIdCandidate('AWS::NoValue')).toBe(false);
                expect(isLogicalIdCandidate('AWS::Partition')).toBe(false);
                expect(isLogicalIdCandidate('AWS::URLSuffix')).toBe(false);
            });
        });
    });
});
