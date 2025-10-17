import { describe, expect, it } from 'vitest';
import { ResourceAttribute } from '../../../src/context/ContextType';
import { propertyTypesToMarkdown, getResourceAttributeValueDoc } from '../../../src/hover/HoverFormatter';
import { PropertyType } from '../../../src/schema/ResourceSchema';

describe('HoverFormatter', () => {
    describe('propertyTypesToMarkdown', () => {
        describe('single resolved schema', () => {
            it('should format a simple string property', () => {
                const stringProperty: PropertyType = {
                    type: 'string',
                    description: 'A simple string property',
                };

                const result = propertyTypesToMarkdown('MyString', [stringProperty]);

                expect(result).toContain('type MyString = string');
                expect(result).toContain('**Description**');
                expect(result).toContain('A simple string property');
            });

            it('should format a number property with constraints', () => {
                const numberProperty: PropertyType = {
                    type: 'number',
                    description: 'A number with constraints',
                    minimum: 1,
                    maximum: 100,
                };

                const result = propertyTypesToMarkdown('MyNumber', [numberProperty]);

                expect(result).toContain('type MyNumber = number');
                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Range:** 1 to 100');
            });

            it('should format an object property with properties', () => {
                const objectProperty: PropertyType = {
                    type: 'object',
                    description: 'An object with properties',
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'number' },
                        active: { type: 'boolean' },
                    },
                    required: ['name'],
                };

                const result = propertyTypesToMarkdown('MyObject', [objectProperty]);

                expect(result).toContain('type MyObject = { name: string; active?: boolean; age?: number }');
                expect(result).toContain('**Parameters**');
                expect(result).toContain('- **name** `string`');
                expect(result).toContain('- **age** `number` *(optional)*');
                expect(result).toContain('- **active** `boolean` *(optional)*');
            });

            it('should format an array property with item type', () => {
                const arrayProperty: PropertyType = {
                    type: 'array',
                    description: 'An array of strings',
                    items: {
                        type: 'string',
                    },
                };

                const result = propertyTypesToMarkdown('MyArray', [arrayProperty]);

                expect(result).toContain('type MyArray = string[]');
                expect(result).toContain('An array of strings');
            });

            it('should format an array with union item types', () => {
                const arrayProperty: PropertyType = {
                    type: 'array',
                    description: 'An array with union types',
                    items: {
                        type: ['string', 'number', 'boolean'],
                    },
                };

                const result = propertyTypesToMarkdown('MyUnionArray', [arrayProperty]);

                expect(result).toContain('type MyUnionArray = (string | number | boolean)[]');
            });

            it('should format an array of objects', () => {
                const arrayProperty: PropertyType = {
                    type: 'array',
                    description: 'An array of objects',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            value: { type: 'number' },
                        },
                        required: ['id'],
                    },
                };

                const result = propertyTypesToMarkdown('MyObjectArray', [arrayProperty]);

                expect(result).toContain('type MyObjectArray = { id: string; value?: number }[]');
            });

            it('should format a property with enum values', () => {
                const enumProperty: PropertyType = {
                    type: 'string',
                    description: 'A string with allowed values',
                    enum: ['small', 'medium', 'large'],
                };

                const result = propertyTypesToMarkdown('Size', [enumProperty]);

                expect(result).toContain('type Size = string');
                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Allowed values:** `small`, `medium`, `large`');
            });

            it('should format a property with pattern constraint', () => {
                const patternProperty: PropertyType = {
                    type: 'string',
                    description: 'A string with pattern',
                    pattern: '^[a-zA-Z0-9]+$',
                };

                const result = propertyTypesToMarkdown('AlphaNumeric', [patternProperty]);

                expect(result).toContain('**Pattern:** `^[a-zA-Z0-9]+$`');
            });

            it('should format a property with default value', () => {
                const defaultProperty: PropertyType = {
                    type: 'string',
                    description: 'A string with default',
                    default: 'default-value',
                };

                const result = propertyTypesToMarkdown('WithDefault', [defaultProperty]);

                expect(result).toContain('**Default:** `default-value`');
            });

            it('should handle property without description', () => {
                const noDescProperty: PropertyType = {
                    type: 'boolean',
                };

                const result = propertyTypesToMarkdown('NoDesc', [noDescProperty]);

                expect(result).toContain('type NoDesc = boolean');
                expect(result).not.toContain('**Description**');
            });

            it('should handle empty object', () => {
                const emptyObject: PropertyType = {
                    type: 'object',
                    description: 'An empty object',
                };

                const result = propertyTypesToMarkdown('EmptyObject', [emptyObject]);

                expect(result).toContain('type EmptyObject = object');
            });
        });

        describe('multiple resolved schemas', () => {
            it('should format multiple schema variants', () => {
                const schemas: PropertyType[] = [
                    {
                        type: 'string',
                        description: 'String variant',
                    },
                    {
                        type: 'number',
                        description: 'Number variant',
                    },
                ];

                const result = propertyTypesToMarkdown('MultiType', schemas);

                expect(result).toContain('type MultiType = string');
                expect(result).toContain('type MultiType = number');
                expect(result).toContain('String variant');
            });

            it('should limit variants display and show count', () => {
                const schemas: PropertyType[] = [
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' },
                    { type: 'object' },
                    { type: 'array' },
                ];

                const result = propertyTypesToMarkdown('ManyVariants', schemas);

                expect(result).toContain('type ManyVariants = string');
                expect(result).toContain('type ManyVariants = number');
                expect(result).toContain('type ManyVariants = boolean');
                expect(result).toContain('// +2 more options');
            });

            it('should handle exactly 4 schemas (singular "option" message)', () => {
                const schemas: PropertyType[] = [
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' },
                    { type: 'object' },
                ];

                const result = propertyTypesToMarkdown('FourVariants', schemas);

                expect(result).toContain('type FourVariants = string');
                expect(result).toContain('type FourVariants = number');
                expect(result).toContain('type FourVariants = boolean');
                expect(result).toContain('// +1 more option');
                expect(result).not.toContain('options');
            });

            it('should collect properties from all schemas with smart requirement analysis', () => {
                const schemas: PropertyType[] = [
                    {
                        type: 'object',
                        properties: {
                            name: { type: 'string', description: 'The name' },
                            age: { type: 'number' },
                            id: { type: 'string' },
                        },
                        required: ['name', 'id'],
                    },
                    {
                        type: 'object',
                        properties: {
                            name: { type: 'string' }, // required in both schemas
                            email: { type: 'string', description: 'The email' },
                            id: { type: 'string' }, // required in first schema only
                        },
                        required: ['name'],
                    },
                ];

                const result = propertyTypesToMarkdown('CombinedObject', schemas);

                expect(result).toContain('**Parameters**');
                expect(result).toContain('- **name** `string` *(required)* - The name'); // always required
                expect(result).toContain('- **age** `number` *(optional)*'); // never required
                expect(result).toContain('- **email** `string` *(optional)* - The email'); // never required
                expect(result).toContain('- **id** `string` *(sometimes required)*'); // sometimes required
            });

            it('should collect pattern properties from multiple schemas', () => {
                const schemas: PropertyType[] = [
                    {
                        type: 'object',
                        properties: {
                            name: { type: 'string' },
                        },
                        patternProperties: {
                            '^config_': { type: 'string', description: 'Configuration value' },
                        },
                    },
                    {
                        type: 'object',
                        patternProperties: {
                            '^data_': { type: 'number', description: 'Data value' },
                        },
                    },
                ];

                const result = propertyTypesToMarkdown('MultiPattern', schemas);

                expect(result).toContain('**Parameters**');
                expect(result).toContain('- **name** `string`');
                expect(result).toContain('- **[pattern: `^config_`]** `string` - Configuration value');
                expect(result).toContain('- **[pattern: `^data_`]** `number` - Data value');
            });

            it('should show constraints from first schema with constraints', () => {
                const schemas: PropertyType[] = [
                    {
                        type: 'string',
                        description: 'First schema without constraints',
                    },
                    {
                        type: 'string',
                        description: 'Second schema with constraints',
                        minLength: 5,
                        maxLength: 20,
                        pattern: '^[A-Z]',
                    },
                ];

                const result = propertyTypesToMarkdown('WithConstraints', schemas);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Length:** 5 to 20 characters');
                expect(result).toContain('**Pattern:** `^[A-Z]`');
            });
        });

        describe('edge cases', () => {
            it('should handle empty schemas array', () => {
                const result = propertyTypesToMarkdown('Empty', []);

                expect(result).toBe('No schema found for `Empty`');
            });

            it('should handle complex nested objects', () => {
                const complexProperty: PropertyType = {
                    type: 'object',
                    description: 'A complex nested object',
                    properties: {
                        metadata: {
                            type: 'object',
                            properties: {
                                tags: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            key: { type: 'string' },
                                            value: { type: 'string' },
                                        },
                                    },
                                },
                            },
                        },
                    },
                };

                const result = propertyTypesToMarkdown('Complex', [complexProperty]);

                expect(result).toContain('type Complex = { metadata?: object }');
                expect(result).toContain('- **metadata** `object` *(optional)*');
            });

            it('should handle pattern properties', () => {
                const patternProperty: PropertyType = {
                    type: 'object',
                    description: 'Object with pattern properties',
                    patternProperties: {
                        '^[a-z]+$': { type: 'string' },
                    },
                };

                const result = propertyTypesToMarkdown('PatternObject', [patternProperty]);

                expect(result).toContain('[key: string /* ^[a-z]+$ */]: string');
            });

            it('should handle array constraints', () => {
                const arrayProperty: PropertyType = {
                    type: 'array',
                    description: 'Array with constraints',
                    items: { type: 'string' },
                    minItems: 1,
                    maxItems: 10,
                    uniqueItems: true,
                };

                const result = propertyTypesToMarkdown('ConstrainedArray', [arrayProperty]);

                expect(result).toContain('**Array size:** 1 to 10 items');
                expect(result).toContain('**Unique items:** All array items must be unique');
            });

            it('should handle schema without type but with properties', () => {
                const schemaProperty: PropertyType = {
                    description: 'Schema without explicit type',
                    properties: {
                        name: { type: 'string' },
                        value: { type: 'number' },
                    },
                };

                const result = propertyTypesToMarkdown('NoTypeSchema', [schemaProperty]);

                expect(result).toContain('type NoTypeSchema = { name?: string; value?: number }');
                expect(result).toContain('**Parameters**');
                expect(result).toContain('- **name** `string` *(optional)*');
            });

            it('should handle object with only pattern properties', () => {
                const patternOnlyProperty: PropertyType = {
                    type: 'object',
                    description: 'Object with only pattern properties',
                    patternProperties: {
                        '^[a-z]+$': { type: 'string', description: 'Lowercase key' },
                        '^[A-Z]+$': { type: 'number', description: 'Uppercase key' },
                    },
                };

                const result = propertyTypesToMarkdown('PatternOnly', [patternOnlyProperty]);

                expect(result).toContain(
                    '{ [key: string /* ^[a-z]+$ */]: string; [key: string /* ^[A-Z]+$ */]: number }',
                );
            });

            it('should handle StorageConfiguration-like complex schema', () => {
                const storageSchema: PropertyType = {
                    type: 'object',
                    description: 'Storage configuration with multiple options',
                    properties: {
                        Type: {
                            type: 'string',
                            description: 'The type of storage configuration',
                            enum: ['OpenSearchServerless', 'Pinecone'],
                        },
                        OpensearchServerlessConfiguration: {
                            type: 'object',
                            properties: {
                                CollectionArn: { type: 'string', description: 'ARN of the collection' },
                                VectorIndexName: { type: 'string', description: 'Name of the vector index' },
                            },
                        },
                        PineconeConfiguration: {
                            type: 'object',
                            properties: {
                                ConnectionString: { type: 'string', description: 'Connection string' },
                                CredentialsSecretArn: { type: 'string', description: 'Credentials ARN' },
                            },
                        },
                    },
                    required: ['Type'],
                };

                const result = propertyTypesToMarkdown('StorageConfiguration', [storageSchema]);

                expect(result).toContain(
                    'type StorageConfiguration = { Type: string; OpensearchServerlessConfiguration?: object; PineconeConfiguration?: object }',
                );
                expect(result).toContain('**Parameters**');
                expect(result).toContain('- **Type** `string` - The type of storage configuration');
                expect(result).toContain('- **OpensearchServerlessConfiguration** `object` *(optional)*');
                expect(result).toContain('- **PineconeConfiguration** `object` *(optional)*');
            });

            it('should handle schema with root-level constraints', () => {
                const constrainedSchema: PropertyType = {
                    type: 'string',
                    description: 'A string with root constraints',
                    enum: ['option1', 'option2', 'option3'],
                    minLength: 5,
                };

                const result = propertyTypesToMarkdown('ConstrainedString', [constrainedSchema]);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Allowed values:** `option1`, `option2`, `option3`');
                expect(result).toContain('**Length:** 5 to no limit characters');
            });

            it('should handle numeric constraints (exclusive range and multipleOf)', () => {
                const numericSchema: PropertyType = {
                    type: 'number',
                    description: 'Number with exclusive constraints',
                    exclusiveMinimum: 0,
                    exclusiveMaximum: 100,
                    multipleOf: 5,
                };

                const result = propertyTypesToMarkdown('ExclusiveNumber', [numericSchema]);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Exclusive range:** > 0 and < 100');
                expect(result).toContain('**Multiple of:** 5');
            });

            it('should handle object property constraints', () => {
                const objectSchema: PropertyType = {
                    type: 'object',
                    description: 'Object with property constraints',
                    minProperties: 2,
                    maxProperties: 10,
                    patternProperties: {
                        '^[a-z]+$': { type: 'string' },
                        '^[A-Z]+$': { type: 'number' },
                    },
                };

                const result = propertyTypesToMarkdown('ConstrainedObject', [objectSchema]);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Object size:** 2 to 10 properties');
                expect(result).toContain('**Property patterns:** `^[a-z]+$`, `^[A-Z]+$`');
            });

            it('should handle property dependencies', () => {
                const dependencySchema: PropertyType = {
                    type: 'object',
                    description: 'Object with property dependencies',
                    properties: {
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone: { type: 'string' },
                        address: { type: 'object' },
                    },
                    dependencies: {
                        email: ['name', 'phone'],
                        address: {
                            type: 'object',
                            properties: {
                                street: { type: 'string' },
                            },
                        },
                    },
                };

                const result = propertyTypesToMarkdown('DependencyObject', [dependencySchema]);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**When `email` exists:** Must also include `name`, `phone`');
                expect(result).toContain('**When `address` exists:** Must satisfy additional schema');
            });

            it('should handle union types with array type checks', () => {
                const unionSchema: PropertyType = {
                    type: 'object',
                    description: 'Object with union type properties',
                    properties: {
                        nullableString: {
                            type: ['string', 'null'],
                            minLength: 3,
                        },
                        nullableNumber: {
                            type: ['number', 'null'],
                            minimum: 0,
                            maximum: 100,
                        },
                        nullableArray: {
                            type: ['array', 'null'],
                            minItems: 1,
                            maxItems: 5,
                        },
                        nullableObject: {
                            type: ['object', 'null'],
                            minProperties: 1,
                            maxProperties: 3,
                        },
                    },
                };

                const result = propertyTypesToMarkdown('UnionTypes', [unionSchema]);

                expect(result).toContain(
                    'type UnionTypes = { nullableArray?: unknown[]; nullableNumber?: number | null; nullableObject?: object; nullableString?: string | null }',
                );
                expect(result).toContain('- **nullableString** `string | null` *(optional)*');
                expect(result).toContain('- **nullableNumber** `number | null` *(optional)*');
                expect(result).toContain('- **nullableArray** `unknown[]` *(optional)*');
                expect(result).toContain('- **nullableObject** `object` *(optional)*');
            });

            it('should handle array without items type (unknown[])', () => {
                const arraySchema: PropertyType = {
                    type: 'array',
                    description: 'Array without items specification',
                };

                const result = propertyTypesToMarkdown('UnknownArray', [arraySchema]);

                expect(result).toContain('type UnknownArray = unknown[]');
            });

            it('should handle object with no properties (empty object)', () => {
                const emptyObjectSchema: PropertyType = {
                    type: 'object',
                    description: 'Empty object with no properties',
                };

                const result = propertyTypesToMarkdown('EmptyObj', [emptyObjectSchema]);

                expect(result).toContain('type EmptyObj = object');
            });

            it('should handle const value constraint', () => {
                const constSchema: PropertyType = {
                    type: 'string',
                    description: 'String with constant value',
                    const: 'FIXED_VALUE',
                };

                const result = propertyTypesToMarkdown('ConstString', [constSchema]);

                expect(result).toContain('**Constraints**');
                expect(result).toContain('**Constant value:** `FIXED_VALUE`');
            });

            it('should handle array with object items (shows detailed structure)', () => {
                const arraySchema: PropertyType = {
                    type: 'array',
                    description: 'Array of objects',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                        },
                    },
                };

                const result = propertyTypesToMarkdown('ObjectArray', [arraySchema]);

                expect(result).toContain('type ObjectArray = { id?: string; name?: string }[]');
                expect(result).toContain('- **id** `string` *(optional)*');
                expect(result).toContain('- **name** `string` *(optional)*');
            });

            it('should handle array with items having properties but no type', () => {
                const arraySchema: PropertyType = {
                    type: 'array',
                    description: 'Array with items having properties',
                    items: {
                        properties: {
                            value: { type: 'string' },
                        },
                    },
                };

                const result = propertyTypesToMarkdown('PropsArray', [arraySchema]);

                expect(result).toContain('type PropsArray = { value?: string }[]');
                expect(result).toContain('- **value** `string` *(optional)*');
            });

            it('should handle array with items having no type (defaults to unknown[])', () => {
                const arraySchema: PropertyType = {
                    type: 'array',
                    description: 'Array with untyped items',
                    items: {
                        description: 'Some item without type',
                    },
                };

                const result = propertyTypesToMarkdown('UntypedArray', [arraySchema]);

                expect(result).toContain('type UntypedArray = unknown[]');
            });

            it('should handle schema with const value in type signature', () => {
                const constSchema: PropertyType = {
                    description: 'Schema with const value only',
                    const: 'CONSTANT_VALUE',
                };

                const result = propertyTypesToMarkdown('ConstOnly', [constSchema]);

                expect(result).toContain('type ConstOnly = "CONSTANT_VALUE"');
            });

            it('should handle schema with no type and no properties (unknown)', () => {
                const unknownSchema: PropertyType = {
                    description: 'Schema with no type information',
                };

                const result = propertyTypesToMarkdown('Unknown', [unknownSchema]);

                expect(result).toContain('type Unknown = unknown');
            });

            it('should handle object with both regular properties and pattern properties', () => {
                const mixedSchema: PropertyType = {
                    type: 'object',
                    description: 'Object with mixed property types',
                    properties: {
                        name: { type: 'string' },
                        age: { type: 'number' },
                    },
                    patternProperties: {
                        '^config_': { type: 'string' },
                        '^data_\\d+$': { type: 'number' },
                    },
                    required: ['name'],
                };

                const result = propertyTypesToMarkdown('MixedObject', [mixedSchema]);

                expect(result).toContain(
                    'type MixedObject = { name: string; age?: number; [key: string /* ^config_ */]: string; [key: string /* ^data_\\d+$ */]: number }',
                );
                expect(result).toContain('- **name** `string`');
                expect(result).toContain('- **age** `number` *(optional)*');
            });

            it('should handle object with ONLY pattern properties (no regular properties)', () => {
                const patternOnlySchema: PropertyType = {
                    type: 'object',
                    description: 'Object with only pattern properties',
                    patternProperties: {
                        '^[a-z]+$': { type: 'string' },
                        '^[A-Z]+$': { type: 'number' },
                    },
                };

                const result = propertyTypesToMarkdown('PatternOnlyObject', [patternOnlySchema]);

                expect(result).toContain(
                    '{ [key: string /* ^[a-z]+$ */]: string; [key: string /* ^[A-Z]+$ */]: number }',
                );
                expect(result).toContain('- **[pattern: `^[a-z]+$`]** `string`');
                expect(result).toContain('- **[pattern: `^[A-Z]+$`]** `number`');
            });
        });

        describe('property sorting', () => {
            it('should sort properties with required first, then optional, both alphabetized', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with mixed required and optional properties',
                    properties: {
                        zOptional: { type: 'string', description: 'Last optional property' },
                        aRequired: { type: 'string', description: 'First required property' },
                        bOptional: { type: 'number', description: 'Second optional property' },
                        yRequired: { type: 'boolean', description: 'Second required property' },
                        mOptional: { type: 'object', description: 'Middle optional property' },
                        cRequired: { type: 'array', description: 'Third required property' },
                    },
                    required: ['aRequired', 'yRequired', 'cRequired'],
                };

                const result = propertyTypesToMarkdown('SortedProperties', [property]);

                // Extract parameter lines to check order
                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 6 parameter lines
                expect(parameterLines).toHaveLength(6);

                // Required properties should come first (alphabetized)
                expect(parameterLines[0]).toContain('aRequired');
                expect(parameterLines[0]).not.toContain('*(optional)*');
                expect(parameterLines[0]).toContain('First required property');

                expect(parameterLines[1]).toContain('cRequired');
                expect(parameterLines[1]).not.toContain('*(optional)*');
                expect(parameterLines[1]).toContain('Third required property');

                expect(parameterLines[2]).toContain('yRequired');
                expect(parameterLines[2]).not.toContain('*(optional)*');
                expect(parameterLines[2]).toContain('Second required property');

                // Optional properties should come after (alphabetized)
                expect(parameterLines[3]).toContain('bOptional');
                expect(parameterLines[3]).toContain('*(optional)*');
                expect(parameterLines[3]).toContain('Second optional property');

                expect(parameterLines[4]).toContain('mOptional');
                expect(parameterLines[4]).toContain('*(optional)*');
                expect(parameterLines[4]).toContain('Middle optional property');

                expect(parameterLines[5]).toContain('zOptional');
                expect(parameterLines[5]).toContain('*(optional)*');
                expect(parameterLines[5]).toContain('Last optional property');
            });

            it('should handle multiple schemas with different requirement statuses and sort correctly', () => {
                const schema1: PropertyType = {
                    type: 'object',
                    properties: {
                        zAlwaysRequired: { type: 'string', description: 'Always required property' },
                        bSometimesRequired: { type: 'string', description: 'Sometimes required property' },
                        aNeverRequired: { type: 'string', description: 'Never required property' },
                        ySometimesRequired: { type: 'number', description: 'Another sometimes required' },
                        cAlwaysRequired: { type: 'boolean', description: 'Another always required' },
                    },
                    required: ['zAlwaysRequired', 'cAlwaysRequired', 'bSometimesRequired', 'ySometimesRequired'],
                };

                const schema2: PropertyType = {
                    type: 'object',
                    properties: {
                        zAlwaysRequired: { type: 'string', description: 'Always required property' },
                        bSometimesRequired: { type: 'string', description: 'Sometimes required property' },
                        aNeverRequired: { type: 'string', description: 'Never required property' },
                        ySometimesRequired: { type: 'number', description: 'Another sometimes required' },
                        cAlwaysRequired: { type: 'boolean', description: 'Another always required' },
                    },
                    required: ['zAlwaysRequired', 'cAlwaysRequired'], // bSometimesRequired and ySometimesRequired not required here
                };

                const result = propertyTypesToMarkdown('MultiSchemaSort', [schema1, schema2]);

                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 5 parameter lines
                expect(parameterLines).toHaveLength(5);

                // Always required should come first (alphabetized)
                expect(parameterLines[0]).toContain('cAlwaysRequired');
                expect(parameterLines[0]).toContain('*(required)*');

                expect(parameterLines[1]).toContain('zAlwaysRequired');
                expect(parameterLines[1]).toContain('*(required)*');

                // Sometimes required should come second (alphabetized)
                expect(parameterLines[2]).toContain('bSometimesRequired');
                expect(parameterLines[2]).toContain('*(sometimes required)*');

                expect(parameterLines[3]).toContain('ySometimesRequired');
                expect(parameterLines[3]).toContain('*(sometimes required)*');

                // Never required should come last
                expect(parameterLines[4]).toContain('aNeverRequired');
                expect(parameterLines[4]).toContain('*(optional)*');
            });

            it('should sort properties correctly when no required properties exist', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with only optional properties',
                    properties: {
                        zebra: { type: 'string', description: 'Last alphabetically' },
                        alpha: { type: 'number', description: 'First alphabetically' },
                        beta: { type: 'boolean', description: 'Second alphabetically' },
                        gamma: { type: 'object', description: 'Third alphabetically' },
                    },
                    // No required array
                };

                const result = propertyTypesToMarkdown('AllOptional', [property]);

                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 4 parameter lines, all optional, alphabetized
                expect(parameterLines).toHaveLength(4);

                expect(parameterLines[0]).toContain('alpha');
                expect(parameterLines[0]).toContain('*(optional)*');

                expect(parameterLines[1]).toContain('beta');
                expect(parameterLines[1]).toContain('*(optional)*');

                expect(parameterLines[2]).toContain('gamma');
                expect(parameterLines[2]).toContain('*(optional)*');

                expect(parameterLines[3]).toContain('zebra');
                expect(parameterLines[3]).toContain('*(optional)*');
            });

            it('should sort properties correctly when all properties are required', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with all required properties',
                    properties: {
                        zebra: { type: 'string', description: 'Last alphabetically' },
                        alpha: { type: 'number', description: 'First alphabetically' },
                        beta: { type: 'boolean', description: 'Second alphabetically' },
                        gamma: { type: 'object', description: 'Third alphabetically' },
                    },
                    required: ['zebra', 'alpha', 'beta', 'gamma'],
                };

                const result = propertyTypesToMarkdown('AllRequired', [property]);

                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 4 parameter lines, all required, alphabetized
                expect(parameterLines).toHaveLength(4);

                expect(parameterLines[0]).toContain('alpha');
                expect(parameterLines[0]).not.toContain('*(optional)*');

                expect(parameterLines[1]).toContain('beta');
                expect(parameterLines[1]).not.toContain('*(optional)*');

                expect(parameterLines[2]).toContain('gamma');
                expect(parameterLines[2]).not.toContain('*(optional)*');

                expect(parameterLines[3]).toContain('zebra');
                expect(parameterLines[3]).not.toContain('*(optional)*');
            });

            it('should sort properties correctly in array items', () => {
                const arrayProperty: PropertyType = {
                    type: 'array',
                    description: 'Array with sorted object items',
                    items: {
                        type: 'object',
                        properties: {
                            zOptional: { type: 'string', description: 'Optional property' },
                            aRequired: { type: 'string', description: 'Required property' },
                            bOptional: { type: 'number', description: 'Another optional' },
                            yRequired: { type: 'boolean', description: 'Another required' },
                        },
                        required: ['aRequired', 'yRequired'],
                    },
                };

                const result = propertyTypesToMarkdown('SortedArrayItems', [arrayProperty]);

                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 4 parameter lines
                expect(parameterLines).toHaveLength(4);

                // Required properties first (alphabetized)
                expect(parameterLines[0]).toContain('aRequired');
                expect(parameterLines[0]).not.toContain('*(optional)*');

                expect(parameterLines[1]).toContain('yRequired');
                expect(parameterLines[1]).not.toContain('*(optional)*');

                // Optional properties after (alphabetized)
                expect(parameterLines[2]).toContain('bOptional');
                expect(parameterLines[2]).toContain('*(optional)*');

                expect(parameterLines[3]).toContain('zOptional');
                expect(parameterLines[3]).toContain('*(optional)*');
            });

            it('should maintain sorting with pattern properties (pattern properties come after regular properties)', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with regular and pattern properties',
                    properties: {
                        zOptional: { type: 'string', description: 'Optional regular property' },
                        aRequired: { type: 'string', description: 'Required regular property' },
                    },
                    patternProperties: {
                        '^config_': { type: 'string', description: 'Configuration pattern' },
                        '^data_': { type: 'number', description: 'Data pattern' },
                    },
                    required: ['aRequired'],
                };

                const result = propertyTypesToMarkdown('MixedWithPatterns', [property]);

                const lines = result.split('\n');
                const parameterLines = lines.filter((line) => line.startsWith('- **'));

                // Should have 4 parameter lines (2 regular + 2 pattern)
                expect(parameterLines).toHaveLength(4);

                // Required regular properties first
                expect(parameterLines[0]).toContain('aRequired');
                expect(parameterLines[0]).not.toContain('*(optional)*');
                expect(parameterLines[0]).not.toContain('[pattern:');

                // Optional regular properties second
                expect(parameterLines[1]).toContain('zOptional');
                expect(parameterLines[1]).toContain('*(optional)*');
                expect(parameterLines[1]).not.toContain('[pattern:');

                // Pattern properties come after regular properties
                expect(parameterLines[2]).toContain('[pattern:');
                expect(parameterLines[3]).toContain('[pattern:');
            });

            it('should sort properties in TypeScript type signatures', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with mixed required and optional properties for type signature',
                    properties: {
                        zOptional: { type: 'string' },
                        aRequired: { type: 'number' },
                        bOptional: { type: 'boolean' },
                        yRequired: { type: 'object' },
                    },
                    required: ['aRequired', 'yRequired'],
                };

                const result = propertyTypesToMarkdown('TypeSignatureSort', [property]);

                // Extract the TypeScript type signature line
                const lines = result.split('\n');
                const typeSignatureLine = lines.find((line) => line.includes('type TypeSignatureSort ='));

                expect(typeSignatureLine).toBeDefined();

                // The type signature should have required properties first, then optional, both alphabetized
                // Expected order: aRequired, yRequired, bOptional, zOptional
                expect(typeSignatureLine).toContain('aRequired: number');
                expect(typeSignatureLine).toContain('yRequired: object');
                expect(typeSignatureLine).toContain('bOptional?: boolean');
                expect(typeSignatureLine).toContain('zOptional?: string');

                // Check that required properties come before optional ones
                const aRequiredIndex = typeSignatureLine!.indexOf('aRequired');
                const yRequiredIndex = typeSignatureLine!.indexOf('yRequired');
                const bOptionalIndex = typeSignatureLine!.indexOf('bOptional');
                const zOptionalIndex = typeSignatureLine!.indexOf('zOptional');

                // Required properties should come first
                expect(aRequiredIndex).toBeLessThan(bOptionalIndex);
                expect(aRequiredIndex).toBeLessThan(zOptionalIndex);
                expect(yRequiredIndex).toBeLessThan(bOptionalIndex);
                expect(yRequiredIndex).toBeLessThan(zOptionalIndex);

                // Within required properties, should be alphabetized (aRequired before yRequired)
                expect(aRequiredIndex).toBeLessThan(yRequiredIndex);

                // Within optional properties, should be alphabetized (bOptional before zOptional)
                expect(bOptionalIndex).toBeLessThan(zOptionalIndex);
            });

            it('should sort properties in nested object type signatures', () => {
                const property: PropertyType = {
                    type: 'object',
                    description: 'Object with nested object that has sorted properties',
                    properties: {
                        nestedObject: {
                            type: 'object',
                            properties: {
                                zOptional: { type: 'string' },
                                aRequired: { type: 'number' },
                                bOptional: { type: 'boolean' },
                            },
                            required: ['aRequired'],
                        },
                    },
                };

                const result = propertyTypesToMarkdown('NestedSort', [property]);

                // Extract the TypeScript type signature line
                const lines = result.split('\n');
                const typeSignatureLine = lines.find((line) => line.includes('type NestedSort ='));

                expect(typeSignatureLine).toBeDefined();

                // For nested objects, the getSimplifiedTypeString function simplifies them to just 'object'
                // This is expected behavior for concise display in type signatures
                expect(typeSignatureLine).toContain('nestedObject?: object');
            });
        });
    });

    describe('getResourceAttributeValueDoc', () => {
        it('should return documentation for UpdateReplacePolicy Delete value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.UpdateReplacePolicy, 'Delete');

            expect(result).toBeDefined();
            expect(result).toContain('**Delete**');
            expect(result).toContain('CloudFormation deletes the resource');
            expect(result).toContain('and all its content if applicable during resource replacement');
            expect(result).toContain('Source Documentation');
        });

        it('should return documentation for UpdateReplacePolicy Retain value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.UpdateReplacePolicy, 'Retain');

            expect(result).toBeDefined();
            expect(result).toContain('**Retain**');
            expect(result).toContain('CloudFormation keeps the resource');
            expect(result).toContain('without deleting the resource or its contents when the resource is replaced');
            expect(result).toContain('Source Documentation');
        });

        it('should return documentation for UpdateReplacePolicy Snapshot value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.UpdateReplacePolicy, 'Snapshot');

            expect(result).toBeDefined();
            expect(result).toContain('**Snapshot**');
            expect(result).toContain('CloudFormation creates a snapshot for the resource before deleting it');
            expect(result).toContain('Resources that support snapshots include:');
            expect(result).toContain('AWS::EC2::Volume');
            expect(result).toContain('Source Documentation');
        });

        it('should return undefined for invalid UpdateReplacePolicy values', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.UpdateReplacePolicy, 'InvalidValue');

            expect(result).toBeUndefined();
        });

        it('should return documentation for DeletionPolicy Delete value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.DeletionPolicy, 'Delete');

            expect(result).toBeDefined();
            expect(result).toContain('**Delete**');
        });

        it('should return documentation for DeletionPolicy Retain value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.DeletionPolicy, 'Retain');

            expect(result).toBeDefined();
            expect(result).toContain('**Retain**');
        });

        it('should return documentation for DeletionPolicy Snapshot value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.DeletionPolicy, 'Snapshot');

            expect(result).toBeDefined();
            expect(result).toContain('**Snapshot**');
        });

        it('should return documentation for DeletionPolicy RetainExceptOnCreate value', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.DeletionPolicy, 'RetainExceptOnCreate');

            expect(result).toBeDefined();
            expect(result).toContain('**RetainExceptOnCreate**');
        });

        it('should return undefined for invalid DeletionPolicy values', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.DeletionPolicy, 'InvalidValue');

            expect(result).toBeUndefined();
        });

        it('should return undefined for unsupported resource attributes', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.Condition, 'SomeValue');

            expect(result).toBeUndefined();
        });

        it('should return undefined for CreationPolicy attribute (not supported)', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.CreationPolicy, 'SomeValue');

            expect(result).toBeUndefined();
        });

        it('should return undefined for UpdatePolicy attribute (not supported)', () => {
            const result = getResourceAttributeValueDoc(ResourceAttribute.UpdatePolicy, 'SomeValue');

            expect(result).toBeUndefined();
        });
    });
});
