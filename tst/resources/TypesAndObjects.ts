import { PropertyType } from '../../src/schema/ResourceSchema';

export const testProperty: PropertyType = {
    type: ['string', 'number'],
    description: 'A comprehensive test property that demonstrates all possible fields',
    $ref: '#/definitions/TestReference',
    pattern: '^[A-Za-z0-9]+$',
    enum: ['option1', 'option2', 42, true],
    const: 'constantValue',
    default: 'defaultValue',
    format: 'email',
    minimum: 0,
    maximum: 100,
    exclusiveMinimum: true,
    exclusiveMaximum: false,
    minLength: 5,
    maxLength: 50,
    minItems: 1,
    maxItems: 10,
    uniqueItems: true,
    insertionOrder: false,
    arrayType: 'AttributeList',
    items: {
        type: 'string',
        description: 'Array item description',
        minLength: 2,
    },
    properties: {
        name: {
            type: 'string',
            description: 'The name property',
            minLength: 1,
            maxLength: 100,
        },
        age: {
            type: 'number',
            description: 'The age property',
            minimum: 0,
            maximum: 150,
        },
        tags: {
            type: 'array',
            description: 'List of tags',
            items: {
                type: 'string',
            },
            uniqueItems: true,
        },
    },
    required: ['name', 'age'],
    additionalProperties: {
        type: 'string',
        description: 'Additional string properties allowed',
    },
    patternProperties: {
        '^prefix_': {
            type: 'number',
            description: "Properties starting with 'prefix_' must be numbers",
        },
        _suffix$: {
            type: 'boolean',
            description: "Properties ending with '_suffix' must be booleans",
        },
    },
    allOf: [{ type: 'object' }, { required: ['name'] }],
    anyOf: [{ type: 'string' }, { type: 'number' }],
    oneOf: [{ format: 'email' }, { format: 'uri' }],
};
