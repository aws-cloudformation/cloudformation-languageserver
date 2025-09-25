import { describe, it, expect, beforeEach } from 'vitest';
import { TopLevelSection } from '../../../src/context/ContextType';
import { FileContext } from '../../../src/context/FileContext';
import {
    Resource,
    Parameter,
    Condition,
    Mapping,
    Output,
    Rule,
    Metadata,
    Transform,
} from '../../../src/context/semantic/Entity';
import { ParameterType } from '../../../src/context/semantic/parameter/ParameterType';
import { CfnValue } from '../../../src/context/semantic/SemanticTypes';
import { DocumentType } from '../../../src/document/Document';
import { createMockClientMessage } from '../../utils/MockServerComponents';
import { Templates } from '../../utils/TemplateUtils';

describe('FileContext', () => {
    beforeEach(() => {
        createMockClientMessage();
    });

    describe('Constructor and Basic Setup', () => {
        it('should create FileContext with JSON document type', () => {
            const uri = 'file://test.json';
            const content = '{"AWSTemplateFormatVersion": "2010-09-09"}';

            const fileContext = new FileContext(uri, DocumentType.JSON, content);

            expect(fileContext.uri).toBe(uri);
            expect(fileContext.documentType).toBe(DocumentType.JSON);
        });

        it('should create FileContext with YAML document type', () => {
            const uri = 'file://test.yaml';
            const content = 'AWSTemplateFormatVersion: "2010-09-09"';

            const fileContext = new FileContext(uri, DocumentType.YAML, content);

            expect(fileContext.uri).toBe(uri);
            expect(fileContext.documentType).toBe(DocumentType.YAML);
        });

        it('should handle empty file contents', () => {
            const fileContext = new FileContext('file://empty.yaml', DocumentType.YAML, '');

            expect(fileContext.getTopLevelSectionNames()).toEqual([]);
            expect(fileContext.getTopLevelSections().size).toBe(0);
        });
    });

    describe('JSON Document Parsing', () => {
        it('should parse valid JSON CloudFormation template', () => {
            const jsonContent = JSON.stringify({
                AWSTemplateFormatVersion: '2010-09-09',
                Resources: {
                    MyBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'my-test-bucket',
                        },
                    },
                },
                Parameters: {
                    Environment: {
                        Type: 'String',
                        Default: 'dev',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, jsonContent);

            expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
            expect(fileContext.hasSection(TopLevelSection.Parameters)).toBe(true);
            expect(fileContext.hasSection(TopLevelSection.Conditions)).toBe(false);

            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            expect(resources).toHaveLength(1);
            expect(resources[0]).toBeInstanceOf(Resource);
            expect(resources[0].name).toBe('MyBucket');

            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);
            expect(parameters).toHaveLength(1);
            expect(parameters[0]).toBeInstanceOf(Parameter);
            expect(parameters[0].name).toBe('Environment');
        });

        it('should handle malformed JSON gracefully', () => {
            const malformedJson = '{"Resources": {"MyBucket": {';

            const fileContext = new FileContext('file://malformed.json', DocumentType.JSON, malformedJson);

            expect(() => {
                fileContext.getTopLevelSectionNames();
                fileContext.hasSection(TopLevelSection.Resources);
                fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            }).not.toThrow();
        });

        it('should handle JSON with non-object root', () => {
            const invalidJson = '"just a string"';

            const fileContext = new FileContext('file://invalid.json', DocumentType.JSON, invalidJson);

            expect(fileContext.getTopLevelSectionNames()).toEqual([]);
        });

        it('should parse JSON with all CloudFormation sections', () => {
            const comprehensiveJson = JSON.stringify({
                AWSTemplateFormatVersion: '2010-09-09',
                Description: 'Test template',
                Parameters: {
                    Env: { Type: 'String' },
                },
                Mappings: {
                    RegionMap: {
                        'us-east-1': { AMI: 'ami-12345' },
                    },
                },
                Conditions: {
                    IsProd: { 'Fn::Equals': [{ Ref: 'Env' }, 'prod'] },
                },
                Transform: 'AWS::Serverless-2016-10-31',
                Resources: {
                    Bucket: { Type: 'AWS::S3::Bucket' },
                },
                Outputs: {
                    BucketName: { Value: { Ref: 'Bucket' } },
                },
                Rules: {
                    TestRule: {
                        RuleCondition: { 'Fn::Equals': [{ Ref: 'Env' }, 'test'] },
                    },
                },
                Metadata: {
                    Author: 'Test',
                },
            });

            const fileContext = new FileContext('file://comprehensive.json', DocumentType.JSON, comprehensiveJson);

            const sectionNames = fileContext.getTopLevelSectionNames();
            expect(sectionNames).toContain(TopLevelSection.Parameters);
            expect(sectionNames).toContain(TopLevelSection.Mappings);
            expect(sectionNames).toContain(TopLevelSection.Conditions);
            expect(sectionNames).toContain(TopLevelSection.Transform);
            expect(sectionNames).toContain(TopLevelSection.Resources);
            expect(sectionNames).toContain(TopLevelSection.Outputs);
            expect(sectionNames).toContain(TopLevelSection.Rules);
            expect(sectionNames).toContain(TopLevelSection.Metadata);
        });
    });

    describe('YAML Document Parsing', () => {
        it('should parse valid YAML CloudFormation template', () => {
            const yamlContent = `
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-test-bucket
Parameters:
  Environment:
    Type: String
    Default: dev
`;

            const fileContext = new FileContext('file://test.yaml', DocumentType.YAML, yamlContent);

            expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
            expect(fileContext.hasSection(TopLevelSection.Parameters)).toBe(true);

            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            expect(resources).toHaveLength(1);
            expect(resources[0]).toBeInstanceOf(Resource);
            expect(resources[0].name).toBe('MyBucket');
        });

        it('should handle malformed YAML gracefully', () => {
            const malformedYaml = `
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
      Properties:
    BucketName: invalid-indentation
`;

            const fileContext = new FileContext('file://malformed.yaml', DocumentType.YAML, malformedYaml);

            // Should handle parsing errors gracefully
            expect(fileContext.getTopLevelSectionNames()).toEqual([]);
        });

        it('should parse YAML with complex structures', () => {
            const complexYaml = `
AWSTemplateFormatVersion: "2010-09-09"
Parameters:
  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues:
      - t3.micro
      - t3.small
      - t3.medium
Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-12345
      InstanceType: t3.micro
    us-west-2:
      AMI: ami-67890
      InstanceType: t3.small
Conditions:
  CreateProdResources: !Equals [!Ref Environment, prod]
Resources:
  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionMap, !Ref "AWS::Region", AMI]
      InstanceType: !Ref InstanceType
    Condition: CreateProdResources
`;

            const fileContext = new FileContext('file://complex.yaml', DocumentType.YAML, complexYaml);

            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);
            expect(parameters).toHaveLength(1);
            expect(parameters[0].name).toBe('InstanceType');

            const mappings = fileContext.getEntitiesFromSection(TopLevelSection.Mappings);
            expect(mappings).toHaveLength(1);
            expect(mappings[0]).toBeInstanceOf(Mapping);
            expect(mappings[0].name).toBe('RegionMap');

            const conditions = fileContext.getEntitiesFromSection(TopLevelSection.Conditions);
            expect(conditions).toHaveLength(1);
            expect(conditions[0]).toBeInstanceOf(Condition);
            expect(conditions[0].name).toBe('CreateProdResources');
        });
    });

    describe('Entity Creation', () => {
        it('should create Resource entities correctly', () => {
            const content = JSON.stringify({
                Resources: {
                    MyBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'test-bucket',
                            VersioningConfiguration: {
                                Status: 'Enabled',
                            },
                        },
                        DependsOn: ['MyRole'],
                        Condition: 'CreateBucket',
                        DeletionPolicy: 'Retain',
                        Metadata: {
                            Purpose: 'Testing',
                        },
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            expect(resources).toHaveLength(1);
            const resource = resources[0] as Resource;
            expect(resource).toBeInstanceOf(Resource);
            expect(resource.name).toBe('MyBucket');
            expect(resource.Type).toBe('AWS::S3::Bucket');
            expect(resource.Properties).toBeDefined();
            expect(resource.DependsOn).toEqual(['MyRole']);
            expect(resource.Condition).toBe('CreateBucket');
            expect(resource.DeletionPolicy).toBe('Retain');
            expect(resource.Metadata).toBeDefined();
        });

        it('should create Parameter entities correctly', () => {
            const content = JSON.stringify({
                Parameters: {
                    InstanceType: {
                        Type: 'String',
                        Default: 't3.micro',
                        AllowedValues: ['t3.micro', 't3.small'],
                        Description: 'EC2 instance type',
                        ConstraintDescription: 'Must be a valid instance type',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);

            expect(parameters).toHaveLength(1);
            const parameter = parameters[0] as Parameter;
            expect(parameter).toBeInstanceOf(Parameter);
            expect(parameter.name).toBe('InstanceType');
            expect(parameter.Type).toBe('String');
            expect(parameter.Default).toBe('t3.micro');
            expect(parameter.AllowedValues).toEqual(['t3.micro', 't3.small']);
            expect(parameter.Description).toBe('EC2 instance type');
        });

        it('should create Mapping entities correctly', () => {
            const content = JSON.stringify({
                Mappings: {
                    RegionMap: {
                        'us-east-1': {
                            AMI: 'ami-12345',
                            InstanceType: 't3.micro',
                        },
                        'us-west-2': {
                            AMI: 'ami-67890',
                            InstanceType: 't3.small',
                        },
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const mappings = fileContext.getEntitiesFromSection(TopLevelSection.Mappings);

            expect(mappings).toHaveLength(1);
            const mapping = mappings[0] as Mapping;
            expect(mapping).toBeInstanceOf(Mapping);
            expect(mapping.name).toBe('RegionMap');
            expect(mapping.getTopLevelKeys()).toEqual(['us-east-1', 'us-west-2']);
            expect(mapping.getSecondLevelKeys('us-east-1')).toEqual(['AMI', 'InstanceType']);
            expect(mapping.getValue('us-east-1', 'AMI')).toBe('ami-12345');
        });

        it('should create Condition entities correctly', () => {
            const content = JSON.stringify({
                Conditions: {
                    IsProd: {
                        'Fn::Equals': [{ Ref: 'Environment' }, 'prod'],
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const conditions = fileContext.getEntitiesFromSection(TopLevelSection.Conditions);

            expect(conditions).toHaveLength(1);
            const condition = conditions[0] as Condition;
            expect(condition).toBeInstanceOf(Condition);
            expect(condition.name).toBe('IsProd');
            expect(condition.value).toBeDefined();
        });

        it('should create Output entities correctly', () => {
            const content = JSON.stringify({
                Outputs: {
                    BucketName: {
                        Value: { Ref: 'MyBucket' },
                        Description: 'Name of the S3 bucket',
                        Export: {
                            Name: { 'Fn::Sub': '${AWS::StackName}-BucketName' },
                        },
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const outputs = fileContext.getEntitiesFromSection(TopLevelSection.Outputs);

            expect(outputs).toHaveLength(1);
            const output = outputs[0] as Output;
            expect(output).toBeInstanceOf(Output);
            expect(output.name).toBe('BucketName');
            expect(output.Description).toBe('Name of the S3 bucket');
            expect(output.Export).toBeDefined();
        });

        it('should create Transform entity correctly', () => {
            const content = JSON.stringify({
                Transform: 'AWS::Serverless-2016-10-31',
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const transforms = fileContext.getEntitiesFromSection(TopLevelSection.Transform);

            expect(transforms).toHaveLength(1);
            const transform = transforms[0] as Transform;
            expect(transform).toBeInstanceOf(Transform);
            expect(transform.value).toBe('AWS::Serverless-2016-10-31');
        });

        it('should create Rule entities correctly', () => {
            const content = JSON.stringify({
                Rules: {
                    TestRule: {
                        RuleCondition: {
                            'Fn::Equals': [{ Ref: 'Environment' }, 'test'],
                        },
                        Assertions: [
                            {
                                Assert: { 'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'Password' }, ''] }] },
                                AssertDescription: 'Password cannot be empty',
                            },
                        ],
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const rules = fileContext.getEntitiesFromSection(TopLevelSection.Rules);

            expect(rules).toHaveLength(1);
            const rule = rules[0] as Rule;
            expect(rule).toBeInstanceOf(Rule);
            expect(rule.name).toBe('TestRule');
            expect(rule.RuleCondition).toBeDefined();
            expect(rule.Assertions).toBeDefined();
            expect(rule.Assertions).toHaveLength(1);
        });

        it('should create Metadata entities correctly', () => {
            const content = JSON.stringify({
                Metadata: {
                    CustomData: {
                        Author: 'Test User',
                        Version: '1.0.0',
                        Tags: ['test', 'example'],
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const metadata = fileContext.getEntitiesFromSection(TopLevelSection.Metadata);

            expect(metadata).toHaveLength(1);
            const metadataEntity = metadata[0] as Metadata;
            expect(metadataEntity).toBeInstanceOf(Metadata);
            expect(metadataEntity.name).toBe('CustomData');
            expect(metadataEntity.value).toBeDefined();
        });
    });

    describe('Value Normalization', () => {
        it('should normalize string booleans to actual booleans', () => {
            const content = JSON.stringify({
                Parameters: {
                    EnableFeature: {
                        Type: 'String',
                        Default: 'true',
                    },
                    DisableFeature: {
                        Type: 'String',
                        Default: 'false',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);

            const enableParam = parameters.find((p) => p.name === 'EnableFeature') as Parameter;
            const disableParam = parameters.find((p) => p.name === 'DisableFeature') as Parameter;

            expect(enableParam.Default).toBe(true);
            expect(disableParam.Default).toBe(false);
        });

        it('should normalize string numbers to actual numbers', () => {
            const content = JSON.stringify({
                Parameters: {
                    Port: {
                        Type: 'Number',
                        Default: '8080',
                    },
                    FloatValue: {
                        Type: 'Number',
                        Default: '3.14',
                    },
                    NegativeNumber: {
                        Type: 'Number',
                        Default: '-42',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);

            const portParam = parameters.find((p) => p.name === 'Port') as Parameter;
            const floatParam = parameters.find((p) => p.name === 'FloatValue') as Parameter;
            const negativeParam = parameters.find((p) => p.name === 'NegativeNumber') as Parameter;

            expect(portParam.Default).toBe(8080);
            expect(floatParam.Default).toBe(3.14);
            expect(negativeParam.Default).toBe(-42);
        });

        it('should normalize string null values to actual null', () => {
            const content = JSON.stringify({
                Resources: {
                    TestResource: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            NullValue: 'null',
                            TildeValue: '~',
                            EmptyValue: '',
                        },
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            const resource = resources[0] as Resource;
            const properties = resource.Properties as Record<string, unknown>;

            expect(properties.NullValue).toBe(null);
            expect(properties.TildeValue).toBe('~');
            expect(properties.EmptyValue).toBe('');
        });

        it('should normalize nested objects and arrays', () => {
            const content = JSON.stringify({
                Resources: {
                    TestResource: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            NestedObject: {
                                BoolValue: 'true',
                                NumberValue: '42',
                                NullValue: 'null',
                            },
                            ArrayValue: ['true', '123', 'null', 'regular-string'],
                        },
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            const resource = resources[0] as Resource;
            const properties = resource.Properties as Record<string, unknown>;
            const nestedObject = properties.NestedObject as Record<string, unknown>;
            const arrayValue = properties.ArrayValue as unknown[];

            expect(nestedObject.BoolValue).toBe(true);
            expect(nestedObject.NumberValue).toBe(42);
            expect(nestedObject.NullValue).toBe(null);

            expect(arrayValue[0]).toBe(true);
            expect(arrayValue[1]).toBe(123);
            expect(arrayValue[2]).toBe(null);
            expect(arrayValue[3]).toBe('regular-string');
        });

        it('should preserve non-normalizable values', () => {
            const content = JSON.stringify({
                Parameters: {
                    RegularString: {
                        Type: 'String',
                        Default: 'just-a-string',
                    },
                    NumberString: {
                        Type: 'String',
                        Default: '123abc', // Not a pure number
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);

            const regularParam = parameters.find((p) => p.name === 'RegularString') as Parameter;
            const numberStringParam = parameters.find((p) => p.name === 'NumberString') as Parameter;

            expect(regularParam.Default).toBe('just-a-string');
            expect(numberStringParam.Default).toBe('123abc');
        });
    });

    describe('Public Methods', () => {
        const sampleContent = JSON.stringify({
            Parameters: {
                Environment: { Type: 'String' },
            },
            Resources: {
                Bucket1: { Type: 'AWS::S3::Bucket' },
                Bucket2: { Type: 'AWS::S3::Bucket' },
            },
            Outputs: {
                BucketName: { Value: { Ref: 'Bucket1' } },
            },
        });

        let fileContext: FileContext;

        beforeEach(() => {
            fileContext = new FileContext('file://test.json', DocumentType.JSON, sampleContent);
        });

        describe('getEntitiesFromSection', () => {
            it('should return entities from a single section', () => {
                const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

                expect(resources).toHaveLength(2);
                expect(resources[0].name).toBe('Bucket1');
                expect(resources[1].name).toBe('Bucket2');
                expect(resources.every((r) => r instanceof Resource)).toBe(true);
            });

            it('should return empty array for non-existent section', () => {
                const conditions = fileContext.getEntitiesFromSection(TopLevelSection.Conditions);

                expect(conditions).toEqual([]);
            });
        });

        describe('getEntitiesFromSections', () => {
            it('should return entities from multiple sections', () => {
                const sectionsMap = fileContext.getEntitiesFromSections(
                    TopLevelSection.Parameters,
                    TopLevelSection.Resources,
                    TopLevelSection.Outputs,
                );

                expect(sectionsMap.size).toBe(3);
                expect(sectionsMap.get(TopLevelSection.Parameters)).toHaveLength(1);
                expect(sectionsMap.get(TopLevelSection.Resources)).toHaveLength(2);
                expect(sectionsMap.get(TopLevelSection.Outputs)).toHaveLength(1);
            });

            it('should include empty arrays for non-existent sections', () => {
                const sectionsMap = fileContext.getEntitiesFromSections(
                    TopLevelSection.Resources,
                    TopLevelSection.Conditions,
                );

                expect(sectionsMap.size).toBe(2);
                expect(sectionsMap.get(TopLevelSection.Resources)).toHaveLength(2);
                expect(sectionsMap.get(TopLevelSection.Conditions)).toEqual([]);
            });
        });

        describe('hasSection', () => {
            it('should return true for existing sections', () => {
                expect(fileContext.hasSection(TopLevelSection.Parameters)).toBe(true);
                expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
                expect(fileContext.hasSection(TopLevelSection.Outputs)).toBe(true);
            });

            it('should return false for non-existing sections', () => {
                expect(fileContext.hasSection(TopLevelSection.Conditions)).toBe(false);
                expect(fileContext.hasSection(TopLevelSection.Mappings)).toBe(false);
            });
        });

        describe('getTopLevelSections', () => {
            it('should return all sections with their entities', () => {
                const allSections = fileContext.getTopLevelSections();

                expect(allSections.size).toBe(3);
                expect(allSections.has(TopLevelSection.Parameters)).toBe(true);
                expect(allSections.has(TopLevelSection.Resources)).toBe(true);
                expect(allSections.has(TopLevelSection.Outputs)).toBe(true);

                expect(allSections.get(TopLevelSection.Parameters)).toHaveLength(1);
                expect(allSections.get(TopLevelSection.Resources)).toHaveLength(2);
                expect(allSections.get(TopLevelSection.Outputs)).toHaveLength(1);
            });

            it('should not include sections that do not exist', () => {
                const allSections = fileContext.getTopLevelSections();

                expect(allSections.has(TopLevelSection.Conditions)).toBe(false);
                expect(allSections.has(TopLevelSection.Mappings)).toBe(false);
            });
        });

        describe('getTopLevelSectionNames', () => {
            it('should return names of all existing sections', () => {
                const sectionNames = fileContext.getTopLevelSectionNames();

                expect(sectionNames).toHaveLength(3);
                expect(sectionNames).toContain(TopLevelSection.Parameters);
                expect(sectionNames).toContain(TopLevelSection.Resources);
                expect(sectionNames).toContain(TopLevelSection.Outputs);
            });

            it('should not include non-existing sections', () => {
                const sectionNames = fileContext.getTopLevelSectionNames();

                expect(sectionNames).not.toContain(TopLevelSection.Conditions);
                expect(sectionNames).not.toContain(TopLevelSection.Mappings);
            });
        });
    });

    describe('Caching Behavior', () => {
        it('should cache parsed section data', () => {
            const content = JSON.stringify({
                Resources: {
                    Bucket: { Type: 'AWS::S3::Bucket' },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);

            // First access should parse and cache
            const resources1 = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            // Second access should use cache (same reference)
            const resources2 = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            expect(resources1).toBe(resources2); // Same reference indicates caching
        });

        it('should cache entity creation', () => {
            const content = JSON.stringify({
                Resources: {
                    Bucket: { Type: 'AWS::S3::Bucket' },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);

            const resources1 = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            const resources2 = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            // Should return the same cached entities
            expect(resources1[0]).toBe(resources2[0]);
        });

        it('should handle repeated method calls efficiently', () => {
            const content = JSON.stringify({
                Parameters: { Env: { Type: 'String' } },
                Resources: { Bucket: { Type: 'AWS::S3::Bucket' } },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);

            // Multiple calls should be consistent
            for (let i = 0; i < 5; i++) {
                expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
                expect(fileContext.hasSection(TopLevelSection.Conditions)).toBe(false);
                expect(fileContext.getTopLevelSectionNames()).toHaveLength(2);
            }
        });
    });

    describe('Error Handling', () => {
        it('should handle completely invalid JSON', () => {
            const invalidJson = 'this is not json at all';

            const fileContext = new FileContext('file://invalid.json', DocumentType.JSON, invalidJson);

            expect(fileContext.getTopLevelSectionNames()).toEqual([]);
            expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(false);
            expect(fileContext.getEntitiesFromSection(TopLevelSection.Resources)).toEqual([]);
        });

        it('should handle completely invalid YAML', () => {
            const invalidYaml = `
this is not valid yaml
  - because: of
    - improper: nesting
      and: structure
`;

            const fileContext = new FileContext('file://invalid.yaml', DocumentType.YAML, invalidYaml);

            expect(fileContext.getTopLevelSectionNames()).toEqual([]);
            expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(false);
        });

        it('should handle null and undefined values gracefully', () => {
            const content = JSON.stringify({
                Resources: {
                    TestResource: {
                        Type: 'AWS::S3::Bucket',
                        Properties: null,
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            expect(resources).toHaveLength(1);
            expect(resources[0].name).toBe('TestResource');
        });

        it('should handle sections with invalid data types', () => {
            const content = JSON.stringify({
                Resources: 'not an object',
                Parameters: ['not', 'an', 'object'],
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);

            expect(fileContext.getEntitiesFromSection(TopLevelSection.Resources)).toEqual([]);

            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);
            expect(parameters.length).toBeGreaterThan(0);
            expect(parameters.every((p) => p instanceof Parameter)).toBe(true);
        });
    });

    describe('Edge Cases and Integration Tests', () => {
        it('should work with real CloudFormation template examples', () => {
            const fileContext = new FileContext(
                Templates.sample.yaml.fileName,
                DocumentType.YAML,
                Templates.sample.yaml.contents,
            );

            expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
            expect(fileContext.hasSection(TopLevelSection.Parameters)).toBe(true);

            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            expect(resources.length).toBeGreaterThan(0);
            expect(resources.every((r) => r instanceof Resource)).toBe(true);
        });

        it('should handle comprehensive templates with all sections', () => {
            const fileContext = new FileContext(
                Templates.comprehensive.yaml.fileName,
                DocumentType.YAML,
                Templates.comprehensive.yaml.contents,
            );

            const allSections = fileContext.getTopLevelSections();
            expect(allSections.size).toBeGreaterThan(0);

            // Should have multiple section types
            const sectionNames = fileContext.getTopLevelSectionNames();
            expect(sectionNames.length).toBeGreaterThan(1);
        });

        it('should handle broken templates gracefully', () => {
            const fileContext = new FileContext(
                Templates.broken.yaml.fileName,
                DocumentType.YAML,
                Templates.broken.yaml.contents,
            );

            // Should not throw errors, even with broken templates
            expect(() => {
                fileContext.getTopLevelSectionNames();
                fileContext.hasSection(TopLevelSection.Resources);
                fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            }).not.toThrow();
        });

        it('should handle minimal templates', () => {
            const minimalContent = JSON.stringify({
                Resources: {
                    MinimalBucket: {
                        Type: 'AWS::S3::Bucket',
                    },
                },
            });

            const fileContext = new FileContext('file://minimal.json', DocumentType.JSON, minimalContent);

            expect(fileContext.getTopLevelSectionNames()).toEqual([TopLevelSection.Resources]);
            expect(fileContext.getEntitiesFromSection(TopLevelSection.Resources)).toHaveLength(1);
        });

        it('should handle large templates efficiently', () => {
            // Create a large template with many resources
            const largeTemplate: Record<string, unknown> = {
                AWSTemplateFormatVersion: '2010-09-09',
                Resources: {},
            };

            // Add 100 resources
            for (let i = 0; i < 100; i++) {
                (largeTemplate.Resources as Record<string, unknown>)[`Bucket${i}`] = {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        BucketName: `test-bucket-${i}`,
                    },
                };
            }

            const content = JSON.stringify(largeTemplate);
            const fileContext = new FileContext('file://large.json', DocumentType.JSON, content);

            const startTime = Date.now();
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
            const endTime = Date.now();

            expect(resources).toHaveLength(100);
            expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
        });

        it('should handle Transform section with array values', () => {
            const content = JSON.stringify({
                Transform: ['AWS::Serverless-2016-10-31', 'AWS::CodeStar'],
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const transforms = fileContext.getEntitiesFromSection(TopLevelSection.Transform);

            expect(transforms).toHaveLength(1);
            const transform = transforms[0] as Transform;
            expect(transform.value).toEqual(['AWS::Serverless-2016-10-31', 'AWS::CodeStar']);
        });

        it('should handle complex DependsOn arrays', () => {
            const content = JSON.stringify({
                Resources: {
                    ComplexResource: {
                        Type: 'AWS::S3::Bucket',
                        DependsOn: ['Resource1', 'Resource2', 'Resource3'],
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const resources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);

            const resource = resources[0] as Resource;
            expect(resource.DependsOn).toEqual(['Resource1', 'Resource2', 'Resource3']);
        });

        it('should handle whitespace in string values during normalization', () => {
            const content = JSON.stringify({
                Parameters: {
                    TrimmedTrue: {
                        Type: 'String',
                        Default: '  true  ',
                    },
                    TrimmedNumber: {
                        Type: 'String',
                        Default: '  42  ',
                    },
                    TrimmedNull: {
                        Type: 'String',
                        Default: '  null  ',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);
            const parameters = fileContext.getEntitiesFromSection(TopLevelSection.Parameters);

            const trueParam = parameters.find((p) => p.name === 'TrimmedTrue') as Parameter;
            const numberParam = parameters.find((p) => p.name === 'TrimmedNumber') as Parameter;
            const nullParam = parameters.find((p) => p.name === 'TrimmedNull') as Parameter;

            expect(trueParam.Default).toBe(true);
            expect(numberParam.Default).toBe(42);
            expect(nullParam.Default).toBe('  null  ');
        });
    });

    describe('SectionInfo Type Compatibility', () => {
        it('should provide section info compatible with SectionInfo type', () => {
            const content = JSON.stringify({
                Resources: {
                    TestBucket: {
                        Type: 'AWS::S3::Bucket',
                    },
                },
            });

            const fileContext = new FileContext('file://test.json', DocumentType.JSON, content);

            // Test that we can create SectionInfo-like objects
            const section = TopLevelSection.Resources;
            const entities = fileContext.getEntitiesFromSection(section);

            // This simulates how SectionInfo might be used
            const sectionInfo = {
                section,
                data: { TestBucket: { Type: 'AWS::S3::Bucket' } },
                entities,
            };

            expect(sectionInfo.section).toBe(TopLevelSection.Resources);
            expect(sectionInfo.entities).toHaveLength(1);
            expect(sectionInfo.entities[0]).toBeInstanceOf(Resource);
        });
    });

    describe('getEntityBySection', () => {
        const sampleContent = JSON.stringify({
            Parameters: {
                Environment: {
                    Type: 'String',
                    Default: 'dev',
                    Description: 'Environment name for deployment',
                    AllowedValues: ['dev', 'staging', 'prod'],
                    ConstraintDescription: 'Must be one of dev, staging, or prod',
                },
                InstanceType: {
                    Type: 'String',
                    Default: 't3.micro',
                    AllowedValues: ['t3.micro', 't3.small', 't3.medium'],
                    Description: 'EC2 instance type',
                    ConstraintDescription: 'Must be a valid EC2 instance type',
                },
                DatabasePassword: {
                    Type: 'String',
                    NoEcho: true,
                    MinLength: 8,
                    MaxLength: 32,
                    AllowedPattern: '^[a-zA-Z0-9]*$',
                    Description: 'Database password',
                    ConstraintDescription: 'Must be 8-32 alphanumeric characters',
                },
                Port: {
                    Type: 'Number',
                    Default: 8080,
                    MinValue: 1024,
                    MaxValue: 65535,
                    Description: 'Application port number',
                },
            },
            Resources: {
                MyBucket: {
                    Type: 'AWS::S3::Bucket',
                    Properties: {
                        BucketName: { 'Fn::Sub': '${AWS::StackName}-test-bucket' },
                        VersioningConfiguration: {
                            Status: 'Enabled',
                        },
                        PublicAccessBlockConfiguration: {
                            BlockPublicAcls: true,
                            BlockPublicPolicy: true,
                            IgnorePublicAcls: true,
                            RestrictPublicBuckets: true,
                        },
                    },
                    DependsOn: ['MyRole'],
                    Condition: 'CreateBucket',
                    Metadata: {
                        Purpose: 'Application storage',
                        Owner: 'DevOps Team',
                        CostCenter: 'Engineering',
                    },
                    DeletionPolicy: 'Retain',
                    UpdateReplacePolicy: 'Retain',
                },
                MyRole: {
                    Type: 'AWS::IAM::Role',
                    Properties: {
                        RoleName: { 'Fn::Sub': '${AWS::StackName}-execution-role' },
                        AssumeRolePolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: {
                                        Service: 'lambda.amazonaws.com',
                                    },
                                    Action: 'sts:AssumeRole',
                                },
                            ],
                        },
                        ManagedPolicyArns: ['arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole'],
                    },
                    Metadata: {
                        Description: 'Execution role for Lambda functions',
                        Team: 'Backend',
                    },
                    CreationPolicy: {
                        ResourceSignal: {
                            Count: 1,
                            Timeout: 'PT10M',
                        },
                    },
                    UpdatePolicy: {
                        AutoScalingRollingUpdate: {
                            MinInstancesInService: 1,
                            MaxBatchSize: 1,
                        },
                    },
                },
                DatabaseInstance: {
                    Type: 'AWS::RDS::DBInstance',
                    Properties: {
                        DBInstanceIdentifier: { 'Fn::Sub': '${AWS::StackName}-database' },
                        DBInstanceClass: { Ref: 'InstanceType' },
                        Engine: 'mysql',
                        MasterUsername: 'admin',
                        MasterUserPassword: { Ref: 'DatabasePassword' },
                        AllocatedStorage: 20,
                        StorageType: 'gp2',
                        VPCSecurityGroups: [{ Ref: 'DatabaseSecurityGroup' }],
                    },
                    DependsOn: ['DatabaseSecurityGroup', 'MyRole'],
                    Condition: 'CreateDatabase',
                    DeletionPolicy: 'Snapshot',
                    UpdateReplacePolicy: 'Snapshot',
                },
            },
            Outputs: {
                BucketName: {
                    Value: { Ref: 'MyBucket' },
                    Description: 'Name of the S3 bucket for application storage',
                    Export: {
                        Name: { 'Fn::Sub': '${AWS::StackName}-BucketName' },
                    },
                    Condition: 'CreateBucket',
                },
                RoleArn: {
                    Value: { 'Fn::GetAtt': ['MyRole', 'Arn'] },
                    Description: 'ARN of the execution role',
                    Export: {
                        Name: { 'Fn::Sub': '${AWS::StackName}-RoleArn' },
                    },
                },
                DatabaseEndpoint: {
                    Value: { 'Fn::GetAtt': ['DatabaseInstance', 'Endpoint.Address'] },
                    Description: 'Database connection endpoint',
                    Condition: 'CreateDatabase',
                },
            },
            Conditions: {
                IsProd: {
                    'Fn::Equals': [{ Ref: 'Environment' }, 'prod'],
                },
                CreateBucket: {
                    'Fn::Or': [
                        { 'Fn::Equals': [{ Ref: 'Environment' }, 'staging'] },
                        { 'Fn::Equals': [{ Ref: 'Environment' }, 'prod'] },
                    ],
                },
                CreateDatabase: {
                    'Fn::And': [
                        { Condition: 'IsProd' },
                        { 'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'DatabasePassword' }, ''] }] },
                    ],
                },
            },
            Mappings: {
                RegionMap: {
                    'us-east-1': {
                        AMI: 'ami-12345',
                        InstanceType: 't3.micro',
                        AvailabilityZone: 'us-east-1a',
                    },
                    'us-west-2': {
                        AMI: 'ami-87654321',
                        InstanceType: 't3.small',
                        AvailabilityZone: 'us-west-2a',
                    },
                    'eu-west-1': {
                        AMI: 'ami-abcdef12',
                        InstanceType: 't3.medium',
                        AvailabilityZone: 'eu-west-1a',
                    },
                },
                EnvironmentConfig: {
                    dev: {
                        DatabaseSize: 'db.t3.micro',
                        StorageSize: '20',
                        BackupRetention: '1',
                    },
                    staging: {
                        DatabaseSize: 'db.t3.small',
                        StorageSize: '50',
                        BackupRetention: '7',
                    },
                    prod: {
                        DatabaseSize: 'db.t3.medium',
                        StorageSize: '100',
                        BackupRetention: '30',
                    },
                },
            },
            Transform: ['AWS::Serverless-2016-10-31', 'AWS::CodeStar'],
            Rules: {
                ValidateInstanceType: {
                    RuleCondition: {
                        'Fn::Equals': [{ Ref: 'Environment' }, 'prod'],
                    },
                    Assertions: [
                        {
                            Assert: {
                                'Fn::Contains': [['t3.medium', 't3.large', 't3.xlarge'], { Ref: 'InstanceType' }],
                            },
                            AssertDescription: 'Production environment requires larger instance types',
                        },
                        {
                            Assert: {
                                'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'DatabasePassword' }, ''] }],
                            },
                            AssertDescription: 'Database password is required for production',
                        },
                    ],
                },
                ValidatePassword: {
                    Assertions: [
                        {
                            Assert: {
                                'Fn::And': [
                                    { 'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'DatabasePassword' }, ''] }] },
                                    {
                                        'Fn::Not': [{ 'Fn::Equals': [{ Ref: 'DatabasePassword' }, 'password'] }],
                                    },
                                ],
                            },
                            AssertDescription: 'Database password must not be empty or default value',
                        },
                    ],
                },
            },
            Metadata: {
                TemplateInfo: {
                    Author: 'DevOps Team',
                    Version: '2.1.0',
                    Description: 'Comprehensive CloudFormation template for web application',
                    LastModified: '2024-01-15',
                    Tags: ['web-app', 'infrastructure', 'production-ready'],
                },
                AWS: {
                    CloudFormationInterface: {
                        ParameterGroups: [
                            {
                                Label: { default: 'Environment Configuration' },
                                Parameters: ['Environment', 'InstanceType'],
                            },
                            {
                                Label: { default: 'Database Configuration' },
                                Parameters: ['DatabasePassword', 'Port'],
                            },
                        ],
                        ParameterLabels: {
                            Environment: { default: 'Deployment Environment' },
                            InstanceType: { default: 'EC2 Instance Type' },
                            DatabasePassword: { default: 'Database Password' },
                            Port: { default: 'Application Port' },
                        },
                    },
                },
            },
        });

        let fileContext: FileContext;

        beforeEach(() => {
            fileContext = new FileContext('file://test.json', DocumentType.JSON, sampleContent);
        });

        describe('Valid Section and Logical ID', () => {
            it('should retrieve Resource entities by section and logical ID', () => {
                const bucketEntity = fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');
                const roleEntity = fileContext.getEntityBySection(TopLevelSection.Resources, 'MyRole');
                const databaseEntity = fileContext.getEntityBySection(TopLevelSection.Resources, 'DatabaseInstance');

                const expectedBucket = new Resource(
                    'MyBucket',
                    'AWS::S3::Bucket',
                    {
                        BucketName: { 'Fn::Sub': '${AWS::StackName}-test-bucket' },
                        VersioningConfiguration: {
                            Status: 'Enabled',
                        } as Record<string, unknown>,
                        PublicAccessBlockConfiguration: {
                            BlockPublicAcls: true,
                            BlockPublicPolicy: true,
                            IgnorePublicAcls: true,
                            RestrictPublicBuckets: true,
                        } as Record<string, unknown>,
                    } as unknown as Record<string, CfnValue>,
                    ['MyRole'],
                    'CreateBucket',
                    {
                        Purpose: 'Application storage',
                        Owner: 'DevOps Team',
                        CostCenter: 'Engineering',
                    },
                    undefined,
                    'Retain',
                    undefined,
                    'Retain',
                );

                const expectedRole = new Resource(
                    'MyRole',
                    'AWS::IAM::Role',
                    {
                        RoleName: { 'Fn::Sub': '${AWS::StackName}-execution-role' },
                        AssumeRolePolicyDocument: {
                            Version: '2012-10-17',
                            Statement: [
                                {
                                    Effect: 'Allow',
                                    Principal: {
                                        Service: 'lambda.amazonaws.com',
                                    },
                                    Action: 'sts:AssumeRole',
                                },
                            ],
                        } as Record<string, unknown>,
                        ManagedPolicyArns: [
                            'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
                        ] as unknown[],
                    } as unknown as Record<string, CfnValue>,
                    undefined,
                    undefined,
                    {
                        Description: 'Execution role for Lambda functions',
                        Team: 'Backend',
                    },
                    {
                        ResourceSignal: {
                            Count: 1,
                            Timeout: 'PT10M',
                        },
                    } as Record<string, unknown>,
                    undefined,
                    {
                        AutoScalingRollingUpdate: {
                            MinInstancesInService: 1,
                            MaxBatchSize: 1,
                        },
                    } as Record<string, unknown>,
                    undefined,
                );

                const expectedDatabase = new Resource(
                    'DatabaseInstance',
                    'AWS::RDS::DBInstance',
                    {
                        DBInstanceIdentifier: { 'Fn::Sub': '${AWS::StackName}-database' },
                        DBInstanceClass: { Ref: 'InstanceType' },
                        Engine: 'mysql',
                        MasterUsername: 'admin',
                        MasterUserPassword: { Ref: 'DatabasePassword' },
                        AllocatedStorage: 20,
                        StorageType: 'gp2',
                        VPCSecurityGroups: [{ Ref: 'DatabaseSecurityGroup' }] as unknown[],
                    } as unknown as Record<string, CfnValue>,
                    ['DatabaseSecurityGroup', 'MyRole'],
                    'CreateDatabase',
                    undefined,
                    undefined,
                    'Snapshot',
                    undefined,
                    'Snapshot',
                );

                expect(bucketEntity).toEqual(expectedBucket);
                expect(roleEntity).toEqual(expectedRole);
                expect(databaseEntity).toEqual(expectedDatabase);
            });

            it('should retrieve Parameter entities by section and logical ID', () => {
                const envEntity = fileContext.getEntityBySection(TopLevelSection.Parameters, 'Environment');
                const instanceEntity = fileContext.getEntityBySection(TopLevelSection.Parameters, 'InstanceType');

                const expectedEnv = new Parameter(
                    'Environment',
                    ParameterType.String,
                    'dev',
                    undefined,
                    ['dev', 'staging', 'prod'],
                    'Must be one of dev, staging, or prod',
                    'Environment name for deployment',
                );
                const expectedInstance = new Parameter(
                    'InstanceType',
                    ParameterType.String,
                    't3.micro',
                    undefined,
                    ['t3.micro', 't3.small', 't3.medium'],
                    'Must be a valid EC2 instance type',
                    'EC2 instance type',
                );

                expect(envEntity).toEqual(expectedEnv);
                expect(instanceEntity).toEqual(expectedInstance);
            });

            it('should retrieve Output entities by section and logical ID', () => {
                const outputEntity = fileContext.getEntityBySection(TopLevelSection.Outputs, 'BucketName');

                const expectedOutput = new Output(
                    'BucketName',
                    { Ref: 'MyBucket' },
                    'Name of the S3 bucket for application storage',
                    { Name: { 'Fn::Sub': '${AWS::StackName}-BucketName' } },
                    'CreateBucket',
                );

                expect(outputEntity).toEqual(expectedOutput);
            });

            it('should retrieve Condition entities by section and logical ID', () => {
                const conditionEntity = fileContext.getEntityBySection(TopLevelSection.Conditions, 'IsProd');

                const expectedCondition = new Condition('IsProd', { 'Fn::Equals': [{ Ref: 'Environment' }, 'prod'] });

                expect(conditionEntity).toEqual(expectedCondition);
            });

            it('should retrieve Mapping entities by section and logical ID', () => {
                const mappingEntity = fileContext.getEntityBySection(TopLevelSection.Mappings, 'RegionMap');

                const expectedMapping = new Mapping('RegionMap', {
                    'us-east-1': {
                        AMI: 'ami-12345',
                        InstanceType: 't3.micro',
                        AvailabilityZone: 'us-east-1a',
                    },
                    'us-west-2': {
                        AMI: 'ami-87654321',
                        InstanceType: 't3.small',
                        AvailabilityZone: 'us-west-2a',
                    },
                    'eu-west-1': {
                        AMI: 'ami-abcdef12',
                        InstanceType: 't3.medium',
                        AvailabilityZone: 'eu-west-1a',
                    },
                });

                expect(mappingEntity).toEqual(expectedMapping);
            });

            it('should retrieve Transform entity by section', () => {
                const transformEntity = fileContext.getEntityBySection(TopLevelSection.Transform, 0);

                const expectedTransform = new Transform(['AWS::Serverless-2016-10-31', 'AWS::CodeStar']);

                expect(transformEntity).toEqual(expectedTransform);
            });

            it('should return undefined for Transform entity at index 1 when only one exists', () => {
                const transformEntity = fileContext.getEntityBySection(TopLevelSection.Transform, 1);

                expect(transformEntity).toBeUndefined();
            });
        });

        describe('Invalid Section and Logical ID', () => {
            it('should return undefined for non-existent section', () => {
                const entity = fileContext.getEntityBySection(TopLevelSection.Rules, 'NonExistentRule');

                expect(entity).toBeUndefined();
            });

            it('should return undefined for non-existent entity in existing section', () => {
                const entity = fileContext.getEntityBySection(TopLevelSection.Resources, 'NonExistentBucket');

                expect(entity).toBeUndefined();
            });
        });

        describe('Edge Cases', () => {
            it('should work with YAML documents', () => {
                const yamlContent = `
Parameters:
  Environment:
    Type: String
    Default: dev
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket
`;

                const yamlFileContext = new FileContext('file://test.yaml', DocumentType.YAML, yamlContent);

                const paramEntity = yamlFileContext.getEntityBySection(TopLevelSection.Parameters, 'Environment');
                const resourceEntity = yamlFileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');

                const expectedParam = new Parameter('Environment', ParameterType.String, 'dev');
                const expectedResource = new Resource('MyBucket', 'AWS::S3::Bucket', { BucketName: 'test-bucket' });

                expect(paramEntity).toEqual(expectedParam);
                expect(resourceEntity).toEqual(expectedResource);
            });

            it('should handle case-sensitive entity names', () => {
                const content = JSON.stringify({
                    Resources: {
                        MyBucket: { Type: 'AWS::S3::Bucket' },
                        mybucket: { Type: 'AWS::S3::Bucket' },
                    },
                });

                const caseFileContext = new FileContext('file://case.json', DocumentType.JSON, content);

                const upperEntity = caseFileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');
                const lowerEntity = caseFileContext.getEntityBySection(TopLevelSection.Resources, 'mybucket');

                const expectedUpper = new Resource('MyBucket', 'AWS::S3::Bucket');
                const expectedLower = new Resource('mybucket', 'AWS::S3::Bucket');

                expect(upperEntity).toEqual(expectedUpper);
                expect(lowerEntity).toEqual(expectedLower);
            });

            it('should work with empty sections', () => {
                const emptyContent = JSON.stringify({
                    Resources: {},
                    Parameters: {},
                });

                const emptyFileContext = new FileContext('file://empty.json', DocumentType.JSON, emptyContent);

                const entity = emptyFileContext.getEntityBySection(TopLevelSection.Resources, 'NonExistent');

                expect(entity).toBeUndefined();
            });

            it('should handle malformed documents gracefully', () => {
                const malformedContent = '{"Resources": "not an object"}';

                const malformedFileContext = new FileContext(
                    'file://malformed.json',
                    DocumentType.JSON,
                    malformedContent,
                );

                const entity = malformedFileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');

                expect(entity).toBeUndefined();
            });
        });

        describe('Performance and Caching', () => {
            it('should use cached entities for repeated calls', () => {
                const entity1 = fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');
                const entity2 = fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');

                // Should return the same cached entity instance
                expect(entity1).toBe(entity2);
            });

            it('should handle multiple different entity retrievals efficiently', () => {
                const startTime = Date.now();

                // Retrieve multiple entities
                const entities = [
                    fileContext.getEntityBySection(TopLevelSection.Parameters, 'Environment'),
                    fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket'),
                    fileContext.getEntityBySection(TopLevelSection.Resources, 'MyRole'),
                    fileContext.getEntityBySection(TopLevelSection.Outputs, 'BucketName'),
                    fileContext.getEntityBySection(TopLevelSection.Conditions, 'IsProd'),
                ];

                const endTime = Date.now();

                // All entities should be found
                expect(entities.every((entity) => entity !== undefined)).toBe(true);

                // Should complete quickly (within reasonable time)
                expect(endTime - startTime).toBeLessThan(100);
            });
        });

        describe('Integration with Existing Methods', () => {
            it('should return the same entity as getEntitiesFromSection', () => {
                const allResources = fileContext.getEntitiesFromSection(TopLevelSection.Resources);
                const specificResource = fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket');

                const bucketFromSection = allResources.find((r) => r.name === 'MyBucket');

                expect(specificResource).toBe(bucketFromSection);
            });

            it('should work consistently with hasSection checks', () => {
                // Section exists
                expect(fileContext.hasSection(TopLevelSection.Resources)).toBe(true);
                expect(fileContext.getEntityBySection(TopLevelSection.Resources, 'MyBucket')).toBeDefined();
                expect(fileContext.hasSection(TopLevelSection.Rules)).toBe(true);
                expect(fileContext.getEntityBySection(TopLevelSection.Rules, 'ValidateInstanceType')).toBeDefined();

                expect(fileContext.hasSection(TopLevelSection.Transform)).toBe(true);
            });
        });
    });
});
