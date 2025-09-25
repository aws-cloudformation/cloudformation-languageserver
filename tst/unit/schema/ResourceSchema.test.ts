import { describe, it, expect } from 'vitest';
import { PropertyType, ResourceSchema } from '../../../src/schema/ResourceSchema';
import { Schemas } from '../../utils/SchemaUtils';

describe('ResourceSchema', () => {
    const s3Bucket = new ResourceSchema(Schemas.S3Bucket.contents);

    describe('constructor', () => {
        it('should correctly parse the S3 bucket schema', () => {
            expect(s3Bucket.typeName).toBe('AWS::S3::Bucket');
            expect(s3Bucket.description).toContain('The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket');
            expect(s3Bucket.additionalProperties).toBe(false);
        });

        it('should throw an error for invalid schema', () => {
            expect(
                () =>
                    new ResourceSchema(
                        JSON.stringify({
                            properties: {},
                            description: 'Test',
                            primaryIdentifier: ['/properties/Id'],
                            additionalProperties: false,
                        }),
                    ),
            ).toThrow('Schema must have a typeName');

            expect(
                () =>
                    new ResourceSchema(
                        JSON.stringify({
                            typeName: 'Test::Resource',
                            description: 'Test',
                            primaryIdentifier: ['/properties/Id'],
                            additionalProperties: false,
                        }),
                    ),
            ).toThrow('Schema must have properties');
        });

        it('should handle optional schema properties', () => {
            const schemaWithOptionals = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource with optional properties',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                    },
                    resourceLink: {
                        templateUri: 'https://example.com/template.json',
                        mappings: {
                            property1: 'mappedProperty1',
                        },
                    },
                    propertyTransform: {
                        property1: 'transformedProperty1',
                    },
                    typeConfiguration: {
                        properties: {
                            configProp: { type: 'string' },
                        },
                    },
                    deprecatedProperties: ['/properties/OldProp'],
                }),
            );

            expect(schemaWithOptionals.resourceLink).toBeDefined();
            expect(schemaWithOptionals.resourceLink?.templateUri).toBe('https://example.com/template.json');
            expect(schemaWithOptionals.resourceLink?.mappings).toEqual({ property1: 'mappedProperty1' });
            expect(schemaWithOptionals.propertyTransform).toEqual({ property1: 'transformedProperty1' });
            expect(schemaWithOptionals.typeConfiguration).toBeDefined();
            expect(schemaWithOptionals.deprecatedProperties).toEqual(['/properties/OldProp']);
        });
    });

    describe('property access', () => {
        it('should correctly identify property types', () => {
            const bucketNameProp = s3Bucket.properties.BucketName;
            expect(bucketNameProp.type).toBe('string');
            expect(bucketNameProp.description).toContain('A name for the bucket');

            const bucketEncryptionProp = s3Bucket.properties.BucketEncryption;
            expect(bucketEncryptionProp.$ref).toBe('#/definitions/BucketEncryption');
            expect(bucketEncryptionProp.description).toContain('Specifies default encryption for a bucket');
        });

        it('should correctly parse array properties', () => {
            const tagsProp = s3Bucket.properties.Tags;
            expect(tagsProp.type).toBe('array');
            expect(tagsProp.description).toContain('An arbitrary set of tags');
            expect(tagsProp.insertionOrder).toBe(false);
            expect((tagsProp.items as PropertyType).$ref).toBe('#/definitions/Tag');
        });

        it('should handle array type definitions (type as array)', () => {
            // Test schema with type as array of strings
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::ArrayType',
                    description: 'Test schema with array types',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        NullableString: {
                            type: ['string', 'null'],
                            description: 'A string that can be null',
                        },
                        NullableArray: {
                            type: ['array', 'null'],
                            items: { type: 'string' },
                            description: 'An array that can be null',
                        },
                        NullableObject: {
                            type: ['object', 'null'],
                            properties: {
                                prop: { type: 'string' },
                            },
                            description: 'An object that can be null',
                        },
                    },
                }),
            );

            // Test that properties with array types are parsed correctly
            expect(testSchema.properties.NullableString.type).toEqual(['string', 'null']);
            expect(testSchema.properties.NullableArray.type).toEqual(['array', 'null']);
            expect(testSchema.properties.NullableArray.items).toBeDefined();
            expect(testSchema.properties.NullableObject.type).toEqual(['object', 'null']);
            expect(testSchema.properties.NullableObject.properties).toBeDefined();
            expect(testSchema.properties.NullableObject.properties!.prop.type).toBe('string');
        });
    });

    describe('getByPath', () => {
        it('should get top level attributes', () => {
            expect(s3Bucket.getByPath('/typeName')).toBe('AWS::S3::Bucket');
            expect(s3Bucket.getByPath('typeName')).toBe('AWS::S3::Bucket');
        });

        it('should retrieve properties by JSON path', () => {
            const bucketName = s3Bucket.getByPath('/properties/BucketName');
            expect(bucketName.type).toBe('string');

            const tagKey = s3Bucket.getByPath('/definitions/Tag/properties/Key');
            expect(tagKey.type).toBe('string');
            expect(tagKey.minLength).toBe(1);
            expect(tagKey.maxLength).toBe(128);
        });

        it('should return undefined for non-existent paths', () => {
            expect(s3Bucket.getByPath('/properties/NonExistentProperty')).toBeUndefined();
            expect(s3Bucket.getByPath('/definitions/NonExistentDefinition')).toBeUndefined();
        });
    });

    describe('property status methods', () => {
        it('should correctly identify read-only properties', () => {
            expect(s3Bucket.isReadOnly('/properties/Arn')).toBe(true);
            expect(s3Bucket.isReadOnly('/properties/DomainName')).toBe(true);
            expect(s3Bucket.isReadOnly('/properties/BucketName')).toBe(false);
        });

        it('should correctly identify write-only properties', () => {
            expect(s3Bucket.isWriteOnly('/properties/AccessControl')).toBe(true);
            expect(s3Bucket.isWriteOnly('/properties/BucketName')).toBe(false);
        });

        it('should correctly identify create-only properties', () => {
            expect(s3Bucket.isCreateOnly('/properties/BucketName')).toBe(true);
            expect(s3Bucket.isCreateOnly('/properties/Tags')).toBe(false);
        });

        it('should correctly identify deprecated properties', () => {
            const schemaWithDeprecated = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        OldProp: { type: 'string' },
                        NewProp: { type: 'string' },
                    },
                    deprecatedProperties: ['/properties/OldProp'],
                }),
            );

            expect(schemaWithDeprecated.isDeprecated('/properties/OldProp')).toBe(true);
            expect(schemaWithDeprecated.isDeprecated('/properties/NewProp')).toBe(false);
            expect(schemaWithDeprecated.isDeprecated('/properties/NonExistent')).toBe(false);
        });

        it('should handle schemas without deprecated properties', () => {
            expect(s3Bucket.isDeprecated('/properties/BucketName')).toBe(false);
        });
    });

    describe('pattern properties traversal', () => {
        it('should traverse pattern properties when looking for specific property names', () => {
            const schemaWithPatterns = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::PatternResource',
                    description: 'Test resource with pattern properties',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        Config: {
                            type: 'object',
                            patternProperties: {
                                '^config_[a-z]+$': {
                                    type: 'string',
                                    description: 'Configuration value',
                                },
                                '^data_\\d+$': {
                                    type: 'object',
                                    properties: {
                                        value: { type: 'number' },
                                        name: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                }),
            );

            // Test pattern property matching
            const results1 = schemaWithPatterns.resolveJsonPointerPath('/properties/Config/config_test');
            expect(results1).toHaveLength(1);
            expect(results1[0].type).toBe('string');

            const results2 = schemaWithPatterns.resolveJsonPointerPath('/properties/Config/data_123/value');
            expect(results2).toHaveLength(1);
            expect(results2[0].type).toBe('number');
        });
    });

    describe('composition keywords in property traversal', () => {
        it('should traverse oneOf when looking for properties', () => {
            const schemaWithOneOf = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::OneOfResource',
                    description: 'Test resource with oneOf in property traversal',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        ConfigObject: {
                            oneOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        stringConfig: { type: 'string' },
                                        commonProp: { type: 'string' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        numberConfig: { type: 'number' },
                                        commonProp: { type: 'string' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            // Should find properties in oneOf alternatives
            const results1 = schemaWithOneOf.resolveJsonPointerPath('/properties/ConfigObject/stringConfig');
            expect(results1).toHaveLength(1);
            expect(results1[0].type).toBe('string');

            const results2 = schemaWithOneOf.resolveJsonPointerPath('/properties/ConfigObject/numberConfig');
            expect(results2).toHaveLength(1);
            expect(results2[0].type).toBe('number');

            const results3 = schemaWithOneOf.resolveJsonPointerPath('/properties/ConfigObject/commonProp');
            expect(results3).toHaveLength(2); // Should find in both alternatives
        });

        it('should traverse anyOf when looking for properties', () => {
            const schemaWithAnyOf = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::AnyOfResource',
                    description: 'Test resource with anyOf in property traversal',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleObject: {
                            anyOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        option1: { type: 'string' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        option2: { type: 'number' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            const results1 = schemaWithAnyOf.resolveJsonPointerPath('/properties/FlexibleObject/option1');
            expect(results1).toHaveLength(1);
            expect(results1[0].type).toBe('string');

            const results2 = schemaWithAnyOf.resolveJsonPointerPath('/properties/FlexibleObject/option2');
            expect(results2).toHaveLength(1);
            expect(results2[0].type).toBe('number');
        });

        it('should traverse allOf when looking for properties', () => {
            const schemaWithAllOf = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::AllOfResource',
                    description: 'Test resource with allOf in property traversal',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        MergedObject: {
                            allOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        baseProp: { type: 'string' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        extendedProp: { type: 'number' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            const results1 = schemaWithAllOf.resolveJsonPointerPath('/properties/MergedObject/baseProp');
            expect(results1).toHaveLength(1);
            expect(results1[0].type).toBe('string');

            const results2 = schemaWithAllOf.resolveJsonPointerPath('/properties/MergedObject/extendedProp');
            expect(results2).toHaveLength(1);
            expect(results2[0].type).toBe('number');
        });

        it('should handle nested composition keywords in property traversal', () => {
            const schemaWithNested = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::NestedComposition',
                    description: 'Test resource with nested composition keywords',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        ComplexObject: {
                            oneOf: [
                                {
                                    allOf: [
                                        {
                                            type: 'object',
                                            properties: {
                                                nestedProp: { type: 'string' },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }),
            );

            const results = schemaWithNested.resolveJsonPointerPath('/properties/ComplexObject/nestedProp');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });
    });

    describe('complex schema traversal edge cases', () => {
        it('should handle schemas with array types in composition keywords', () => {
            const schemaWithArrayTypes = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::ArrayTypeResource',
                    description: 'Test resource with array types in composition',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleProp: {
                            oneOf: [
                                {
                                    type: ['object', 'null'],
                                    properties: {
                                        objectProp: { type: 'string' },
                                    },
                                },
                                {
                                    type: ['array', 'null'],
                                    items: { type: 'string' },
                                },
                            ],
                        },
                    },
                }),
            );

            const results = schemaWithArrayTypes.resolveJsonPointerPath('/properties/FlexibleProp/objectProp');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });

        it('should handle deeply nested composition keywords', () => {
            const deeplyNestedSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::DeeplyNested',
                    description: 'Test resource with deeply nested composition',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        DeepObject: {
                            oneOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        level1: {
                                            anyOf: [
                                                {
                                                    type: 'object',
                                                    properties: {
                                                        level2: {
                                                            allOf: [
                                                                {
                                                                    type: 'object',
                                                                    properties: {
                                                                        deepProp: { type: 'string' },
                                                                    },
                                                                },
                                                            ],
                                                        },
                                                    },
                                                },
                                            ],
                                        },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            const results = deeplyNestedSchema.resolveJsonPointerPath('/properties/DeepObject/level1/level2/deepProp');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });

        it('should handle allOf with multiple schemas containing the same property', () => {
            const allOfSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::AllOfMultiple',
                    description: 'Test resource with allOf containing multiple schemas with same property',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        MergedConfig: {
                            allOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        sharedProp: {
                                            type: 'string',
                                            description: 'First definition',
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        sharedProp: {
                                            type: 'string',
                                            description: 'Second definition',
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        uniqueProp: { type: 'number' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            const results = allOfSchema.resolveJsonPointerPath('/properties/MergedConfig/sharedProp');
            expect(results.length).toBeGreaterThan(0);
            expect(results[0].type).toBe('string');

            const uniqueResults = allOfSchema.resolveJsonPointerPath('/properties/MergedConfig/uniqueProp');
            expect(uniqueResults).toHaveLength(1);
            expect(uniqueResults[0].type).toBe('number');
        });

        it('should handle composition keywords without object type', () => {
            const nonObjectSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::NonObjectComposition',
                    description: 'Test resource with composition keywords on non-object types',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleValue: {
                            oneOf: [
                                {
                                    type: 'string',
                                    enum: ['option1', 'option2'],
                                },
                                {
                                    type: 'number',
                                    minimum: 0,
                                },
                            ],
                        },
                    },
                }),
            );

            // Should not find properties in non-object schemas
            const results = nonObjectSchema.resolveJsonPointerPath('/properties/FlexibleValue/nonExistentProp');
            expect(results).toHaveLength(0);
        });
    });

    describe('schema parsing edge cases', () => {
        it('should parse schemas with pattern properties in property definitions', () => {
            const schemaWithPatternProps = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::PatternPropsResource',
                    description: 'Test resource with pattern properties in definitions',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        ConfigMap: {
                            type: 'object',
                            patternProperties: {
                                '^[a-z]+_config$': {
                                    type: 'string',
                                    description: 'Configuration value',
                                },
                                '^[0-9]+_data$': {
                                    type: 'object',
                                    properties: {
                                        value: { type: 'number' },
                                    },
                                },
                            },
                        },
                    },
                }),
            );

            expect(schemaWithPatternProps.properties.ConfigMap.patternProperties).toBeDefined();
            expect(Object.keys(schemaWithPatternProps.properties.ConfigMap.patternProperties!)).toHaveLength(2);
        });

        it('should parse schemas with oneOf in property definitions', () => {
            const schemaWithOneOfProps = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::OneOfPropsResource',
                    description: 'Test resource with oneOf in property definitions',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleProp: {
                            oneOf: [
                                {
                                    type: 'string',
                                    enum: ['option1', 'option2'],
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        customValue: { type: 'string' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            expect(schemaWithOneOfProps.properties.FlexibleProp.oneOf).toBeDefined();
            expect(schemaWithOneOfProps.properties.FlexibleProp.oneOf).toHaveLength(2);
        });
    });

    describe('tagging support', () => {
        it('should correctly parse tagging configuration', () => {
            expect(s3Bucket.taggable).toBe(true);
            expect(s3Bucket.tagging?.taggable).toBe(true);
            expect(s3Bucket.tagging?.tagProperty).toBe('/properties/Tags');
            expect(s3Bucket.tagging?.tagOnCreate).toBe(true);
            expect(s3Bucket.tagging?.tagUpdatable).toBe(true);
            expect(s3Bucket.tagging?.permissions).toContain('s3:PutBucketTagging');
        });
    });

    describe('handlers', () => {
        it('should correctly parse handler permissions', () => {
            expect(s3Bucket.handlers?.create?.permissions).toContain('s3:CreateBucket');
            expect(s3Bucket.handlers?.read?.permissions).toContain('s3:GetBucketTagging');
            expect(s3Bucket.handlers?.update?.permissions).toContain('s3:PutBucketAcl');
            expect(s3Bucket.handlers?.delete?.permissions).toContain('s3:DeleteBucket');
        });
    });

    describe('toJSON', () => {
        it('should serialize back to a valid object', () => {
            const jsonObject = s3Bucket.toJSON();
            expect(jsonObject).toHaveProperty('typeName', 'AWS::S3::Bucket');
            expect(jsonObject).toHaveProperty('properties');
            expect(jsonObject).toHaveProperty('definitions');
            expect(jsonObject).toHaveProperty('primaryIdentifier');
        });
    });

    describe('refs', () => {
        it('should resolve a ref', () => {
            const aProperty = s3Bucket.properties['AccelerateConfiguration'];
            expect(aProperty.$ref).toBe('#/definitions/AccelerateConfiguration');

            expect(s3Bucket.resolveRef(aProperty.$ref!)).toEqual({
                type: 'object',
                additionalProperties: false,
                properties: {
                    AccelerationStatus: {
                        description: 'Specifies the transfer acceleration status of the bucket.',
                        type: 'string',
                        enum: ['Enabled', 'Suspended'],
                    },
                },
                required: ['AccelerationStatus'],
                description:
                    'Configures the transfer acceleration state for an Amazon S3 bucket. For more information, see [Amazon S3 Transfer Acceleration](https://docs.aws.amazon.com/AmazonS3/latest/dev/transfer-acceleration.html) in the *Amazon S3 User Guide*.',
            });
        });
    });

    describe('$ref resolution during path traversal', () => {
        it('should resolve $ref values during property traversal', () => {
            const results = s3Bucket.resolveJsonPointerPath(
                '/properties/BucketEncryption/ServerSideEncryptionConfiguration',
            );
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'array',
            });
            // Should have resolved the $ref in BucketEncryption
            expect(results[0].items).toBeDefined();
        });

        it('should merge properties when resolving $ref', () => {
            // Create a test schema with $ref and additional properties
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        TestProp: {
                            $ref: '#/definitions/TestDef',
                            description: 'Local description should be preserved',
                        },
                    },
                    definitions: {
                        TestDef: {
                            type: 'object',
                            properties: {
                                SubProp: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                }),
            );

            const results = testSchema.resolveJsonPointerPath('/properties/TestProp');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'object',
                description: 'Local description should be preserved',
            });
            expect(results[0].properties).toBeDefined();
            expect(results[0].properties!.SubProp).toBeDefined();
        });

        it('should handle circular references gracefully', () => {
            // Create a test schema with circular references
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        CircularProp: {
                            $ref: '#/definitions/CircularA',
                        },
                    },
                    definitions: {
                        CircularA: {
                            type: 'object',
                            properties: {
                                PropB: {
                                    $ref: '#/definitions/CircularB',
                                },
                            },
                        },
                        CircularB: {
                            type: 'object',
                            properties: {
                                PropA: {
                                    $ref: '#/definitions/CircularA',
                                },
                            },
                        },
                    },
                }),
            );

            // Should not throw an error and should return a result
            const results = testSchema.resolveJsonPointerPath('/properties/CircularProp');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'object',
            });
            // Should have properties but circular reference should be broken
            expect(results[0].properties).toBeDefined();
        });

        it('should handle nested circular references in path traversal', () => {
            // Create a test schema with circular references
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        CircularProp: {
                            $ref: '#/definitions/CircularA',
                        },
                    },
                    definitions: {
                        CircularA: {
                            type: 'object',
                            properties: {
                                PropB: {
                                    $ref: '#/definitions/CircularB',
                                },
                            },
                        },
                        CircularB: {
                            type: 'object',
                            properties: {
                                PropA: {
                                    $ref: '#/definitions/CircularA',
                                },
                            },
                        },
                    },
                }),
            );

            // Should handle traversal through circular references
            const results = testSchema.resolveJsonPointerPath('/properties/CircularProp/PropB');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'object',
            });
        });

        it('should handle invalid $ref values gracefully', () => {
            // Create a test schema with invalid $ref
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        InvalidRefProp: {
                            $ref: '#/definitions/NonExistent',
                            type: 'string',
                            description: 'Should preserve local properties',
                        },
                    },
                }),
            );

            const results = testSchema.resolveJsonPointerPath('/properties/InvalidRefProp');
            expect(results).toHaveLength(1);
            // Should return schema without $ref but with local properties
            expect(results[0]).toMatchObject({
                type: 'string',
                description: 'Should preserve local properties',
            });
            expect(results[0].$ref).toBeUndefined();
        });

        it('should give $ref precedence over local properties', () => {
            // Create a test schema where $ref and local properties conflict
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        ConflictProp: {
                            $ref: '#/definitions/TestDef',
                            type: 'string', // This should be overridden by $ref
                            description: 'Local description',
                        },
                    },
                    definitions: {
                        TestDef: {
                            type: 'object',
                            properties: {
                                SubProp: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                }),
            );

            const results = testSchema.resolveJsonPointerPath('/properties/ConflictProp');
            expect(results).toHaveLength(1);
            // $ref should take precedence for type
            expect(results[0]).toMatchObject({
                type: 'object',
                description: 'Local description', // Local description should be preserved
            });
            expect(results[0].properties).toBeDefined();
        });
    });

    describe('CloudFormation path parsing', () => {
        describe('resolveJsonPointerPath', () => {
            it('should resolve simple property paths', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/BucketName');
                expect(results).toHaveLength(1);
                expect(results[0]).toMatchObject({
                    type: 'string',
                });
            });

            it('should resolve nested property paths with $ref resolution', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/BucketEncryption');
                expect(results).toHaveLength(1);
                expect(results[0]).toMatchObject({
                    type: 'object',
                    additionalProperties: false,
                });
                // Should have resolved the $ref and merged properties
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ServerSideEncryptionConfiguration).toBeDefined();
            });

            it('should resolve wildcard paths for arrays with $ref resolution', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/Tags/*');
                expect(results).toHaveLength(1);
                // Should have resolved the $ref to Tag definition
                expect(results[0]).toMatchObject({
                    type: 'object',
                    additionalProperties: false,
                });
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.Key).toBeDefined();
                expect(results[0].properties!.Value).toBeDefined();
            });

            it('should resolve nested wildcard paths with $ref resolution', () => {
                const results = s3Bucket.resolveJsonPointerPath(
                    '/properties/BucketEncryption/ServerSideEncryptionConfiguration/*',
                );
                expect(results).toHaveLength(1);
                // Should resolve through the $ref chain
                expect(results[0]).toMatchObject({
                    type: 'object',
                });
                expect(results[0].properties).toBeDefined();
            });

            it('should not handle array indices in CFN paths', () => {
                const wildcardResults = s3Bucket.resolveJsonPointerPath('/properties/Tags/*');
                const indexResults = s3Bucket.resolveJsonPointerPath('/properties/Tags/0');

                // Wildcards should work
                expect(wildcardResults).toHaveLength(1);
                // Array indices should not work in CFN paths (they should be converted to wildcards first)
                expect(indexResults).toHaveLength(0);
            });

            it('should properly track wildcard segments in path during traversal', () => {
                // Create a schema with nested arrays to test path tracking
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::WildcardPath',
                        description: 'Test schema for wildcard path tracking',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/NestedArray/*/ReadOnlyProp'],
                        properties: {
                            Id: { type: 'string' },
                            NestedArray: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        ReadOnlyProp: {
                                            type: 'string',
                                            description: 'This should be filtered when excludeReadOnly is true',
                                        },
                                        WritableProp: {
                                            type: 'string',
                                            description: 'This should remain when excludeReadOnly is true',
                                        },
                                    },
                                },
                            },
                        },
                    }),
                );

                // Test that wildcard path traversal works correctly
                const results = testSchema.resolveJsonPointerPath('/properties/NestedArray/*');
                expect(results).toHaveLength(1);
                expect(results[0].type).toBe('object');
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ReadOnlyProp).toBeDefined();
                expect(results[0].properties!.WritableProp).toBeDefined();

                // Test that read-only filtering works with wildcard paths (this verifies path tracking)
                const filteredResults = testSchema.resolveJsonPointerPath('/properties/NestedArray/*', {
                    excludeReadOnly: true,
                });
                expect(filteredResults).toHaveLength(1);
                expect(filteredResults[0].type).toBe('object');
                expect(filteredResults[0].properties).toBeDefined();

                // ReadOnlyProp should be filtered out because the path /properties/NestedArray/*/ReadOnlyProp matches
                expect(filteredResults[0].properties!.ReadOnlyProp).toBeUndefined();
                // WritableProp should remain
                expect(filteredResults[0].properties!.WritableProp).toBeDefined();
            });

            it('should not handle intrinsic functions in JSON Pointer paths', () => {
                // JSON Pointer paths shouldn't contain intrinsic functions - they get stripped by templatePathToJsonPointerPath
                const results = s3Bucket.resolveJsonPointerPath('/properties/BucketName/Fn::If');
                expect(results).toHaveLength(0);
            });

            it('should return empty array for invalid paths', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/NonExistentProperty');
                expect(results).toHaveLength(0);
            });

            it('should handle paths that traverse non-object/non-array types', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/BucketName/InvalidSubPath');
                expect(results).toHaveLength(0);
            });

            it('should handle options parameter', () => {
                const results = s3Bucket.resolveJsonPointerPath('/properties/Tags/*', { excludeReadOnly: true });
                expect(results).toHaveLength(1);
            });
        });
    });

    describe('read-only property filtering', () => {
        describe('excludeReadOnly option', () => {
            it('should filter out read-only properties when excludeReadOnly is true', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: [
                            '/properties/TestObject/ReadOnlyProp',
                            '/properties/TestObject/AnotherReadOnlyProp',
                        ],
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: {
                                        type: 'string',
                                        description: 'This should be filtered out',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'This should remain',
                                    },
                                    AnotherReadOnlyProp: {
                                        type: 'number',
                                        description: 'This should also be filtered out',
                                    },
                                },
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/TestObject', { excludeReadOnly: true });
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ReadOnlyProp).toBeUndefined();
                expect(results[0].properties!.AnotherReadOnlyProp).toBeUndefined();
                expect(results[0].properties!.WritableProp).toBeDefined();
                expect(results[0].properties!.WritableProp.type).toBe('string');
            });

            it('should include read-only properties when excludeReadOnly is false', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/TestObject/ReadOnlyProp'],
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: {
                                        type: 'string',
                                        description: 'This should be included',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'This should also be included',
                                    },
                                },
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/TestObject', { excludeReadOnly: false });
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ReadOnlyProp).toBeDefined();
                expect(results[0].properties!.WritableProp).toBeDefined();
            });

            it('should include read-only properties when excludeReadOnly is not specified (default behavior)', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/TestObject/ReadOnlyProp'],
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: {
                                        type: 'string',
                                        description: 'This should be included by default',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'This should also be included',
                                    },
                                },
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/TestObject');
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ReadOnlyProp).toBeDefined();
                expect(results[0].properties!.WritableProp).toBeDefined();
            });

            it('should handle complex nested paths with wildcards in readOnlyProperties', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: [
                            '/properties/ArrayProp/*/ReadOnlyItem',
                            '/properties/NestedObject/Level1/Level2ReadOnly',
                            '/properties/CompositionProp/Option1ReadOnly',
                            '/properties/CompositionWithArray/*/ArrayItemReadOnly',
                        ],
                        properties: {
                            ArrayProp: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        ReadOnlyItem: {
                                            type: 'string',
                                            description: 'Should be filtered in arrays',
                                        },
                                        WritableItem: {
                                            type: 'string',
                                            description: 'Should remain in arrays',
                                        },
                                    },
                                },
                            },
                            NestedObject: {
                                type: 'object',
                                properties: {
                                    Level1: {
                                        type: 'object',
                                        properties: {
                                            Level2ReadOnly: {
                                                type: 'string',
                                                description: 'Should be filtered in nested objects',
                                            },
                                            Level2Writable: {
                                                type: 'string',
                                                description: 'Should remain in nested objects',
                                            },
                                        },
                                    },
                                },
                            },
                            CompositionProp: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            Option1ReadOnly: {
                                                type: 'string',
                                                description: 'Should be filtered in composition',
                                            },
                                            Option1Writable: {
                                                type: 'string',
                                                description: 'Should remain in composition',
                                            },
                                        },
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            Option2Prop: {
                                                type: 'number',
                                                description: 'Should remain in second option',
                                            },
                                        },
                                    },
                                ],
                            },
                            CompositionWithArray: {
                                anyOf: [
                                    {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                ArrayItemReadOnly: {
                                                    type: 'string',
                                                    description: 'Should be filtered in composition array',
                                                },
                                                ArrayItemWritable: {
                                                    type: 'string',
                                                    description: 'Should remain in composition array',
                                                },
                                            },
                                        },
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            AlternativeOption: {
                                                type: 'string',
                                                description: 'Alternative to array',
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    }),
                );

                // Test array wildcard filtering
                const arrayResults = testSchema.resolveJsonPointerPath('/properties/ArrayProp/*', {
                    excludeReadOnly: true,
                });
                expect(arrayResults).toHaveLength(1);
                expect(arrayResults[0].properties).toBeDefined();
                expect(arrayResults[0].properties!.ReadOnlyItem).toBeUndefined();
                expect(arrayResults[0].properties!.WritableItem).toBeDefined();

                // Test nested object filtering
                const nestedResults = testSchema.resolveJsonPointerPath('/properties/NestedObject', {
                    excludeReadOnly: true,
                });
                expect(nestedResults).toHaveLength(1);
                expect(nestedResults[0].properties!.Level1.properties!.Level2ReadOnly).toBeUndefined();
                expect(nestedResults[0].properties!.Level1.properties!.Level2Writable).toBeDefined();

                // Test composition keyword filtering
                const compositionResults = testSchema.resolveJsonPointerPath('/properties/CompositionProp', {
                    excludeReadOnly: true,
                });
                expect(compositionResults).toHaveLength(2);
                // First option should have read-only property filtered
                expect(compositionResults[0].properties!.Option1ReadOnly).toBeUndefined();
                expect(compositionResults[0].properties!.Option1Writable).toBeDefined();
                // Second option should remain unchanged
                expect(compositionResults[1].properties!.Option2Prop).toBeDefined();

                // Test composition with array filtering
                const compositionArrayResults = testSchema.resolveJsonPointerPath('/properties/CompositionWithArray', {
                    excludeReadOnly: true,
                });
                expect(compositionArrayResults).toHaveLength(2);
                // First option (array) should have read-only property filtered from items
                expect(compositionArrayResults[0].type).toBe('array');
                expect(compositionArrayResults[0].items!.properties!.ArrayItemReadOnly).toBeUndefined();
                expect(compositionArrayResults[0].items!.properties!.ArrayItemWritable).toBeDefined();
                // Second option (object) should remain unchanged
                expect(compositionArrayResults[1].properties!.AlternativeOption).toBeDefined();
            });

            it('should handle real CloudFormation-style readOnlyProperties patterns', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: {
                                        type: 'string',
                                        readOnly: true,
                                        description: 'This should be included by default',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'This should also be included',
                                    },
                                },
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/TestObject');
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.ReadOnlyProp).toBeDefined();
                expect(results[0].properties!.WritableProp).toBeDefined();
            });
        });
    });

    describe('JSON Schema composition keywords', () => {
        describe('oneOf keyword handling', () => {
            it('should return all possible schema alternatives for oneOf', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            OneOfProp: {
                                oneOf: [
                                    { type: 'string', description: 'String alternative' },
                                    { type: 'number', description: 'Number alternative' },
                                    { type: 'boolean', description: 'Boolean alternative' },
                                ],
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/OneOfProp');
                expect(results).toHaveLength(3);

                expect(results[0]).toMatchObject({
                    type: 'string',
                    description: 'String alternative',
                });
                expect(results[1]).toMatchObject({
                    type: 'number',
                    description: 'Number alternative',
                });
                expect(results[2]).toMatchObject({
                    type: 'boolean',
                    description: 'Boolean alternative',
                });
            });

            it('should handle oneOf with nested property traversal', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            OneOfProp: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            StringProp: { type: 'string' },
                                        },
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            NumberProp: { type: 'number' },
                                        },
                                    },
                                ],
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/OneOfProp/StringProp');
                expect(results).toHaveLength(1);
                expect(results[0]).toMatchObject({
                    type: 'string',
                });

                const numberResults = testSchema.resolveJsonPointerPath('/properties/OneOfProp/NumberProp');
                expect(numberResults).toHaveLength(1);
                expect(numberResults[0]).toMatchObject({
                    type: 'number',
                });
            });

            it('should handle oneOf with $ref resolution', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            OneOfProp: {
                                oneOf: [{ $ref: '#/definitions/StringDef' }, { $ref: '#/definitions/NumberDef' }],
                            },
                        },
                        definitions: {
                            StringDef: {
                                type: 'string',
                                description: 'String definition',
                            },
                            NumberDef: {
                                type: 'number',
                                description: 'Number definition',
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/OneOfProp');
                expect(results).toHaveLength(2);
                expect(results[0]).toMatchObject({
                    type: 'string',
                    description: 'String definition',
                });
                expect(results[1]).toMatchObject({
                    type: 'number',
                    description: 'Number definition',
                });
            });
        });

        describe('anyOf keyword handling', () => {
            it('should return all applicable schema options for anyOf', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            AnyOfProp: {
                                anyOf: [
                                    { type: 'string', minLength: 5 },
                                    { type: 'string', maxLength: 10 },
                                    { type: 'number', minimum: 0 },
                                ],
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/AnyOfProp');
                expect(results).toHaveLength(3);

                expect(results[0]).toMatchObject({
                    type: 'string',
                    minLength: 5,
                });
                expect(results[1]).toMatchObject({
                    type: 'string',
                    maxLength: 10,
                });
                expect(results[2]).toMatchObject({
                    type: 'number',
                    minimum: 0,
                });
            });

            it('should handle anyOf with nested property traversal', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            AnyOfProp: {
                                anyOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            CommonProp: { type: 'string' },
                                            SpecificProp1: { type: 'number' },
                                        },
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            CommonProp: { type: 'string' },
                                            SpecificProp2: { type: 'boolean' },
                                        },
                                    },
                                ],
                            },
                        },
                    }),
                );

                const commonResults = testSchema.resolveJsonPointerPath('/properties/AnyOfProp/CommonProp');
                expect(commonResults).toHaveLength(2);
                expect(commonResults[0]).toMatchObject({ type: 'string' });
                expect(commonResults[1]).toMatchObject({ type: 'string' });

                const specific1Results = testSchema.resolveJsonPointerPath('/properties/AnyOfProp/SpecificProp1');
                expect(specific1Results).toHaveLength(1);
                expect(specific1Results[0]).toMatchObject({ type: 'number' });

                const specific2Results = testSchema.resolveJsonPointerPath('/properties/AnyOfProp/SpecificProp2');
                expect(specific2Results).toHaveLength(1);
                expect(specific2Results[0]).toMatchObject({ type: 'boolean' });
            });
        });

        describe('allOf keyword handling', () => {
            it('should handle real CloudFormation allOf pattern with required fields and oneOf', () => {
                // Based on AWS::CloudWatch::MetricStream pattern
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            FirehoseArn: { type: 'string' },
                            RoleArn: { type: 'string' },
                            OutputFormat: { type: 'string' },
                            IncludeFilters: { type: 'array' },
                            ExcludeFilters: { type: 'array' },
                        },
                        allOf: [
                            {
                                required: ['FirehoseArn', 'RoleArn', 'OutputFormat'],
                            },
                            {
                                oneOf: [
                                    {},
                                    {
                                        required: ['IncludeFilters', 'ExcludeFilters'],
                                    },
                                ],
                            },
                        ],
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/');
                expect(results).toHaveLength(2);

                // Both results should have the base required fields
                expect(results[0].required).toContain('FirehoseArn');
                expect(results[0].required).toContain('RoleArn');
                expect(results[0].required).toContain('OutputFormat');
                expect(results[1].required).toContain('FirehoseArn');
                expect(results[1].required).toContain('RoleArn');
                expect(results[1].required).toContain('OutputFormat');

                // One result should have no additional requirements, the other should require both filters
                const resultRequiredLengths = results.map((r) => r.required?.length ?? 0).sort();
                expect(resultRequiredLengths).toEqual([3, 5]); // 3 base + 0 additional, 3 base + 2 additional
            });

            it('should handle allOf with default values pattern', () => {
                // Another real CloudFormation pattern with default values
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        properties: {
                            RequiredProp: { type: 'string' },
                            DefaultProp: { type: 'string' },
                        },
                        allOf: [
                            {
                                required: ['RequiredProp'],
                            },
                            {
                                properties: {
                                    DefaultProp: {
                                        default: 'default-value',
                                    },
                                },
                            },
                        ],
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/');
                expect(results).toHaveLength(1);
                expect(results[0].required).toEqual(['RequiredProp']);
                expect(results[0].properties?.DefaultProp?.default).toBe('default-value');
            });
        });

        describe('nested composition keywords', () => {
            it('should handle real CloudFormation nested allOf pattern', () => {
                // Test with the actual CloudWatch MetricStream schema pattern
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'AWS::CloudWatch::MetricStream',
                        description: 'Resource Type definition for Metric Stream',
                        primaryIdentifier: ['/properties/Name'],
                        additionalProperties: false,
                        properties: {
                            FirehoseArn: { type: 'string' },
                            RoleArn: { type: 'string' },
                            OutputFormat: { type: 'string' },
                            IncludeFilters: { type: 'array' },
                            ExcludeFilters: { type: 'array' },
                        },
                        allOf: [
                            {
                                required: ['FirehoseArn', 'RoleArn', 'OutputFormat'],
                            },
                            {
                                oneOf: [
                                    {},
                                    {
                                        required: ['IncludeFilters', 'ExcludeFilters'],
                                    },
                                ],
                            },
                        ],
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/');
                expect(results).toHaveLength(2);

                // Both results should have the base required fields
                for (const result of results) {
                    expect(result.required).toContain('FirehoseArn');
                    expect(result.required).toContain('RoleArn');
                    expect(result.required).toContain('OutputFormat');
                }

                // One result should have 3 required fields, the other should have 5
                const requiredCounts = results.map((r) => r.required?.length ?? 0).sort();
                expect(requiredCounts).toEqual([3, 5]);
            });
        });

        describe('filterReadOnlyProperties optimization', () => {
            it('should use early returns when no read-only properties are defined', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        // No readOnlyProperties defined
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    Prop1: { type: 'string' },
                                    Prop2: { type: 'number' },
                                },
                            },
                        },
                    }),
                );

                const results = testSchema.resolveJsonPointerPath('/properties/TestObject', { excludeReadOnly: true });
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.Prop1).toBeDefined();
                expect(results[0].properties!.Prop2).toBeDefined();
            });

            it('should use early returns when no relevant read-only paths exist for current branch', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/OtherObject/ReadOnlyProp'], // Different branch
                        properties: {
                            TestObject: {
                                type: 'object',
                                properties: {
                                    Prop1: { type: 'string' },
                                    Prop2: { type: 'number' },
                                },
                            },
                            OtherObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: { type: 'string' },
                                    WritableProp: { type: 'string' },
                                },
                            },
                        },
                    }),
                );

                // Should skip processing TestObject branch entirely since no read-only properties affect it
                const results = testSchema.resolveJsonPointerPath('/properties/TestObject', { excludeReadOnly: true });
                expect(results).toHaveLength(1);
                expect(results[0].properties).toBeDefined();
                expect(results[0].properties!.Prop1).toBeDefined();
                expect(results[0].properties!.Prop2).toBeDefined();
            });

            it('should handle wildcard patterns in path relevance checking', () => {
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::Resource',
                        description: 'Test resource',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/TestArray/*/ReadOnlyProp'],
                        properties: {
                            TestArray: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        ReadOnlyProp: { type: 'string' },
                                        WritableProp: { type: 'string' },
                                    },
                                },
                            },
                            UnrelatedObject: {
                                type: 'object',
                                properties: {
                                    SomeProp: { type: 'string' },
                                },
                            },
                        },
                    }),
                );

                // Should process TestArray branch (has relevant wildcard read-only properties)
                const arrayResults = testSchema.resolveJsonPointerPath('/properties/TestArray/*', {
                    excludeReadOnly: true,
                });
                expect(arrayResults).toHaveLength(1);
                expect(arrayResults[0].properties!.ReadOnlyProp).toBeUndefined();
                expect(arrayResults[0].properties!.WritableProp).toBeDefined();

                // Should skip processing UnrelatedObject branch (no relevant read-only properties)
                const unrelatedResults = testSchema.resolveJsonPointerPath('/properties/UnrelatedObject', {
                    excludeReadOnly: true,
                });
                expect(unrelatedResults).toHaveLength(1);
                expect(unrelatedResults[0].properties!.SomeProp).toBeDefined();
            });

            it('should apply consistent read-only filtering across all code paths', () => {
                // This test specifically validates the applyReadOnlyFiltering method
                // introduced to centralize filtering logic and ensure consistency
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::ConsistentFiltering',
                        description: 'Test schema for consistent read-only filtering',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: [
                            '/properties/NestedObject/ReadOnlyProp',
                            '/properties/CompositionRoot/ReadOnlyInComposition',
                            '/properties/RootReadOnlyProp',
                        ],
                        properties: {
                            Id: { type: 'string' },
                            RootReadOnlyProp: { type: 'string' },
                            NestedObject: {
                                type: 'object',
                                properties: {
                                    ReadOnlyProp: {
                                        type: 'string',
                                        description: 'Nested read-only property',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'Nested writable property',
                                    },
                                },
                            },
                            CompositionRoot: {
                                oneOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            ReadOnlyInComposition: {
                                                type: 'string',
                                                description: 'Read-only property in composition',
                                            },
                                            WritableInComposition: {
                                                type: 'string',
                                                description: 'Writable property in composition',
                                            },
                                        },
                                    },
                                ],
                            },
                        },
                    }),
                );

                // Test 1: Nested object path - tests applyReadOnlyFiltering in normal traversal
                const nestedResults = testSchema.resolveJsonPointerPath('/properties/NestedObject', {
                    excludeReadOnly: true,
                });
                expect(nestedResults).toHaveLength(1);
                expect(nestedResults[0].properties).toBeDefined();
                expect(nestedResults[0].properties!.ReadOnlyProp).toBeUndefined();
                expect(nestedResults[0].properties!.WritableProp).toBeDefined();

                // Test 2: Composition keyword path - tests applyReadOnlyFiltering with composition
                const compositionResults = testSchema.resolveJsonPointerPath('/properties/CompositionRoot', {
                    excludeReadOnly: true,
                });
                expect(compositionResults).toHaveLength(1);
                expect(compositionResults[0].properties).toBeDefined();
                expect(compositionResults[0].properties!.ReadOnlyInComposition).toBeUndefined();
                expect(compositionResults[0].properties!.WritableInComposition).toBeDefined();

                // Test 3: Verify that without excludeReadOnly, all properties are present
                const unfilteredNested = testSchema.resolveJsonPointerPath('/properties/NestedObject', {
                    excludeReadOnly: false,
                });
                expect(unfilteredNested).toHaveLength(1);
                expect(unfilteredNested[0].properties!.ReadOnlyProp).toBeDefined();
                expect(unfilteredNested[0].properties!.WritableProp).toBeDefined();

                const unfilteredComposition = testSchema.resolveJsonPointerPath('/properties/CompositionRoot', {
                    excludeReadOnly: false,
                });
                expect(unfilteredComposition).toHaveLength(1);
                expect(unfilteredComposition[0].properties!.ReadOnlyInComposition).toBeDefined();
                expect(unfilteredComposition[0].properties!.WritableInComposition).toBeDefined();

                // Test 4: Verify default behavior (no excludeReadOnly option) includes all properties
                const defaultNested = testSchema.resolveJsonPointerPath('/properties/NestedObject');
                expect(defaultNested).toHaveLength(1);
                expect(defaultNested[0].properties!.ReadOnlyProp).toBeDefined();
                expect(defaultNested[0].properties!.WritableProp).toBeDefined();

                const defaultComposition = testSchema.resolveJsonPointerPath('/properties/CompositionRoot');
                expect(defaultComposition).toHaveLength(1);
                expect(defaultComposition[0].properties!.ReadOnlyInComposition).toBeDefined();
                expect(defaultComposition[0].properties!.WritableInComposition).toBeDefined();

                // Test 5: Verify read only are removed at root level
                const defaultRoot = testSchema.resolveJsonPointerPath('/properties', {
                    excludeReadOnly: true,
                });
                expect(defaultRoot).toHaveLength(1);
                expect(defaultRoot[0].properties!.Id).toBeDefined();
                expect(defaultRoot[0].properties!.RootReadOnlyProp).toBeUndefined();

                // Test 6: Verify consistency - both paths should filter the same way
                // This is the key test for the applyReadOnlyFiltering method ensuring consistency
                expect(nestedResults[0].properties!.ReadOnlyProp).toEqual(
                    compositionResults[0].properties!.ReadOnlyInComposition,
                ); // Both should be undefined
                expect(nestedResults[0].properties!.WritableProp).toBeDefined();
                expect(compositionResults[0].properties!.WritableInComposition).toBeDefined();
            });

            it('should preserve $ref resolution when filtering read-only properties', () => {
                // This test validates that $ref values are properly resolved even when excludeReadOnly is used
                const testSchema = new ResourceSchema(
                    JSON.stringify({
                        typeName: 'Test::RefResolution',
                        description: 'Test schema for $ref resolution with read-only filtering',
                        primaryIdentifier: ['/properties/Id'],
                        additionalProperties: false,
                        readOnlyProperties: ['/properties/TestObject/ReadOnlyProp'],
                        properties: {
                            Id: { type: 'string' },
                            TestObject: {
                                type: 'object',
                                properties: {
                                    RefProperty: {
                                        $ref: '#/definitions/ComplexType',
                                        description: 'Property with $ref that should be resolved',
                                    },
                                    ReadOnlyProp: {
                                        type: 'string',
                                        description: 'This should be filtered out',
                                    },
                                    WritableProp: {
                                        type: 'string',
                                        description: 'This should remain',
                                    },
                                },
                            },
                        },
                        definitions: {
                            ComplexType: {
                                type: 'object',
                                properties: {
                                    nestedProp: { type: 'string' },
                                    anotherProp: { type: 'number' },
                                },
                                required: ['nestedProp'],
                            },
                        },
                    }),
                );

                // Test with excludeReadOnly: true
                const filteredResults = testSchema.resolveJsonPointerPath('/properties/TestObject', {
                    excludeReadOnly: true,
                });

                expect(filteredResults).toHaveLength(1);
                const result = filteredResults[0];

                // Verify read-only property is filtered out
                expect(result.properties!.ReadOnlyProp).toBeUndefined();

                // Verify writable property remains
                expect(result.properties!.WritableProp).toBeDefined();
                expect(result.properties!.WritableProp.type).toBe('string');

                // Verify $ref property is resolved and has proper type information
                expect(result.properties!.RefProperty).toBeDefined();
                expect(result.properties!.RefProperty.type).toBe('object');
                expect(result.properties!.RefProperty.properties).toBeDefined();
                expect(result.properties!.RefProperty.properties!.nestedProp).toBeDefined();
                expect(result.properties!.RefProperty.properties!.nestedProp.type).toBe('string');
                expect(result.properties!.RefProperty.properties!.anotherProp).toBeDefined();
                expect(result.properties!.RefProperty.properties!.anotherProp.type).toBe('number');
                expect(result.properties!.RefProperty.required).toEqual(['nestedProp']);

                // Test without excludeReadOnly to ensure $ref resolution still works
                const unfilteredResults = testSchema.resolveJsonPointerPath('/properties/TestObject');
                expect(unfilteredResults).toHaveLength(1);
                const unfilteredResult = unfilteredResults[0];

                // All properties should be present
                expect(unfilteredResult.properties!.ReadOnlyProp).toBeDefined();
                expect(unfilteredResult.properties!.WritableProp).toBeDefined();
                expect(unfilteredResult.properties!.RefProperty).toBeDefined();

                // $ref should still be resolved
                expect(unfilteredResult.properties!.RefProperty.type).toBe('object');
                expect(unfilteredResult.properties!.RefProperty.properties).toBeDefined();
            });
        });
    });

    describe('composition keywords (oneOf/anyOf/allOf)', () => {
        it('should traverse oneOf schemas to find properties', () => {
            // First, let's test a simpler case with our test schema
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::OneOf',
                    description: 'Test schema with oneOf',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        TestProp: {
                            oneOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        SimplePrefix: {
                                            type: 'string',
                                            description: 'Simple prefix property',
                                        },
                                    },
                                    required: ['SimplePrefix'],
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        ComplexPrefix: {
                                            type: 'string',
                                            description: 'Complex prefix property',
                                        },
                                    },
                                    required: ['ComplexPrefix'],
                                },
                            ],
                        },
                    },
                }),
            );

            // Test that we can find SimplePrefix in the oneOf
            const results = testSchema.resolveJsonPointerPath('/properties/TestProp/SimplePrefix');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'string',
                description: 'Simple prefix property',
            });

            // Test the real S3 bucket case with SimplePrefix in oneOf
            const s3Results = s3Bucket.resolveJsonPointerPath(
                '/properties/LoggingConfiguration/TargetObjectKeyFormat/SimplePrefix',
            );
            expect(s3Results).toHaveLength(1);
            expect(s3Results[0]).toMatchObject({
                type: 'object',
                additionalProperties: false,
                description:
                    'This format defaults the prefix to the given log file prefix for delivering server access log file.',
            });
        });

        it('should traverse anyOf schemas to find properties', () => {
            // Create a test schema with anyOf structure
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::AnyOf',
                    description: 'Test schema with anyOf',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        TestProp: {
                            anyOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        StringVariant: {
                                            type: 'string',
                                            description: 'String variant property',
                                        },
                                    },
                                    required: ['StringVariant'],
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        NumberVariant: {
                                            type: 'number',
                                            description: 'Number variant property',
                                        },
                                    },
                                    required: ['NumberVariant'],
                                },
                            ],
                        },
                    },
                }),
            );

            // Should find StringVariant in first anyOf branch
            const stringResults = testSchema.resolveJsonPointerPath('/properties/TestProp/StringVariant');
            expect(stringResults).toHaveLength(1);
            expect(stringResults[0]).toMatchObject({
                type: 'string',
                description: 'String variant property',
            });

            // Should find NumberVariant in second anyOf branch
            const numberResults = testSchema.resolveJsonPointerPath('/properties/TestProp/NumberVariant');
            expect(numberResults).toHaveLength(1);
            expect(numberResults[0]).toMatchObject({
                type: 'number',
                description: 'Number variant property',
            });
        });

        it('should traverse allOf schemas and merge properties', () => {
            // Create a test schema with allOf structure
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::AllOf',
                    description: 'Test schema with allOf',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        TestProp: {
                            allOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        BaseProp: {
                                            type: 'string',
                                            description: 'Base property',
                                        },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        ExtendedProp: {
                                            type: 'number',
                                            description: 'Extended property',
                                        },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            // Should find BaseProp from first allOf schema
            const baseResults = testSchema.resolveJsonPointerPath('/properties/TestProp/BaseProp');
            expect(baseResults).toHaveLength(1);
            expect(baseResults[0]).toMatchObject({
                type: 'string',
                description: 'Base property',
            });

            // Should find ExtendedProp from second allOf schema
            const extendedResults = testSchema.resolveJsonPointerPath('/properties/TestProp/ExtendedProp');
            expect(extendedResults).toHaveLength(1);
            expect(extendedResults[0]).toMatchObject({
                type: 'number',
                description: 'Extended property',
            });
        });

        it('should handle nested composition keywords', () => {
            // Create a test schema with nested oneOf inside anyOf
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::NestedComposition',
                    description: 'Test schema with nested composition',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        ComplexProp: {
                            anyOf: [
                                {
                                    oneOf: [
                                        {
                                            type: 'object',
                                            properties: {
                                                NestedProp: {
                                                    type: 'string',
                                                    description: 'Nested property in oneOf inside anyOf',
                                                },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }),
            );

            const results = testSchema.resolveJsonPointerPath('/properties/ComplexProp/NestedProp');
            expect(results).toHaveLength(1);
            expect(results[0]).toMatchObject({
                type: 'string',
                description: 'Nested property in oneOf inside anyOf',
            });
        });
    });

    describe('StorageConfiguration scenario', () => {
        it('should handle schema with properties and oneOf at same level', () => {
            const storageConfigSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::StorageConfig',
                    description: 'Test schema for StorageConfiguration',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        StorageConfiguration: {
                            type: 'object',
                            description: 'The vector store service in which the knowledge base is stored.',
                            properties: {
                                Type: { $ref: '#/definitions/KnowledgeBaseStorageType' },
                                OpensearchServerlessConfiguration: {
                                    $ref: '#/definitions/OpenSearchServerlessConfiguration',
                                },
                                PineconeConfiguration: { $ref: '#/definitions/PineconeConfiguration' },
                            },
                            required: ['Type'],
                            oneOf: [
                                { required: ['OpensearchServerlessConfiguration'] },
                                { required: ['PineconeConfiguration'] },
                            ],
                            additionalProperties: false,
                        },
                    },
                    definitions: {
                        KnowledgeBaseStorageType: { type: 'string' },
                        OpenSearchServerlessConfiguration: { type: 'object', additionalProperties: false },
                        PineconeConfiguration: { type: 'object', additionalProperties: false },
                    },
                }),
            );

            const result = storageConfigSchema.resolveJsonPointerPath('/properties/StorageConfiguration');

            expect(result).toHaveLength(2); // Should have 2 oneOf variants

            // Each variant should have the base properties and merged required constraints
            expect(result[0]).toMatchObject({
                type: 'object',
                properties: {
                    Type: { type: 'string' },
                    OpensearchServerlessConfiguration: { type: 'object' },
                    PineconeConfiguration: { type: 'object' },
                },
                required: ['Type', 'OpensearchServerlessConfiguration'],
            });

            expect(result[1]).toMatchObject({
                type: 'object',
                properties: {
                    Type: { type: 'string' },
                    OpensearchServerlessConfiguration: { type: 'object' },
                    PineconeConfiguration: { type: 'object' },
                },
                required: ['Type', 'PineconeConfiguration'],
            });
        });
    });

    describe('additional edge case coverage', () => {
        it('should handle array type checks in composition keywords', () => {
            const schemaWithArrayTypes = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::ArrayTypeResource',
                    description: 'Test resource with array types in composition',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleProp: {
                            oneOf: [
                                {
                                    type: ['object', 'null'],
                                    properties: {
                                        objectProp: { type: 'string' },
                                    },
                                },
                                {
                                    type: ['array', 'null'],
                                    items: { type: 'string' },
                                },
                            ],
                        },
                    },
                }),
            );

            const results = schemaWithArrayTypes.resolveJsonPointerPath('/properties/FlexibleProp/objectProp');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });

        it('should handle non-object composition schemas', () => {
            const nonObjectSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::NonObjectComposition',
                    description: 'Test resource with composition keywords on non-object types',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleValue: {
                            oneOf: [
                                {
                                    type: 'string',
                                    enum: ['option1', 'option2'],
                                },
                                {
                                    type: 'number',
                                    minimum: 0,
                                },
                            ],
                        },
                    },
                }),
            );

            // Should not find properties in non-object schemas
            const results = nonObjectSchema.resolveJsonPointerPath('/properties/FlexibleValue/nonExistentProp');
            expect(results).toHaveLength(0);
        });

        it('should handle recursive composition keyword traversal', () => {
            const recursiveSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::RecursiveComposition',
                    description: 'Test resource with recursive composition',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        NestedComposition: {
                            oneOf: [
                                {
                                    anyOf: [
                                        {
                                            type: 'object',
                                            properties: {
                                                deepProp: { type: 'string' },
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    },
                }),
            );

            const results = recursiveSchema.resolveJsonPointerPath('/properties/NestedComposition/deepProp');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });
    });

    it('should handle allOf merging in schema traversal', () => {
        const allOfMergingSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Test::AllOfMergingResource',
                description: 'Test resource with allOf merging in traversal',
                primaryIdentifier: ['/properties/Id'],
                additionalProperties: false,
                properties: {
                    Id: { type: 'string' },
                    ComplexObject: {
                        allOf: [
                            {
                                type: 'object',
                                properties: {
                                    baseProp: { type: 'string' },
                                    sharedProp: { type: 'string', description: 'From base' },
                                },
                            },
                            {
                                type: 'object',
                                properties: {
                                    extendedProp: { type: 'number' },
                                    sharedProp: { type: 'string', description: 'From extended' },
                                },
                            },
                            {
                                type: 'object',
                                properties: {
                                    finalProp: { type: 'boolean' },
                                },
                            },
                        ],
                    },
                },
            }),
        );

        // Test allOf merging by resolving paths
        const results = allOfMergingSchema.resolveJsonPointerPath('/properties/ComplexObject');
        expect(results).toHaveLength(1);
        expect(results[0].properties).toBeDefined();
        expect(results[0].properties!.baseProp).toBeDefined();
        expect(results[0].properties!.extendedProp).toBeDefined();
        expect(results[0].properties!.finalProp).toBeDefined();
        expect(results[0].properties!.sharedProp).toBeDefined();
    });

    it('should handle complex nested allOf scenarios', () => {
        const nestedAllOfSchema = new ResourceSchema(
            JSON.stringify({
                typeName: 'Test::NestedAllOfResource',
                description: 'Test resource with nested allOf scenarios',
                primaryIdentifier: ['/properties/Id'],
                additionalProperties: false,
                properties: {
                    Id: { type: 'string' },
                    NestedAllOf: {
                        allOf: [
                            {
                                allOf: [
                                    {
                                        type: 'object',
                                        properties: {
                                            deepProp1: { type: 'string' },
                                        },
                                    },
                                    {
                                        type: 'object',
                                        properties: {
                                            deepProp2: { type: 'number' },
                                        },
                                    },
                                ],
                            },
                            {
                                type: 'object',
                                properties: {
                                    topLevelProp: { type: 'boolean' },
                                },
                            },
                        ],
                    },
                },
            }),
        );

        const results = nestedAllOfSchema.resolveJsonPointerPath('/properties/NestedAllOf');
        expect(results).toHaveLength(1);
        expect(results[0].properties).toBeDefined();
        expect(results[0].properties!.deepProp1).toBeDefined();
        expect(results[0].properties!.deepProp2).toBeDefined();
        expect(results[0].properties!.topLevelProp).toBeDefined();
    });

    describe('complex schema composition', () => {
        it('should merge properties from multiple allOf schemas', () => {
            const complexAllOfSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::ComplexAllOf',
                    description: 'Test complex allOf merging',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        ComplexMerge: {
                            allOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        prop1: { type: 'string' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        prop2: { type: 'number' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        prop3: { type: 'boolean' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            // Traverse to trigger allOf merging
            const results = complexAllOfSchema.resolveJsonPointerPath('/properties/ComplexMerge');
            expect(results).toHaveLength(1);
            expect(results[0].properties).toBeDefined();
            expect(results[0].properties!.prop1).toBeDefined();
            expect(results[0].properties!.prop2).toBeDefined();
            expect(results[0].properties!.prop3).toBeDefined();

            // Also test deeper traversal
            const prop1Results = complexAllOfSchema.resolveJsonPointerPath('/properties/ComplexMerge/prop1');
            expect(prop1Results).toHaveLength(1);
            expect(prop1Results[0].type).toBe('string');
        });

        it('should handle additional property parsing edge cases', () => {
            // Test various property parsing scenarios
            const edgeCaseSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::EdgeCaseResource',
                    description: 'Test edge case property parsing',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        EdgeCase: {
                            type: 'object',
                            properties: {
                                nested: {
                                    type: 'object',
                                    properties: {
                                        deep: { type: 'string' },
                                    },
                                },
                            },
                        },
                    },
                }),
            );

            // Test nested property access
            const results = edgeCaseSchema.resolveJsonPointerPath('/properties/EdgeCase/nested/deep');
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });
    });

    describe('requireFullyResolved option', () => {
        it('should return empty array when requireFullyResolved is true and path cannot be resolved', () => {
            // Create a schema with a property that has type ["object", "string"] but no detailed schema
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource for requireFullyResolved',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleProperty: {
                            type: ['object', 'string'],
                            description: 'Can be object or string but no detailed schema provided',
                        },
                    },
                }),
            );

            // When requireFullyResolved is true, should return empty array for unresolved paths
            const results = testSchema.resolveJsonPointerPath('/properties/FlexibleProperty/SomeProperty', {
                requireFullyResolved: true,
            });
            expect(results).toHaveLength(0);
        });

        it('should return results when requireFullyResolved is false and path cannot be resolved', () => {
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource for requireFullyResolved',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        FlexibleProperty: {
                            type: ['object', 'string'],
                            description: 'Can be object or string but no detailed schema provided',
                        },
                    },
                }),
            );

            // When requireFullyResolved is false (default), should return empty array but not due to requireFullyResolved
            const results = testSchema.resolveJsonPointerPath('/properties/FlexibleProperty/SomeProperty', {
                requireFullyResolved: false,
            });
            expect(results).toHaveLength(0); // Still empty because path doesn't exist, not because of requireFullyResolved
        });

        it('should return results when requireFullyResolved is true and path can be fully resolved', () => {
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource for requireFullyResolved',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        WellDefinedProperty: {
                            type: 'object',
                            properties: {
                                NestedProperty: { type: 'string' },
                            },
                        },
                    },
                }),
            );

            // When requireFullyResolved is true and path exists, should return results
            const results = testSchema.resolveJsonPointerPath('/properties/WellDefinedProperty/NestedProperty', {
                requireFullyResolved: true,
            });
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });

        it('should work with composition keywords when requireFullyResolved is true', () => {
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource with composition keywords',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        CompositionProperty: {
                            oneOf: [
                                {
                                    type: 'object',
                                    properties: {
                                        StringVariant: { type: 'string' },
                                    },
                                },
                                {
                                    type: 'object',
                                    properties: {
                                        NumberVariant: { type: 'number' },
                                    },
                                },
                            ],
                        },
                    },
                }),
            );

            // Should find properties in composition keywords even with requireFullyResolved
            const results = testSchema.resolveJsonPointerPath('/properties/CompositionProperty/StringVariant', {
                requireFullyResolved: true,
            });
            expect(results).toHaveLength(1);
            expect(results[0].type).toBe('string');
        });

        it('should default requireFullyResolved to false when not specified', () => {
            const testSchema = new ResourceSchema(
                JSON.stringify({
                    typeName: 'Test::Resource',
                    description: 'Test resource for default requireFullyResolved',
                    primaryIdentifier: ['/properties/Id'],
                    additionalProperties: false,
                    properties: {
                        Id: { type: 'string' },
                        ValidProperty: { type: 'string' },
                    },
                }),
            );

            // Should work the same whether requireFullyResolved is explicitly false or not specified
            const explicitFalse = testSchema.resolveJsonPointerPath('/properties/ValidProperty', {
                requireFullyResolved: false,
            });
            const defaultBehavior = testSchema.resolveJsonPointerPath('/properties/ValidProperty');

            expect(explicitFalse).toEqual(defaultBehavior);
            expect(explicitFalse).toHaveLength(1);
            expect(explicitFalse[0].type).toBe('string');
        });
    });
});
