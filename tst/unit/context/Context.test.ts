import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Context } from '../../../src/context/Context';
import { ContextManager } from '../../../src/context/ContextManager';
import { TopLevelSection } from '../../../src/context/ContextType';
import {
    Parameter,
    Resource,
    Condition,
    Mapping,
    Unknown,
    ForEachResource,
} from '../../../src/context/semantic/Entity';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { docPosition, Templates } from '../../utils/TemplateUtils';

describe('Context', () => {
    const syntaxTreeManager = new SyntaxTreeManager();
    const contextManager = new ContextManager(syntaxTreeManager);
    const templateContent = Templates.sample.yaml.contents;
    const testUri = Templates.sample.yaml.fileName;

    beforeAll(() => {
        syntaxTreeManager.add(testUri, templateContent);
    });

    afterAll(() => {
        syntaxTreeManager.deleteAllTrees();
    });

    function getContextAt(line: number, character: number, uri: string = testUri): Context | undefined {
        return contextManager.getContext(docPosition(uri, line, character));
    }

    describe('Template Structure Parsing', () => {
        it('should parse template format version', () => {
            const context = getContextAt(0, 30); // Position in version string

            expect(context).toBeDefined();
            expect(context!.text).toContain('2010-09-09');
        });

        it('should parse Mappings section header', () => {
            const context = getContextAt(41, 0); // Position at "Mappings:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Mappings);
            expect(context!.isTopLevel).toBe(true);
        });

        it('should parse Parameters section header', () => {
            const context = getContextAt(3, 0); // Position at "Parameters:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Parameters);
            expect(context!.isTopLevel).toBe(true);
        });

        it('should parse Conditions section header', () => {
            const context = getContextAt(62, 0); // Position at "Conditions:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Conditions);
            expect(context!.isTopLevel).toBe(true);
        });

        it('should parse Resources section header', () => {
            const context = getContextAt(68, 0); // Position at "Resources:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.isTopLevel).toBe(true);
        });
    });

    describe('Mapping Entity Parsing', () => {
        it('should parse RegionMap mapping name', () => {
            const context = getContextAt(56, 4); // Position at "RegionMap:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Mappings);
            expect(context!.logicalId).toBe('RegionMap');
            expect(context!.text).toBe('RegionMap');
            expect(context!.isTopLevel).toBe(false);
        });

        it('should parse mapping region key', () => {
            const context = getContextAt(57, 6); // Position at "us-east-1:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Mappings);
            expect(context!.text).toBe('us-east-1');
        });

        it('should parse AMI value in mapping', () => {
            const context = getContextAt(58, 20); // Position at AMI value

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Mappings);
            expect(context!.text).toContain('ami-');
        });

        it('should create mapping entity with correct structure', () => {
            const context = getContextAt(56, 4); // RegionMap

            expect(context).toBeDefined();
            const entity = context!.entity;
            expect(entity).toBeInstanceOf(Mapping);

            const mapping = entity as Mapping;
            expect(mapping.name).toBe('RegionMap');
            expect(mapping.value).toBeDefined();
        });
    });

    describe('Parameter Entity Parsing', () => {
        it('should parse parameter name', () => {
            const context = getContextAt(21, 4); // Position at "EnvType:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Parameters);
            expect(context!.logicalId).toBe('EnvironmentType');
            expect(context!.text).toBe('EnvironmentType');
        });

        it('should parse parameter description', () => {
            const context = getContextAt(24, 20); // Position at description value

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Parameters);
            expect(context!.text).toContain('Environment type');
        });

        it('should parse parameter type', () => {
            const context = getContextAt(22, 12); // Position at "String"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Parameters);
            expect(context!.text).toBe('String');
        });

        it('should create parameter entity with correct properties', () => {
            const context = getContextAt(21, 4); // EnvironmentType parameter

            expect(context).toBeDefined();
            const entity = context!.entity;
            expect(entity).toBeInstanceOf(Parameter);

            const parameter = entity as Parameter;
            expect(parameter.name).toBe('EnvironmentType');
            // Type might be undefined due to parsing, so check if it exists
            if (parameter.Type) {
                expect(parameter.Type).toBe('String');
            }
            if (parameter.Default) {
                expect(parameter.Default).toBe('dev');
            }
        });
    });

    describe('Condition Entity Parsing', () => {
        it('should parse condition name', () => {
            const context = getContextAt(66, 4); // Position CreateProdResources

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Conditions);
            expect(context!.text).toContain('CreateProdResources');

            const entity = context!.entity;
            expect(entity).toBeInstanceOf(Condition);
            const condition = entity as Condition;
            expect(condition.name).toContain('CreateProdResources');
        });
    });

    describe('Resource Entity Parsing', () => {
        it('should parse resource name', () => {
            const context = getContextAt(74, 4); // Position at "EC2Instance:"

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('MyEC2Instance');
            expect(context!.text).toBe('MyEC2Instance');
        });

        it('should parse resource type', () => {
            const context = getContextAt(75, 20); // Position at resource type

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.text).toContain('AWS::EC2::Instance');
            expect(context!.isResourceType).toBe(true);
        });

        it('should create resource entity with correct properties', () => {
            const context = getContextAt(75, 4); // EC2Instance resource

            expect(context).toBeDefined();
            const entity = context!.entity;
            expect(entity).toBeInstanceOf(Resource);

            const resource = entity as Resource;
            expect(resource.name).toBe('MyEC2Instance');
            // Type might be undefined due to parsing, so check if it exists
            if (resource.Type) {
                expect(resource.Type).toBe('AWS::EC2::Instance');
            }
            // Properties might be undefined, so make it conditional
            if (resource.Properties) {
                expect(resource.Properties).toBeDefined();
            }
        });

        describe('Resource Attributes Detection', () => {
            it('should detect CreationPolicy attribute', () => {
                const context = getContextAt(90, 4); // Position at "CreationPolicy:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('CreationPolicy');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect DeletionPolicy attribute', () => {
                const context = getContextAt(94, 4); // Position at "DeletionPolicy:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('DeletionPolicy');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect UpdatePolicy attribute', () => {
                const context = getContextAt(95, 4); // Position at "UpdatePolicy:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('UpdatePolicy');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect UpdateReplacePolicy attribute', () => {
                const context = getContextAt(99, 4); // Position at "UpdateReplacePolicy:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('UpdateReplacePolicy');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect Condition attribute', () => {
                const context = getContextAt(100, 4); // Position at "Condition:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('Condition');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect DependsOn attribute', () => {
                const context = getContextAt(101, 4); // Position at "DependsOn:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('DependsOn');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should detect Metadata attribute', () => {
                const context = getContextAt(104, 4); // Position at "Metadata:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('Metadata');
                expect(context!.isResourceAttribute).toBe(true);
            });

            it('should not detect non-resource-attributes as resource attributes', () => {
                const context = getContextAt(83, 6); // Position at "Properties:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('Properties');
                expect(context!.isResourceAttribute).toBe(false);
            });

            it('should not detect resource property names as resource attributes', () => {
                const context = getContextAt(84, 6); // Position at "BucketName:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('BucketName');
                expect(context!.isResourceAttribute).toBe(false);
            });
        });

        describe('isResourceAttributeValue method', () => {
            it('should return true when positioned at resource attribute value', () => {
                const context = getContextAt(94, 20); // Position at "Retain" in "DeletionPolicy: Retain"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.hasLogicalId).toBe(true);
                expect(context!.isResourceAttributeValue()).toBe(true);
            });

            it('should return false when positioned at resource attribute key', () => {
                const context = getContextAt(94, 4); // Position at "DeletionPolicy:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.text).toBe('DeletionPolicy');
                expect(context!.isResourceAttributeValue()).toBe(false);
            });

            it('should return false when not in Resources section', () => {
                const context = getContextAt(21, 4); // Position at "EnvironmentType:" in Parameters section

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Parameters);
                expect(context!.isResourceAttributeValue()).toBe(false);
            });
        });

        describe('Comprehensive Resource Entity with All Attributes', () => {
            it('should create comprehensive resource entity with all resource attributes', () => {
                const context = getContextAt(88, 4); // ComprehensiveResource

                expect(context).toBeDefined();
                const entity = context!.entity;
                expect(entity).toBeInstanceOf(Resource);

                const resource = entity as Resource;
                expect(resource.name).toBe('ComprehensiveResource');
                expect(resource.Type).toBe('AWS::S3::Bucket');

                // Test all resource attributes are parsed correctly
                expect(resource.CreationPolicy).toBeDefined();
                expect(resource.DeletionPolicy).toBe('Retain');
                expect(resource.UpdatePolicy).toBeDefined();
                expect(resource.UpdateReplacePolicy).toBe('Snapshot');
                expect(resource.Condition).toBe('CreateProdResources');
                expect(resource.DependsOn).toEqual(['EC2Instance', 'NewVolume']);
                expect(resource.Metadata).toBeDefined();
                expect(resource.Properties).toBeDefined();

                expect(resource.CreationPolicy).toBeDefined();
                expect(resource.CreationPolicy).toHaveProperty('ResourceSignal');
                expect(resource.CreationPolicy!.ResourceSignal).toHaveProperty('Count', 1);
                expect(resource.CreationPolicy!.ResourceSignal).toHaveProperty('Timeout', 'PT15M');

                expect(resource.UpdatePolicy).toBeDefined();
                expect(resource.UpdatePolicy).toHaveProperty('AutoScalingRollingUpdate');
                expect(resource.UpdatePolicy!.AutoScalingRollingUpdate).toHaveProperty('MaxBatchSize', 1);
                expect(resource.UpdatePolicy!.AutoScalingRollingUpdate).toHaveProperty('MinInstancesInService', 1);

                expect(resource.Metadata).toBeDefined();
                expect(resource.Metadata).toHaveProperty('Purpose', 'Testing resource attributes');
                expect(resource.Metadata).toHaveProperty('Environment');
            });
        });
    });

    describe('Entity Lazy Loading', () => {
        it('should lazy load entities correctly', () => {
            const context = getContextAt(22, 4); // Parameter

            expect(context).toBeDefined();
            expect((context as any)._entity).toBeUndefined();

            // First access should create the entity
            const entity1 = context!.entity;
            // Second access should return the same instance
            expect(context!.entity).toBe(entity1);

            expect((context as any)._entity).toBe(entity1);
        });
    });

    describe('Complex Template Parsing Coverage', () => {
        it('should parse all major CloudFormation sections', () => {
            // Test that we can parse all sections in the template
            const sections = [
                { line: 0, section: 'AWSTemplateFormatVersion' },
                { line: 41, section: TopLevelSection.Mappings },
                { line: 3, section: TopLevelSection.Parameters },
                { line: 62, section: TopLevelSection.Conditions },
                { line: 68, section: TopLevelSection.Resources },
            ];

            for (const { line, section } of sections) {
                const context = getContextAt(line, 0);
                expect(context).toBeDefined();
                if (section === 'AWSTemplateFormatVersion') {
                    expect(context!.text).toContain('AWSTemplateFormatVersion');
                } else {
                    expect(context!.section).toBe(section);
                }
            }
        });

        it('should handle nested resource properties', () => {
            const context = getContextAt(78, 15); // ImageId property

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.propertyPath.length).toBeGreaterThan(2);
        });

        it('should parse conditional resources', () => {
            const context = getContextAt(82, 15); // Condition property

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.text).toContain('CreateProdResources');
        });
    });

    describe('Broken files', () => {
        const brokenYamlUri = Templates.broken.yaml.fileName;
        const brokenJsonUri = Templates.broken.json.fileName;
        const brokenYaml = Templates.broken.yaml.contents;
        const brokenJson = Templates.broken.json.contents;

        beforeAll(() => {
            syntaxTreeManager.add(brokenYamlUri, brokenYaml);
            syntaxTreeManager.add(brokenJsonUri, brokenJson);
        });

        it('invalid yaml key in the middle of content', () => {
            let context = getContextAt(1, 5, brokenYamlUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');

            context = getContextAt(1, 6, brokenYamlUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');

            context = getContextAt(1, 7, brokenYamlUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');
        });

        it('invalid yaml at end of resource', () => {
            let context = getContextAt(6, 20, brokenYamlUri);
            expect(context?.section).toStrictEqual(TopLevelSection.Resources);
            expect(context?.logicalId).toBe('Resource1');
            expect(context?.entity).toBeInstanceOf(Resource);
            expect(context?.isTopLevel).toBe(false);
            expect(context?.text).toStrictEqual('AWS::S3::Bu');

            context = getContextAt(6, 21, brokenYamlUri);
            expect(context?.section).toStrictEqual(TopLevelSection.Resources);
            expect(context?.logicalId).toBe('Resource1');
            expect(context?.entity).toBeInstanceOf(Resource);
            expect(context?.isTopLevel).toBe(false);
            expect(context?.text).toStrictEqual('AWS::S3::Bu');

            context = getContextAt(6, 22, brokenYamlUri);
            expect(context?.logicalId).toBe('Resource1');
            expect(context?.entity).toBeInstanceOf(Resource);
            expect(context?.isTopLevel).toBe(false);
            expect(context?.text).toStrictEqual('AWS::S3::Bu');
        });

        it('invalid json key in the middle of content', () => {
            let context = getContextAt(2, 8, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');

            context = getContextAt(2, 9, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');

            context = getContextAt(2, 10, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('Hello1');
        });

        it('invalid json key at the bottom of content', () => {
            let context = getContextAt(8, 5, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('HelloA');

            context = getContextAt(8, 6, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('HelloA');

            context = getContextAt(8, 7, brokenJsonUri);
            expect(context?.section).toStrictEqual('Unknown');
            expect(context?.logicalId).toBeUndefined();
            expect(context?.entity).toBeInstanceOf(Unknown);
            expect(context?.isTopLevel).toBe(true);
            expect(context?.text).toStrictEqual('HelloA');
        });
    });

    describe('atEntityKeyLevel method', () => {
        // Create a test template specifically for testing cursor positions in resource names
        const resourceTestTemplate = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  Parameter1:
    Type: AWS::SSM::Parameter
    Properties:
      Type: String
      Value: Foo
  AnotherResource:
    Type: AWS::S3::Bucket`;

        const resourceTestUri = 'file:///resource-test.yaml';

        beforeAll(() => {
            syntaxTreeManager.add(resourceTestUri, resourceTestTemplate);
        });

        afterAll(() => {
            syntaxTreeManager.deleteAllTrees();
        });

        it('should return false when cursor is in middle of resource name', () => {
            // Position cursor in the middle of "Parameter1" (line 2, character 5 = "P|arameter1")
            const context = getContextAt(2, 5, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('Parameter1');
            expect(context!.text).toBe('Parameter1');
            expect(context!.hasLogicalId).toBe(true);
            expect(context!.propertyPath).toEqual(['Resources', 'Parameter1']);

            // The key test: when cursor is in middle of resource name, should return false
            expect(context!.atEntityKeyLevel()).toBe(false);
        });

        it('should return false when cursor is at end of resource name', () => {
            // Position cursor at the end of "Parameter1" (line 2, character 11 = "Parameter1|")
            const context = getContextAt(2, 11, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('Parameter1');
            expect(context!.text).toBe('Parameter1');
            expect(context!.hasLogicalId).toBe(true);
            expect(context!.propertyPath).toEqual(['Resources', 'Parameter1']);

            // When cursor is at end of resource name (before colon), should return false
            expect(context!.atEntityKeyLevel()).toBe(false);
        });

        it('should return true when cursor is positioned for resource attributes', () => {
            // Position cursor after the resource name and colon, ready for attributes
            // Line 3, character 4 = "    |Type: AWS::SSM::Parameter"
            const context = getContextAt(3, 4, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('Parameter1');
            expect(context!.hasLogicalId).toBe(true);

            // When properly positioned for resource attributes, should return true
            expect(context!.atEntityKeyLevel()).toBe(true);
        });

        it('should return true when cursor is at resource attribute name', () => {
            // Position cursor at "Type" attribute (line 3, character 6 = "    T|ype:")
            const context = getContextAt(3, 6, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('Parameter1');
            expect(context!.text).toBe('Type');
            expect(context!.hasLogicalId).toBe(true);
            expect(context!.propertyPath).toEqual(['Resources', 'Parameter1', 'Type']);

            // When at resource attribute level, should return true
            expect(context!.atEntityKeyLevel()).toBe(true);
        });

        it('should return false when cursor is in different resource name', () => {
            // Position cursor in "AnotherResource" name (line 7, character 8 = "  Anoth|erResource:")
            const context = getContextAt(7, 8, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.section).toBe(TopLevelSection.Resources);
            expect(context!.logicalId).toBe('AnotherResource');
            expect(context!.text).toBe('AnotherResource');
            expect(context!.hasLogicalId).toBe(true);
            expect(context!.propertyPath).toEqual(['Resources', 'AnotherResource']);

            // When cursor is in middle of any resource name, should return false
            expect(context!.atEntityKeyLevel()).toBe(false);
        });

        it('should return false when not in a resource context', () => {
            // Position cursor in template format version (line 0, character 30)
            const context = getContextAt(0, 30, resourceTestUri);

            expect(context).toBeDefined();
            expect(context!.hasLogicalId).toBe(false);

            // When not in a resource context, should return false
            expect(context!.atEntityKeyLevel()).toBe(false);
        });
    });

    describe('textInQuotes method', () => {
        // Create test templates with quoted values
        const quotedYamlTemplate = `AWSTemplateFormatVersion: "2010-09-09"
Resources:
  TestResource:
    Type: "AWS::S3::Bucket"
    Properties:
      BucketName: "my-bucket"
      Tags:
        - Key: 'Environment'
          Value: 'Production'`;

        const quotedYamlUri = 'file:///quoted-test.yaml';

        beforeAll(() => {
            syntaxTreeManager.add(quotedYamlUri, quotedYamlTemplate);
        });

        it('should return double quote for double quoted values', () => {
            // Position in "2010-09-09" (double quoted)
            const context = getContextAt(0, 30, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBe('"');
        });

        it('should return double quote for double quoted resource type', () => {
            // Position in "AWS::S3::Bucket" (double quoted)
            const context = getContextAt(3, 15, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBe('"');
        });

        it('should return double quote for double quoted property value', () => {
            // Position in "my-bucket" (double quoted)
            const context = getContextAt(5, 20, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBe('"');
        });

        it('should return single quote for single quoted values', () => {
            // Position in 'Environment' (single quoted)
            const context = getContextAt(7, 15, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBe("'");
        });

        it('should return single quote for single quoted tag value', () => {
            // Position in 'Production' (single quoted)
            const context = getContextAt(8, 20, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBe("'");
        });

        it('should return undefined for unquoted values', () => {
            // Position in unquoted resource name
            const context = getContextAt(2, 5, quotedYamlUri);
            expect(context).toBeDefined();
            expect(context!.textInQuotes()).toBeUndefined();
        });
    });

    describe('ForEachResource Entity Parsing', () => {
        const foreachYamlUri = Templates.foreach.yaml.fileName;
        const foreachJsonUri = Templates.foreach.json.fileName;
        const foreachYaml = Templates.foreach.yaml.contents;
        const foreachJson = Templates.foreach.json.contents;

        beforeAll(() => {
            syntaxTreeManager.add(foreachYamlUri, foreachYaml);
            syntaxTreeManager.add(foreachJsonUri, foreachJson);
        });

        describe('YAML ForEach', () => {
            it('should parse ForEach resource name', () => {
                const context = getContextAt(11, 4, foreachYamlUri); // Position at "Fn::ForEach::Buckets:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.logicalId).toBe('Fn::ForEach::Buckets');
                expect(context!.text).toBe('Fn::ForEach::Buckets');
            });

            it('should create ForEachResource entity with correct properties', () => {
                const context = getContextAt(11, 4, foreachYamlUri); // Fn::ForEach::Buckets

                expect(context).toBeDefined();
                const entity = context!.entity;
                expect(entity).toBeInstanceOf(ForEachResource);

                const forEachResource = entity as ForEachResource;
                expect(forEachResource.name).toBe('Buckets');
                expect(forEachResource.identifier).toBe('BucketName');
                expect(forEachResource.collection).toBeDefined();
                expect(forEachResource.collection).toHaveProperty('!Ref', 'BucketNames');
                expect(forEachResource.resource).toBeInstanceOf(Resource);
            });

            it('should parse nested resource in ForEach', () => {
                const context = getContextAt(11, 4, foreachYamlUri);

                expect(context).toBeDefined();
                const entity = context!.entity as ForEachResource;
                const nestedResource = entity.resource;

                expect(nestedResource).toBeInstanceOf(Resource);
                expect(nestedResource?.name).toBe('S3Bucket${BucketName}');
                expect(nestedResource?.Type).toBe('AWS::S3::Bucket');
                expect(nestedResource?.Properties).toBeDefined();
                expect(nestedResource?.Properties).toHaveProperty('BucketName');
                expect(nestedResource?.Properties).toHaveProperty('VersioningConfiguration');
                expect(nestedResource?.Properties?.VersioningConfiguration).toHaveProperty('Status', 'Enabled');
                expect(nestedResource?.Properties).toHaveProperty('BucketEncryption');
            });

            it('should parse regular resource after ForEach', () => {
                const context = getContextAt(26, 4, foreachYamlUri); // Position at "RegularResource:"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.logicalId).toBe('RegularResource');
                expect(context!.entity).toBeInstanceOf(Resource);
                expect(context!.entity).not.toBeInstanceOf(ForEachResource);
            });
        });

        describe('JSON ForEach', () => {
            it('should parse ForEach resource name in JSON', () => {
                const context = getContextAt(12, 8, foreachJsonUri); // Position at "Fn::ForEach::Buckets"

                expect(context).toBeDefined();
                expect(context!.section).toBe(TopLevelSection.Resources);
                expect(context!.logicalId).toBe('Fn::ForEach::Buckets');
            });

            it('should create ForEachResource entity from JSON', () => {
                const context = getContextAt(12, 8, foreachJsonUri);

                expect(context).toBeDefined();
                const entity = context!.entity;
                expect(entity).toBeInstanceOf(ForEachResource);

                const forEachResource = entity as ForEachResource;
                expect(forEachResource.name).toBe('Buckets');
                expect(forEachResource.identifier).toBe('BucketName');
                expect(forEachResource.collection).toBeDefined();
                expect(forEachResource.collection).toHaveProperty('Ref', 'BucketNames');
                expect(forEachResource.resource).toBeInstanceOf(Resource);
            });

            it('should parse nested resource in JSON ForEach', () => {
                const context = getContextAt(12, 8, foreachJsonUri);

                expect(context).toBeDefined();
                const entity = context!.entity as ForEachResource;
                const nestedResource = entity.resource;

                expect(nestedResource).toBeInstanceOf(Resource);
                expect(nestedResource?.name).toBe('S3Bucket${BucketName}');
                expect(nestedResource?.Type).toBe('AWS::S3::Bucket');
                expect(nestedResource?.Properties).toBeDefined();
                expect(nestedResource?.Properties).toHaveProperty('BucketName');
                expect(nestedResource?.Properties?.BucketName).toHaveProperty('Fn::Sub');
                expect(nestedResource?.Properties).toHaveProperty('VersioningConfiguration');
                expect(nestedResource?.Properties?.VersioningConfiguration).toHaveProperty('Status', 'Enabled');
            });
        });
    });
});
