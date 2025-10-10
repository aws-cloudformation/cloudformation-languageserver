import { TextEdit, Range } from 'vscode-languageserver';
import { DocumentType } from '../../document/Document';
import { EditorSettings } from '../../settings/Settings';
import { getIndentationString } from '../../utils/IndentationUtils';
import { ParameterDefinition } from './ExtractToParameterTypes';

/**
 * Generates TextEdit objects for parameter insertion and literal replacement.
 * Handles format-specific syntax and maintains proper indentation for both JSON and YAML.
 */
export class TextEditGenerator {
    /**
     * Generates a TextEdit for inserting a parameter definition into the template.
     * Handles both creation of new Parameters section and insertion into existing section.
     */
    generateParameterInsertionEdit(
        parameterName: string,
        parameterDefinition: ParameterDefinition,
        insertionPoint: Range,
        documentType: DocumentType,
        withinExistingSection: boolean,
        editorSettings: EditorSettings,
    ): TextEdit {
        const parameterText = this.formatParameterDefinition(
            parameterName,
            parameterDefinition,
            documentType,
            withinExistingSection,
            editorSettings,
        );

        return {
            range: insertionPoint,
            newText: parameterText,
        };
    }

    /**
     * Generates a TextEdit for replacing a literal value with a Ref intrinsic function.
     * Uses format-appropriate syntax: JSON object notation or YAML tag notation.
     */
    generateLiteralReplacementEdit(parameterName: string, literalRange: Range, documentType: DocumentType): TextEdit {
        const refText = this.formatParameterReference(parameterName, documentType);

        return {
            range: literalRange,
            newText: refText,
        };
    }

    /**
     * Formats a parameter definition according to the document type and context.
     * Maintains proper indentation and includes necessary structural elements.
     */
    private formatParameterDefinition(
        parameterName: string,
        parameterDefinition: ParameterDefinition,
        documentType: DocumentType,
        withinExistingSection: boolean,
        editorSettings: EditorSettings,
    ): string {
        if (documentType === DocumentType.JSON) {
            return this.formatJsonParameterDefinition(
                parameterName,
                parameterDefinition,
                withinExistingSection,
                editorSettings,
            );
        } else {
            return this.formatYamlParameterDefinition(
                parameterName,
                parameterDefinition,
                withinExistingSection,
                editorSettings,
            );
        }
    }

    /**
     * Formats a parameter definition for JSON templates.
     * Includes proper escaping, indentation, and structural elements.
     */
    private formatJsonParameterDefinition(
        parameterName: string,
        parameterDefinition: ParameterDefinition,
        withinExistingSection: boolean,
        editorSettings: EditorSettings,
    ): string {
        const escapedDefault = parameterDefinition.Default ? this.escapeJsonValue(parameterDefinition.Default) : '""';
        const escapedDescription = this.escapeJsonString(parameterDefinition.Description);

        const baseIndent = getIndentationString(editorSettings, DocumentType.JSON);

        const parameterIndent = baseIndent.repeat(2);
        const propertyIndent = baseIndent.repeat(3);

        let parameterJson = `${parameterIndent}"${parameterName}": {\n`;
        parameterJson += `${propertyIndent}"Type": "${parameterDefinition.Type}",\n`;
        parameterJson += `${propertyIndent}"Default": ${escapedDefault},\n`;
        parameterJson += `${propertyIndent}"Description": "${escapedDescription}"`;

        // Add AllowedValues if present (for boolean parameters)
        if (parameterDefinition.AllowedValues) {
            const allowedValuesJson = parameterDefinition.AllowedValues.map(
                (value) => `"${this.escapeJsonString(value)}"`,
            ).join(', ');
            parameterJson += `,\n${propertyIndent}"AllowedValues": [${allowedValuesJson}]`;
        }

        parameterJson += `\n${parameterIndent}}`;

        if (withinExistingSection) {
            // Insert within existing Parameters section - add comma before and newline after
            return `,\n${parameterJson}\n`;
        } else {
            // Create new Parameters section - no leading comma needed as insertion point is after existing comma
            // Add trailing comma after Parameters section for JSON structure
            return `\n${baseIndent}"Parameters": {\n${parameterJson}\n${baseIndent}},`;
        }
    }

    /**
     * Formats a parameter definition for YAML templates.
     * Uses proper YAML indentation and syntax conventions.
     */
    private formatYamlParameterDefinition(
        parameterName: string,
        parameterDefinition: ParameterDefinition,
        withinExistingSection: boolean,
        editorSettings: EditorSettings,
    ): string {
        const yamlDefault = parameterDefinition.Default ? this.formatYamlValue(parameterDefinition.Default) : '""';
        const yamlDescription = this.formatYamlString(parameterDefinition.Description);

        const baseIndent = getIndentationString(editorSettings, DocumentType.YAML);

        const parameterIndent = baseIndent; // For parameter name within Parameters section
        const propertyIndent = baseIndent.repeat(2); // For properties within parameter
        const listIndent = baseIndent.repeat(3); // For list items within AllowedValues

        let parameterYaml = `${parameterIndent}${parameterName}:\n`;
        parameterYaml += `${propertyIndent}Type: ${parameterDefinition.Type}\n`;
        parameterYaml += `${propertyIndent}Default: ${yamlDefault}\n`;
        parameterYaml += `${propertyIndent}Description: ${yamlDescription}`;

        // Add AllowedValues if present (for boolean parameters)
        if (parameterDefinition.AllowedValues) {
            parameterYaml += `\n${propertyIndent}AllowedValues:`;
            for (const value of parameterDefinition.AllowedValues) {
                parameterYaml += `\n${listIndent}- "${this.escapeYamlString(value)}"`;
            }
        }

        let finalResult: string;
        if (withinExistingSection) {
            // Insert within existing Parameters section - add newline before to separate from previous parameter
            finalResult = `\n${parameterYaml}\n`;
        } else {
            // Create new Parameters section - add leading newline for YAML structure
            finalResult = `\nParameters:\n${parameterYaml}`;
        }
        return finalResult;
    }

    /**
     * Formats a parameter reference using the appropriate syntax for the document type.
     * JSON uses object notation, YAML uses tag notation.
     */
    private formatParameterReference(parameterName: string, documentType: DocumentType): string {
        if (documentType === DocumentType.JSON) {
            return `{"Ref": "${parameterName}"}`;
        } else {
            return `!Ref ${parameterName}`;
        }
    }

    /**
     * Escapes a value for JSON format, handling different data types appropriately.
     * Strings are quoted and escaped, numbers and booleans are unquoted.
     */
    private escapeJsonValue(value: string | number | boolean | unknown[] | string[]): string {
        if (typeof value === 'string') {
            return `"${this.escapeJsonString(value)}"`;
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        } else if (Array.isArray(value)) {
            // For CommaDelimitedList, convert array to comma-separated string
            return `"${value.join(',')}"`;
        } else {
            // Fallback to JSON.stringify for complex objects
            return JSON.stringify(value);
        }
    }

    /**
     * Escapes special characters in JSON strings.
     * Handles quotes, newlines, and other control characters.
     */
    private escapeJsonString(str: string): string {
        return str
            .replaceAll('\\', '\\\\')
            .replaceAll('"', '\\"')
            .replaceAll('\n', '\\n')
            .replaceAll('\r', '\\r')
            .replaceAll('\t', '\\t');
    }

    /**
     * Formats a value for YAML, using appropriate quoting and escaping.
     * Determines when quotes are necessary based on content.
     */
    private formatYamlValue(value: string | number | boolean | unknown[] | string[]): string {
        if (typeof value === 'string') {
            return this.formatYamlString(value);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
        } else if (Array.isArray(value)) {
            // For CommaDelimitedList, convert array to comma-separated string
            return `"${value.join(',')}"`;
        } else {
            // Fallback to JSON representation for complex objects
            return JSON.stringify(value);
        }
    }

    /**
     * Formats a string for YAML, adding quotes when necessary.
     * YAML requires quotes for strings with special characters or ambiguous content.
     */
    private formatYamlString(str: string): string {
        // Always quote strings that contain special characters or could be ambiguous
        if (this.needsYamlQuoting(str)) {
            return `"${this.escapeYamlString(str)}"`;
        }
        return str;
    }

    /**
     * Determines if a string needs quoting in YAML.
     * Checks for special characters, boolean-like values, and numeric patterns.
     */
    private needsYamlQuoting(str: string): boolean {
        if (str === '') {
            return true; // Empty strings should be quoted
        }

        // Quote strings that look like booleans or numbers
        if (/^(?:true|false|yes|no|on|off|\d+(?:\.\d*)?)$/i.test(str)) {
            return true;
        }

        // Quote strings with special characters
        if (/["\n\r\t\\]/.test(str)) {
            return true;
        }

        // Quote strings that start with special YAML characters
        if (/^[!&*|>@`#%{}[\],]/.test(str)) {
            return true;
        }

        return false;
    }

    /**
     * Escapes special characters in YAML strings.
     * Similar to JSON escaping but with YAML-specific considerations.
     */
    private escapeYamlString(str: string): string {
        return str
            .replaceAll('\\', '\\\\')
            .replaceAll('"', '\\"')
            .replaceAll('\n', '\\n')
            .replaceAll('\r', '\\r')
            .replaceAll('\t', '\\t');
    }
}
