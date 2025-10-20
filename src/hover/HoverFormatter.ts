import { deletionPolicyValueDocsMap } from '../artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import { updateReplacePolicyValueDocsMap } from '../artifacts/resourceAttributes/UpdateReplacePolicyPropertyDocs-1';
import { ResourceAttribute } from '../context/ContextType';
import { Condition, Entity, Mapping, Parameter, Resource } from '../context/semantic/Entity';
import { EntityType } from '../context/semantic/SemanticTypes';
import { PropertyType } from '../schema/ResourceSchema';

/**
 * Sorts property entries with required properties first, then optional properties, both alphabetized.
 *
 * @param properties - Object containing property definitions
 * @param requiredProps - Set of required property names
 * @returns Sorted array of [propertyName, propertyDefinition] tuples
 */
function sortPropertiesByRequirement(
    properties: Record<string, PropertyType>,
    requiredProps: Set<string>,
): [string, PropertyType][] {
    return Object.entries(properties).sort(([nameA], [nameB]) => {
        const isRequiredA = requiredProps.has(nameA);
        const isRequiredB = requiredProps.has(nameB);

        // If one is required and the other isn't, required comes first
        if (isRequiredA && !isRequiredB) return -1;
        if (!isRequiredA && isRequiredB) return 1;

        // If both have the same requirement status, sort alphabetically
        return nameA.localeCompare(nameB);
    });
}

/**
 * Sorts property entries by requirement status across multiple schemas.
 * Orders by: always required, sometimes required, never required, then alphabetically within each group.
 *
 * @param properties - Object containing property definitions
 * @param propertyRequirementStatus - Map of property names to their requirement status
 * @returns Sorted array of [propertyName, propertyDefinition] tuples
 */
function sortPropertiesByMultiSchemaRequirement(
    properties: Record<string, PropertyType>,
    propertyRequirementStatus: Map<string, 'always' | 'sometimes' | 'never'>,
): [string, PropertyType][] {
    return Object.entries(properties).sort(([nameA], [nameB]) => {
        const statusA = propertyRequirementStatus.get(nameA) ?? 'never';
        const statusB = propertyRequirementStatus.get(nameB) ?? 'never';

        // Define sort order: always required first, then sometimes required, then never required
        const requirementOrder = { always: 0, sometimes: 1, never: 2 };
        const orderA = requirementOrder[statusA];
        const orderB = requirementOrder[statusB];

        // If different requirement levels, sort by requirement level
        if (orderA !== orderB) {
            return orderA - orderB;
        }

        // If same requirement level, sort alphabetically
        return nameA.localeCompare(nameB);
    });
}

/**
 * Generates a TypeScript-style object type string showing the structure of object properties.
 * Includes both regular properties and pattern properties with their types and optionality.
 *
 * @param property - The object property definition
 * @returns A TypeScript object type string (e.g., '{ name: string; age?: number; [key: string]: any }')
 */
function getObjectTypeString(property: PropertyType): string {
    // For objects with properties, show the structure inline but simplify nested objects
    if (property.properties && Object.keys(property.properties).length > 0) {
        const props: string[] = [];
        const required = new Set(property.required ?? []);

        for (const [propName, propDef] of Object.entries(property.properties)) {
            // Use simplified type string for nested properties
            const propType = getSimplifiedTypeString(propDef);
            const isRequired = required.has(propName);
            props.push(`${propName}${isRequired ? '' : '?'}: ${propType}`);
        }

        // Add pattern properties if they exist
        if (property.patternProperties) {
            for (const [pattern, propDef] of Object.entries(property.patternProperties)) {
                const propType = getSimplifiedTypeString(propDef);
                props.push(`[key: string /* ${pattern} */]: ${propType}`);
            }
        }

        return `{ ${props.join('; ')} }`;
    }

    // If no regular properties but has pattern properties, show those
    if (property.patternProperties && Object.keys(property.patternProperties).length > 0) {
        const props: string[] = [];
        for (const [pattern, propDef] of Object.entries(property.patternProperties)) {
            const propType = getSimplifiedTypeString(propDef);
            props.push(`[key: string /* ${pattern} */]: ${propType}`);
        }
        return `{ ${props.join('; ')} }`;
    }

    // If we reach here, it's an object with no properties - return empty object
    return '{}';
}

/**
 * Generates a simplified TypeScript-style type string for concise display in type signatures.
 * Simplifies complex nested objects to just 'object' and focuses on the essential type information.
 *
 * @param property - The property definition to generate a simplified type string for
 * @returns A simplified type string (e.g., 'string', 'object', 'string[]', 'number | string')
 */
function getSimplifiedTypeString(property: PropertyType): string {
    // For arrays, show simplified item types
    if (property.type === 'array' || (Array.isArray(property.type) && property.type.includes('array'))) {
        if (property.items) {
            // For nested objects in arrays, just show "object"
            if (property.items.properties || property.items.type === 'object') {
                return 'object[]';
            }
            // If items has a type, use it directly
            if (property.items.type) {
                const itemType = Array.isArray(property.items.type)
                    ? `(${property.items.type.join(' | ')})`
                    : property.items.type;
                return `${itemType}[]`;
            }
            // If no type specified, assume object
            return 'object[]';
        }
        // Array type but no items specified
        return 'unknown[]';
    }

    // For objects, just return "object" to keep things concise
    if (
        property.properties ||
        property.type === 'object' ||
        (Array.isArray(property.type) && property.type.includes('object'))
    ) {
        return 'object';
    }

    if (property.type) {
        if (Array.isArray(property.type)) {
            return property.type.join(' | ');
        }
        return property.type;
    }

    if (property.const !== undefined) {
        return `"${property.const}"`;
    }

    return 'unknown';
}

/**
 * Builds a TypeScript type alias signature for a single property definition.
 * Handles objects with properties, pattern properties, arrays, and primitive types.
 *
 * @param propertyName - The name to use for the type alias
 * @param property - The property definition to build a signature for
 * @param suffix - Optional suffix to append to the type name
 * @param baseProperties - Optional base properties to use if the property doesn't have its own
 * @returns A TypeScript type alias string (e.g., 'type MyType = { name: string; age?: number }')
 */
function buildSingleTypeSignature(
    propertyName: string,
    property: PropertyType,
    suffix: string = '',
    baseProperties?: Record<string, PropertyType>,
): string {
    // Use provided base properties if the current property doesn't have properties but has required
    const properties = property.properties ?? baseProperties;

    if (!properties && !property.patternProperties) {
        // For arrays, show the structure but simplify nested objects
        if (property.type === 'array' || (Array.isArray(property.type) && property.type.includes('array'))) {
            if (property.items) {
                let itemType: string;
                if (property.items.properties || property.items.patternProperties) {
                    itemType = getObjectTypeString(property.items);
                } else {
                    itemType = getSimplifiedTypeString(property.items);
                    // If the item type is a union (contains |), wrap it in parentheses for array syntax
                    if (itemType.includes(' | ')) {
                        itemType = `(${itemType})`;
                    }
                }
                return `type ${propertyName}${suffix} = ${itemType}[]`;
            }
            return `type ${propertyName}${suffix} = unknown[]`;
        }
        const type = getSimplifiedTypeString(property);
        return `type ${propertyName}${suffix} = ${type}`;
    }

    const requiredProps = new Set(property.required ?? []);
    const params: string[] = [];

    // Add regular properties - sort with required first, then optional, both alphabetized
    if (properties) {
        const sortedProperties = sortPropertiesByRequirement(properties, requiredProps);

        for (const [propName, propDef] of sortedProperties) {
            const type = getSimplifiedTypeString(propDef);
            const isRequired = requiredProps.has(propName);
            const param = isRequired ? `${propName}: ${type}` : `${propName}?: ${type}`;
            params.push(param);
        }
    }

    // Add pattern properties
    if (property.patternProperties) {
        for (const [pattern, propDef] of Object.entries(property.patternProperties)) {
            const type = getSimplifiedTypeString(propDef);
            params.push(`[key: string /* ${pattern} */]: ${type}`);
        }
    }

    if (params.length === 0) {
        return `type ${propertyName}${suffix} = {}`;
    }

    // Keep single line for compact display, but use type syntax for consistency
    return `type ${propertyName}${suffix} = { ${params.join('; ')} }`;
}

/**
 * Extracts the first line of a description string for concise display.
 * Trims whitespace and returns undefined if the description is empty or missing.
 *
 * @param description - The full description string
 * @returns The first line of the description, or undefined if empty/missing
 */
function getFirstLineOfDescription(description?: string): string | undefined {
    if (!description) {
        return undefined;
    }

    const firstLine = description.split('\n')[0].trim();
    return firstLine || undefined;
}

/**
 * Checks if a property type is compatible with numeric constraints.
 *
 * @param property - The property definition to check
 * @returns True if the property can have numeric constraints
 */
function isNumericType(property: PropertyType): boolean {
    if (property.type === 'number' || property.type === 'integer') {
        return true;
    }
    if (Array.isArray(property.type)) {
        return property.type.includes('number') || property.type.includes('integer');
    }
    return false;
}

/**
 * Checks if a property type is compatible with string constraints.
 *
 * @param property - The property definition to check
 * @returns True if the property can have string constraints
 */
function isStringType(property: PropertyType): boolean {
    if (property.type === 'string') {
        return true;
    }
    if (Array.isArray(property.type)) {
        return property.type.includes('string');
    }
    return false;
}

/**
 * Checks if a property type is compatible with array constraints.
 *
 * @param property - The property definition to check
 * @returns True if the property can have array constraints
 */
function isArrayType(property: PropertyType): boolean {
    if (property.type === 'array' || property.items) {
        return true;
    }
    if (Array.isArray(property.type)) {
        return property.type.includes('array');
    }
    return false;
}

/**
 * Checks if a property type is compatible with object constraints.
 *
 * @param property - The property definition to check
 * @returns True if the property can have object constraints
 */
function isObjectType(property: PropertyType): boolean {
    if (
        property.type === 'object' ||
        property.properties ||
        property.patternProperties ||
        property.additionalProperties
    ) {
        return true;
    }
    if (Array.isArray(property.type)) {
        return property.type.includes('object');
    }
    return false;
}

/**
 * Escapes special markdown characters in a pattern string to prevent markdown formatting issues.
 * Specifically handles backticks that would break inline code formatting.
 *
 * @param pattern - The pattern string to escape
 * @returns The escaped pattern string safe for markdown
 */
function escapePatternForMarkdown(pattern: string): string {
    // Escape backticks to prevent breaking markdown code formatting
    return pattern.replaceAll('`', '\\`');
}

/**
 * Merges multiple property definitions into a single property with union types.
 * When properties have different types across schemas, creates union types.
 * Combines descriptions and preserves other constraints.
 *
 * @param propertyDefs - Array of property definitions to merge
 * @returns A merged property definition with union types where applicable
 */
function mergePropertyDefinitions(propertyDefs: PropertyType[]): PropertyType {
    if (propertyDefs.length === 1) {
        return propertyDefs[0];
    }

    // Collect all unique types
    const allTypes = new Set<string>();
    const descriptions: string[] = [];
    let hasConflictingTypes = false;

    for (const propDef of propertyDefs) {
        if (propDef.type) {
            if (Array.isArray(propDef.type)) {
                for (const t of propDef.type) allTypes.add(t);
            } else {
                allTypes.add(propDef.type);
            }
        }

        if (propDef.description) {
            descriptions.push(propDef.description);
        }
    }

    // Check if we have conflicting types
    hasConflictingTypes = allTypes.size > 1;

    // Create merged property
    const merged: PropertyType = {
        ...propertyDefs[0], // Start with first definition as base
    };

    // Set merged type
    if (allTypes.size > 1) {
        merged.type = [...allTypes];
    } else if (allTypes.size === 1) {
        merged.type = [...allTypes][0];
    }

    // Merge descriptions
    if (descriptions.length > 0) {
        const uniqueDescriptions = [...new Set(descriptions)];
        if (uniqueDescriptions.length === 1) {
            merged.description = uniqueDescriptions[0];
        } else {
            // If we have conflicting descriptions, combine them
            merged.description = uniqueDescriptions.join(' | ');
        }
    }

    // Add conflict indicator if types differ
    if (hasConflictingTypes && merged.description) {
        merged.description += ' // conflicting types across schemas';
    } else if (hasConflictingTypes) {
        merged.description = 'conflicting types across schemas';
    }

    return merged;
}

/**
 * Builds parameter documentation for multiple schema variants with smart requirement analysis.
 * Analyzes requirement status across all schemas to show appropriate markers.
 *
 * @param combinedProperty - The combined property definition with merged properties
 * @param originalSchemas - The original schemas to analyze requirement patterns
 * @returns Array of markdown-formatted parameter documentation strings
 */
function buildMultipleSchemaPropertyDocumentation(
    combinedProperty: PropertyType,
    originalSchemas: PropertyType[],
): string[] {
    const properties = combinedProperty.properties;
    const patternProperties = combinedProperty.patternProperties;

    if (!properties && !patternProperties) {
        return [];
    }

    const paramList: string[] = [];

    // Check if any schema has a required field at all
    const hasAnyRequiredField = originalSchemas.some((schema) => schema.required !== undefined);

    // Analyze requirement status across all schemas
    const propertyRequirementStatus = new Map<string, 'always' | 'sometimes' | 'never'>();

    if (properties && hasAnyRequiredField) {
        for (const propName of Object.keys(properties)) {
            let requiredCount = 0;
            let totalSchemasWithProperty = 0;

            for (const schema of originalSchemas) {
                if (schema.properties?.[propName]) {
                    totalSchemasWithProperty++;
                    if (schema.required?.includes(propName)) {
                        requiredCount++;
                    }
                }
            }

            if (requiredCount === totalSchemasWithProperty && totalSchemasWithProperty > 0) {
                propertyRequirementStatus.set(propName, 'always');
            } else if (requiredCount > 0) {
                propertyRequirementStatus.set(propName, 'sometimes');
            } else {
                propertyRequirementStatus.set(propName, 'never');
            }
        }
    }

    // Add regular properties with appropriate markers - sort with required first, then optional, both alphabetized
    if (properties) {
        const sortedProperties = sortPropertiesByMultiSchemaRequirement(properties, propertyRequirementStatus);

        for (const [propName, propDef] of sortedProperties) {
            const type = getSimplifiedTypeString(propDef);
            const description = getFirstLineOfDescription(propDef.description);

            let paramDoc = `- **${propName}** \`${type}\``;

            // Only add markers if at least one schema has a required field
            if (hasAnyRequiredField) {
                const requirementStatus = propertyRequirementStatus.get(propName) ?? 'never';

                switch (requirementStatus) {
                    case 'always': {
                        paramDoc += ' *(required)*';

                        break;
                    }
                    case 'sometimes': {
                        paramDoc += ' *(sometimes required)*';

                        break;
                    }
                    case 'never': {
                        paramDoc += ' *(optional)*';

                        break;
                    }
                    // No default
                }
            }

            if (description) {
                paramDoc += ` - ${description}`;
            }

            paramList.push(paramDoc);
        }
    }

    // Add pattern properties (these are typically always optional in multi-schema contexts)
    if (patternProperties) {
        for (const [pattern, propDef] of Object.entries(patternProperties)) {
            const type = getSimplifiedTypeString(propDef);
            const description = getFirstLineOfDescription(propDef.description);

            const escapedPattern = escapePatternForMarkdown(pattern);
            let paramDoc = `- **[pattern: \`${escapedPattern}\`]** \`${type}\``;
            if (description) {
                paramDoc += ` - ${description}`;
            }

            paramList.push(paramDoc);
        }
    }

    return paramList;
}

/**
 * Builds parameter documentation for a property's regular and pattern properties.
 * Creates markdown-formatted parameter lists with types, optionality, and descriptions.
 *
 * @param property - The property definition containing properties to document
 * @returns Array of markdown-formatted parameter documentation strings
 */
function buildPropertyDocumentation(property: PropertyType): string[] {
    let properties = property.properties;
    let patternProperties = property.patternProperties;
    let requiredProps = new Set(property.required ?? []);

    // If this is an array type, show the properties of the array items
    if (!properties && !patternProperties && property.items && !Array.isArray(property.items)) {
        properties = property.items.properties;
        patternProperties = property.items.patternProperties;
        requiredProps = new Set(property.items.required ?? []);
    }

    if (!properties && !patternProperties) {
        return [];
    }

    const paramList: string[] = [];

    // Add regular properties - sort with required first, then optional, both alphabetized
    if (properties) {
        const sortedProperties = sortPropertiesByRequirement(properties, requiredProps);

        for (const [propName, propDef] of sortedProperties) {
            const type = getSimplifiedTypeString(propDef);
            const isRequired = requiredProps.has(propName);
            const description = getFirstLineOfDescription(propDef.description);

            let paramDoc = `- **${propName}** \`${type}\``;
            if (!isRequired) {
                paramDoc += ' *(optional)*';
            }

            if (description) {
                paramDoc += ` - ${description}`;
            }

            paramList.push(paramDoc);
        }
    }

    // Add pattern properties
    if (patternProperties) {
        for (const [pattern, propDef] of Object.entries(patternProperties)) {
            const type = getSimplifiedTypeString(propDef);
            const description = getFirstLineOfDescription(propDef.description);

            const escapedPattern = escapePatternForMarkdown(pattern);
            let paramDoc = `- **[pattern: \`${escapedPattern}\`]** \`${type}\``;
            if (description) {
                paramDoc += ` - ${description}`;
            }

            paramList.push(paramDoc);
        }
    }

    return paramList;
}

/**
 * Converts multiple resolved property type definitions into comprehensive markdown documentation for hover display.
 * Handles multiple schemas that come from resolved oneOf/anyOf/allOf compositions.
 * Includes TypeScript signatures, descriptions, parameter lists, and JSON Schema constraints.
 *
 * @param propertyName - The name of the property for the type signature
 * @param resolvedSchemas - Array of resolved property definitions (all $refs resolved, oneOf/anyOf/allOf expanded)
 * @returns Complete markdown documentation string for the property
 */
export function propertyTypesToMarkdown(propertyName: string, resolvedSchemas: PropertyType[]): string {
    if (resolvedSchemas.length === 0) {
        return `No schema found for \`${propertyName}\``;
    }

    if (resolvedSchemas.length === 1) {
        return buildSingleSchemaMarkdown(propertyName, resolvedSchemas[0]);
    }

    return buildMultipleSchemaMarkdown(propertyName, resolvedSchemas);
}

/**
 * Builds markdown documentation for a single resolved schema
 */
function buildSingleSchemaMarkdown(propertyName: string, property: PropertyType): string {
    const doc: string[] = [];

    // 1. Type signature
    const signature = buildSingleTypeSignature(propertyName, property);
    doc.push('```typescript\n' + signature + '\n```');

    // 2. Description
    if (property.description) {
        doc.push('**Description**', property.description);
    }

    // 3. Parameter list
    const paramList = buildPropertyDocumentation(property);
    if (paramList.length > 0) {
        doc.push('**Parameters**', ...paramList);
    }

    // 4. Constraints
    const constraints = buildConstraintsDocumentation(property);
    if (constraints.length > 0) {
        doc.push('**Constraints**', ...constraints);
    }

    return doc.join('\n\n');
}

/**
 * Builds markdown documentation for multiple resolved schemas (from oneOf/anyOf/allOf)
 */
function buildMultipleSchemaMarkdown(propertyName: string, schemas: PropertyType[]): string {
    const doc: string[] = [];

    // 1. Type signatures - show up to 3 variants
    const maxSignatures = 3;
    const signatures: string[] = [];

    for (let i = 0; i < Math.min(maxSignatures, schemas.length); i++) {
        const schema = schemas[i];
        const signature = buildSingleTypeSignature(propertyName, schema);
        signatures.push(signature);
    }

    if (schemas.length > maxSignatures) {
        signatures.push(
            `// +${schemas.length - maxSignatures} more option${schemas.length - maxSignatures > 1 ? 's' : ''}`,
        );
    }

    doc.push('```typescript\n' + signatures.join('\n') + '\n```');

    // 2. Description from first schema that has one
    const schemaWithDescription = schemas.find((s) => s.description);
    if (schemaWithDescription?.description) {
        doc.push('**Description**', schemaWithDescription.description);
    }

    // 3. Collect and merge properties from all schemas
    const allProperties = new Map<string, PropertyType[]>();
    const allPatternProperties = new Map<string, PropertyType[]>();

    for (const schema of schemas) {
        if (schema.properties) {
            for (const [propName, propDef] of Object.entries(schema.properties)) {
                if (!allProperties.has(propName)) {
                    allProperties.set(propName, []);
                }
                allProperties.get(propName)?.push(propDef);
            }
        }
        if (schema.patternProperties) {
            for (const [pattern, propDef] of Object.entries(schema.patternProperties)) {
                if (!allPatternProperties.has(pattern)) {
                    allPatternProperties.set(pattern, []);
                }
                allPatternProperties.get(pattern)?.push(propDef);
            }
        }
    }

    // Create a combined property object from all schemas with merged types
    const mergedProperties: Record<string, PropertyType> = {};
    const mergedPatternProperties: Record<string, PropertyType> = {};

    // Merge regular properties
    for (const [propName, propDefs] of allProperties) {
        mergedProperties[propName] = mergePropertyDefinitions(propDefs);
    }

    // Merge pattern properties
    for (const [pattern, propDefs] of allPatternProperties) {
        mergedPatternProperties[pattern] = mergePropertyDefinitions(propDefs);
    }

    // Collect required properties from all schemas
    const allRequiredProps = new Set<string>();
    let hasAnyRequiredField = false;

    for (const schema of schemas) {
        if (schema.required) {
            hasAnyRequiredField = true;
            for (const prop of schema.required) allRequiredProps.add(prop);
        }
    }

    const combinedProperty: PropertyType = {
        properties: mergedProperties,
        patternProperties: mergedPatternProperties,
        // Only set required field if at least one schema had a required field
        ...(hasAnyRequiredField && { required: [...allRequiredProps] }),
    };

    // Use specialized function for multiple schemas that handles required properties differently
    const paramList = buildMultipleSchemaPropertyDocumentation(combinedProperty, schemas);

    if (paramList.length > 0) {
        doc.push('**Parameters**', ...paramList);
    }

    // 4. Constraints from first schema that has them
    const schemaWithConstraints = schemas.find((s) => hasConstraints(s));
    if (schemaWithConstraints) {
        const constraints = buildConstraintsDocumentation(schemaWithConstraints);
        if (constraints.length > 0) {
            doc.push('**Constraints**', ...constraints);
        }
    }

    return doc.join('\n\n');
}

/**
 * Checks if a schema has any constraints worth documenting
 */
function hasConstraints(property: PropertyType): boolean {
    return !!(
        property.enum ??
        (property.const !== undefined ||
            property.minimum !== undefined ||
            property.maximum !== undefined ||
            property.exclusiveMinimum !== undefined ||
            property.exclusiveMaximum !== undefined ||
            property.multipleOf !== undefined ||
            property.minLength !== undefined ||
            property.maxLength !== undefined ||
            property.pattern) ??
        (property.minItems !== undefined || property.maxItems !== undefined || property.uniqueItems) ??
        (property.minProperties !== undefined || property.maxProperties !== undefined || property.patternProperties) ??
        property.dependencies ??
        property.default !== undefined
    );
}

/**
 * Builds constraints documentation for a single schema
 */
function buildConstraintsDocumentation(property: PropertyType): string[] {
    const typeInfo: string[] = [];

    // Enum values
    if (property.enum) {
        typeInfo.push(
            `**Allowed values:** ${property.enum.map((v) => `\`${v !== null && typeof v === 'object' ? JSON.stringify(v) : v}\``).join(', ')}`,
        );
    }

    // Const value
    if (property.const !== undefined) {
        typeInfo.push(`**Constant value:** \`${property.const}\``);
    }

    // Numeric constraints
    if (isNumericType(property) && (property.minimum !== undefined || property.maximum !== undefined)) {
        const min = property.minimum ?? 'no limit';
        const max = property.maximum ?? 'no limit';
        typeInfo.push(`**Range:** ${min} to ${max}`);
    }

    if (
        isNumericType(property) &&
        (property.exclusiveMinimum !== undefined || property.exclusiveMaximum !== undefined)
    ) {
        const exclusiveMin = property.exclusiveMinimum ?? 'no limit';
        const exclusiveMax = property.exclusiveMaximum ?? 'no limit';
        typeInfo.push(`**Exclusive range:** > ${exclusiveMin} and < ${exclusiveMax}`);
    }

    if (isNumericType(property) && property.multipleOf !== undefined) {
        typeInfo.push(`**Multiple of:** ${property.multipleOf}`);
    }

    // String constraints
    if (isStringType(property) && (property.minLength !== undefined || property.maxLength !== undefined)) {
        const minLen = property.minLength ?? 'no limit';
        const maxLen = property.maxLength ?? 'no limit';
        typeInfo.push(`**Length:** ${minLen} to ${maxLen} characters`);
    }

    if (isStringType(property) && property.pattern) {
        const escapedPattern = escapePatternForMarkdown(property.pattern);
        typeInfo.push(`**Pattern:** \`${escapedPattern}\``);
    }

    // Array constraints
    if (isArrayType(property) && (property.minItems !== undefined || property.maxItems !== undefined)) {
        const minItems = property.minItems ?? 'no limit';
        const maxItems = property.maxItems ?? 'no limit';
        typeInfo.push(`**Array size:** ${minItems} to ${maxItems} items`);
    }

    if (isArrayType(property) && property.uniqueItems) {
        typeInfo.push(`**Unique items:** All array items must be unique`);
    }

    // Object constraints
    if (isObjectType(property) && (property.minProperties !== undefined || property.maxProperties !== undefined)) {
        const minProps = property.minProperties ?? 'no limit';
        const maxProps = property.maxProperties ?? 'no limit';
        typeInfo.push(`**Object size:** ${minProps} to ${maxProps} properties`);
    }

    // Pattern properties
    if (isObjectType(property) && property.patternProperties) {
        const patterns = Object.keys(property.patternProperties);
        if (patterns.length > 0) {
            typeInfo.push(
                `**Property patterns:** ${patterns.map((p) => `\`${escapePatternForMarkdown(p)}\``).join(', ')}`,
            );
        }
    }

    // Dependencies
    if (isObjectType(property) && property.dependencies) {
        for (const [propName, dependency] of Object.entries(property.dependencies)) {
            if (Array.isArray(dependency)) {
                // Property dependencies - when propName exists, these other properties must also exist
                typeInfo.push(
                    `**When \`${propName}\` exists:** Must also include ${dependency.map((d) => `\`${d}\``).join(', ')}`,
                );
            } else {
                // Schema dependencies - when propName exists, must satisfy additional schema
                typeInfo.push(`**When \`${propName}\` exists:** Must satisfy additional schema`);
            }
        }
    }

    // Default value
    if (property.default !== undefined) {
        const defaultStr =
            property.default !== null && typeof property.default === 'object'
                ? JSON.stringify(property.default)
                : String(property.default);
        typeInfo.push(`**Default:** \`${defaultStr}\``);
    }

    return typeInfo;
}
/**
 * Formats hover information for intrinsic function arguments (like !Ref, !GetAtt arguments)
 *
 * @param entity - The entity being referenced (Resource, Parameter, Condition, Mapping)
 * @returns Formatted markdown string for hover display
 */
export function formatIntrinsicArgumentHover(entity: Entity): string {
    const doc: string[] = [];

    // Add entity-specific information
    switch (entity.entityType) {
        case EntityType.Resource: {
            doc.push(formatResourceHover(entity as Resource));
            break;
        }

        case EntityType.Parameter: {
            // Use the shared parameter formatter for consistent formatting
            doc.push(formatParameterHover(entity as Parameter));
            break;
        }

        case EntityType.Condition: {
            const condition = entity as Condition;
            doc.push(`**Condition:** ${condition.name}`);
            break;
        }

        case EntityType.Mapping: {
            const mapping = entity as Mapping;
            doc.push(`**Mapping:** ${mapping.name}`);
            break;
        }
    }

    const result = doc.filter((item) => item.trim() !== '').join('\n\n');

    return result;
}

/**
 * Determines the return type of an intrinsic function for TypeScript-style display
 */
function getIntrinsicReturnType(intrinsicType: string, entity: Entity): string {
    switch (intrinsicType) {
        case 'Ref': {
            switch (entity.entityType) {
                case EntityType.Resource: {
                    return 'string';
                } // Physical resource ID
                case EntityType.Parameter: {
                    return mapParameterTypeToTypeScript((entity as Parameter).Type ?? 'String');
                }
                default: {
                    return 'string';
                }
            }
        }
        case 'GetAtt': {
            return 'any';
        } // Attribute type depends on the specific attribute
        case 'Condition': {
            return 'boolean';
        }
        default: {
            return 'any';
        }
    }
}

/**
 * Maps CloudFormation parameter types to TypeScript types using template literal types
 */
function mapParameterTypeToTypeScript(cfnType: string): string {
    // Handle basic types
    switch (cfnType) {
        case 'String': {
            return 'string';
        }
        case 'Number': {
            return 'number';
        }
        case 'CommaDelimitedList': {
            return 'string[] // comma-delimited list';
        }
        case 'List<Number>': {
            return 'number[]';
        }
        case 'List<String>': {
            return 'string[]';
        }
    }

    // Handle AWS-specific types
    if (cfnType.startsWith('AWS::')) {
        // Handle List<AWS::...> types
        if (cfnType.startsWith('List<AWS::')) {
            const innerType = cfnType.replace(/^List<(.*)>$/, '$1');
            const mappedInnerType = mapSingleAwsType(innerType);
            return `Array<${mappedInnerType.templateType}>`;
        }

        // Handle AWS::SSM::Parameter::Value<...> types
        if (cfnType.startsWith('AWS::SSM::Parameter::Value<')) {
            const innerType = cfnType.replace(/^AWS::SSM::Parameter::Value<(.*)>$/, '$1');
            if (innerType === 'String') {
                return '`/aws/ssm/${string}` // SSM parameter path';
            }
            if (innerType === 'Number') {
                return 'number // from SSM parameter';
            }
            if (innerType === 'CommaDelimitedList') {
                return 'string[] // from SSM parameter';
            }
            if (innerType.startsWith('List<')) {
                const listInnerType = innerType.slice(5, -1);
                const mappedListType = mapSingleAwsType(listInnerType);
                return `Array<${mappedListType.templateType}> // from SSM parameter`;
            }
            if (innerType.startsWith('AWS::')) {
                const mappedType = mapSingleAwsType(innerType);
                return `${mappedType.templateType} // from SSM parameter`;
            }
        }

        // Handle single AWS types
        const mappedType = mapSingleAwsType(cfnType);
        return mappedType.templateType;
    }

    // Fallback for unknown types
    return 'string';
}

/**
 * Maps a single AWS type to TypeScript template literal types
 */
function mapSingleAwsType(awsType: string): { templateType: string; format: string } {
    const typeMap: Record<string, { templateType: string; format: string }> = {
        'AWS::EC2::AvailabilityZone::Name': {
            templateType: '`${string}${"a" | "b" | "c" | "d" | "e" | "f"}`',
            format: 'availability-zone',
        },
        'AWS::EC2::Image::Id': {
            templateType: '`ami-${string}`',
            format: 'ami-id',
        },
        'AWS::EC2::Instance::Id': {
            templateType: '`i-${string}`',
            format: 'instance-id',
        },
        'AWS::EC2::KeyPair::KeyName': {
            templateType: 'string',
            format: 'key-pair-name',
        },
        'AWS::EC2::SecurityGroup::GroupName': {
            templateType: 'string',
            format: 'security-group-name',
        },
        'AWS::EC2::SecurityGroup::Id': {
            templateType: '`sg-${string}`',
            format: 'security-group-id',
        },
        'AWS::EC2::Subnet::Id': {
            templateType: '`subnet-${string}`',
            format: 'subnet-id',
        },
        'AWS::EC2::VPC::Id': {
            templateType: '`vpc-${string}`',
            format: 'vpc-id',
        },
        'AWS::EC2::Volume::Id': {
            templateType: '`vol-${string}`',
            format: 'volume-id',
        },
        'AWS::Route53::HostedZone::Id': {
            templateType: '`Z${string}`',
            format: 'hosted-zone-id',
        },
        'AWS::SSM::Parameter::Name': {
            templateType: '`/${string}`',
            format: 'ssm-parameter-name',
        },
    };

    return (
        typeMap[awsType] || {
            templateType: 'string',
            format: awsType.toLowerCase().replaceAll(/[^a-z0-9]/g, '-'),
        }
    );
}

/**
 * Formats hover information for a parameter entity
 */
export function formatParameterHover(parameter: Parameter): string {
    const doc: string[] = [];

    doc.push(
        `\`\`\`typescript\n(parameter) ${parameter.name}: ${mapParameterTypeToTypeScript(parameter.Type ?? 'String')}\n\`\`\``,
        '---',
    );

    if (parameter.Description) {
        doc.push(parameter.Description);
    }

    if (parameter.Type) {
        doc.push(`**Type:** ${parameter.Type}`);
    }

    if (parameter.Default !== undefined) {
        doc.push(`**Default Value:** ${JSON.stringify(parameter.Default)}`);
    }

    if (parameter.AllowedValues && parameter.AllowedValues.length > 0) {
        const allowedValuesList = [`**Allowed Values:**`, ...parameter.AllowedValues.map((v) => `- ${v}`)].join('\n');
        doc.push(allowedValuesList);
    }

    if (parameter.AllowedPattern) {
        doc.push(`**Allowed Pattern:** ${parameter.AllowedPattern}`);
    }

    if (parameter.MinLength !== undefined) {
        doc.push(`**Min Length:** ${parameter.MinLength}`);
    }

    if (parameter.MaxLength !== undefined) {
        doc.push(`**Max Length:** ${parameter.MaxLength}`);
    }

    if (parameter.MinValue !== undefined) {
        doc.push(`**Min Value:** ${parameter.MinValue}`);
    }

    if (parameter.MaxValue !== undefined) {
        doc.push(`**Max Value:** ${parameter.MaxValue}`);
    }

    if (parameter.NoEcho) {
        doc.push(`**No Echo:** true`);
    }

    if (parameter.ConstraintDescription) {
        doc.push(`**Constraint Description:** ${parameter.ConstraintDescription}`);
    }

    const result = doc.filter((item) => item.trim() !== '').join('\n\n');
    return result;
}

/**
 * Formats hover information for a resource entity
 */
export function formatResourceHover(resource: Resource): string {
    const doc: string[] = [];

    doc.push(
        `\`\`\`typescript\n(resource) ${resource.name}: ${getIntrinsicReturnType('Ref', resource)}\n\`\`\``,
        '---',
    );

    if (resource.Type) {
        doc.push(`**Type:** ${resource.Type}`);
    }

    if (resource.Condition) {
        doc.push(`**Condition:** ${resource.Condition}`);
    }

    if (resource.DependsOn) {
        const dependencies = Array.isArray(resource.DependsOn) ? resource.DependsOn.join(', ') : resource.DependsOn;
        doc.push(`**Depends On:** ${dependencies}`);
    }

    if (resource.DeletionPolicy) {
        doc.push(`**Deletion Policy:** ${resource.DeletionPolicy}`);
    }

    if (resource.UpdateReplacePolicy) {
        doc.push(`**Update Replace Policy:** ${resource.UpdateReplacePolicy}`);
    }

    const result = doc.filter((item) => item.trim() !== '').join('\n\n');
    return result;
}

/**
 * Gets documentation for resource attribute values based on the attribute type and text.
 */
export function getResourceAttributeValueDoc(attributeName: ResourceAttribute, text: string): string | undefined {
    switch (attributeName) {
        case ResourceAttribute.DeletionPolicy: {
            return deletionPolicyValueDocsMap.get(text);
        }
        case ResourceAttribute.UpdateReplacePolicy: {
            return updateReplacePolicyValueDocsMap.get(text);
        }
        default: {
            return undefined;
        }
    }
}
