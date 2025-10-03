import { LiteralValueType, ParameterType, ParameterDefinition } from './ExtractToParameterTypes';

/**
 * Infers CloudFormation parameter types and definitions from JavaScript literal values.
 * Implements the type mapping requirements: string→String, number→Number,
 * boolean→String with AllowedValues, array→CommaDelimitedList.
 */
export class ParameterTypeInferrer {
    /**
     * Infers the appropriate CloudFormation parameter definition for a literal value.
     * Creates minimal parameter definitions per requirements with empty descriptions
     * and appropriate type constraints.
     */
    inferParameterType(
        literalType: LiteralValueType,
        value: string | number | boolean | unknown[],
    ): ParameterDefinition {
        switch (literalType) {
            case LiteralValueType.STRING: {
                return this.createStringParameter(value as string);
            }

            case LiteralValueType.NUMBER: {
                return this.createNumberParameter(value as number);
            }

            case LiteralValueType.BOOLEAN: {
                return this.createBooleanParameter(value as boolean);
            }

            case LiteralValueType.ARRAY: {
                return this.createArrayParameter(value as unknown[]);
            }

            default: {
                // Fallback to string type for unknown literal types
                return this.createStringParameter(String(value));
            }
        }
    }

    /**
     * Creates a String parameter definition for string literals.
     * Uses the original string value as the default without additional constraints.
     */
    private createStringParameter(value: string): ParameterDefinition {
        return {
            Type: ParameterType.STRING,
            Default: value,
            Description: '',
        };
    }

    /**
     * Creates a Number parameter definition for numeric literals.
     * Preserves the original numeric type and value as the default.
     */
    private createNumberParameter(value: number): ParameterDefinition {
        return {
            Type: ParameterType.NUMBER,
            Default: value,
            Description: '',
        };
    }

    /**
     * Creates a String parameter with AllowedValues for boolean literals.
     * Converts boolean values to string defaults and constrains to "true"/"false".
     */
    private createBooleanParameter(value: boolean): ParameterDefinition {
        return {
            Type: ParameterType.STRING,
            Default: String(value),
            Description: '',
            AllowedValues: ['true', 'false'],
        };
    }

    /**
     * Creates a CommaDelimitedList parameter for array literals.
     * Converts array elements to a comma-separated string default value.
     */
    private createArrayParameter(value: unknown[]): ParameterDefinition {
        // Convert array elements to strings and join with commas
        const defaultValue = value.map(String).join(',');

        return {
            Type: ParameterType.COMMA_DELIMITED_LIST,
            Default: defaultValue,
            Description: '',
        };
    }
}
