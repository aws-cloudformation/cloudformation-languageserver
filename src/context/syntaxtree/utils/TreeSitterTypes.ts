export enum FieldNames {
    KEY = 'key',
    VALUE = 'value',
}

export enum JsonNodeTypes {
    OBJECT = 'object',
    PAIR = 'pair', // represents a key-value pair
    ARRAY = 'array',
    // Scalar types
    STRING = 'string',
    NUMBER = 'number',
    TRUE = 'true',
    FALSE = 'false',
    NULL = 'null',
}

export enum YamlNodeTypes {
    // Structural Wrappers & Metadata
    BLOCK_NODE = 'block_node',
    FLOW_NODE = 'flow_node',
    TAG = 'tag',

    // Mappings (Objects)
    BLOCK_MAPPING = 'block_mapping',
    FLOW_MAPPING = 'flow_mapping',
    BLOCK_MAPPING_PAIR = 'block_mapping_pair',
    FLOW_PAIR = 'flow_pair',

    // Sequences (Arrays)
    BLOCK_SEQUENCE = 'block_sequence',
    FLOW_SEQUENCE = 'flow_sequence',
    BLOCK_SEQUENCE_ITEM = 'block_sequence_item',
    FLOW_SEQUENCE_ITEM = 'flow_sequence_item',

    // Scalar types
    BOOLEAN_SCALAR = 'boolean_scalar',
    FLOAT_SCALAR = 'float_scalar',
    INTEGER_SCALAR = 'integer_scalar',
    NULL_SCALAR = 'null_scalar',
    STRING_SCALAR = 'string_scalar',
    TIMESTAMP_SCALAR = 'timestamp_scalar',
    BLOCK_SCALAR = 'block_scalar',
    DOUBLE_QUOTE_SCALAR = 'double_quote_scalar',
    SINGLE_QUOTE_SCALAR = 'single_quote_scalar',
}

export enum CommonNodeTypes {
    DOCUMENT = 'document',
    STREAM = 'stream',
    ERROR = 'ERROR',
    SYNTHETIC_ENTITY = 'synthetic_entity',
    SYNTHETIC_KEY = 'synthetic_key',
    SYNTHETIC_VALUE = 'synthetic_value',
    SYNTHETIC_KEY_OR_VALUE = 'synthetic_key_or_value',
}

export const JSON_NODE_SETS: Record<'object' | 'pair' | 'array' | 'scalar', ReadonlySet<string>> = {
    object: new Set([JsonNodeTypes.OBJECT]),
    pair: new Set([JsonNodeTypes.PAIR]),
    array: new Set([JsonNodeTypes.ARRAY]),
    scalar: new Set([
        JsonNodeTypes.STRING,
        JsonNodeTypes.NUMBER,
        JsonNodeTypes.TRUE,
        JsonNodeTypes.FALSE,
        JsonNodeTypes.NULL,
    ]),
} as const;

export const YAML_NODE_SETS: Record<
    'mapping' | 'pair' | 'sequence' | 'sequence_item' | 'scalar',
    ReadonlySet<string>
> = {
    mapping: new Set([YamlNodeTypes.BLOCK_MAPPING, YamlNodeTypes.FLOW_MAPPING]),
    pair: new Set([YamlNodeTypes.BLOCK_MAPPING_PAIR, YamlNodeTypes.FLOW_PAIR]),
    sequence: new Set([YamlNodeTypes.BLOCK_SEQUENCE, YamlNodeTypes.FLOW_SEQUENCE]),
    sequence_item: new Set([YamlNodeTypes.BLOCK_SEQUENCE_ITEM, YamlNodeTypes.FLOW_SEQUENCE_ITEM]),
    scalar: new Set([
        YamlNodeTypes.BOOLEAN_SCALAR,
        YamlNodeTypes.FLOAT_SCALAR,
        YamlNodeTypes.INTEGER_SCALAR,
        YamlNodeTypes.NULL_SCALAR,
        YamlNodeTypes.STRING_SCALAR,
        YamlNodeTypes.TIMESTAMP_SCALAR,
        YamlNodeTypes.BLOCK_SCALAR,
        YamlNodeTypes.DOUBLE_QUOTE_SCALAR,
        YamlNodeTypes.SINGLE_QUOTE_SCALAR,
    ]),
} as const;

export const LARGE_NODE_TYPES: ReadonlySet<string> = new Set([CommonNodeTypes.DOCUMENT, CommonNodeTypes.STREAM]);
