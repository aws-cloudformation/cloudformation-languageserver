import { TopLevelSection } from '../../context/ContextType';
import { JsonSyntaxTree } from '../../context/syntaxtree/JsonSyntaxTree';
import { SyntaxTree } from '../../context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../context/syntaxtree/SyntaxTreeManager';
import { YamlSyntaxTree } from '../../context/syntaxtree/YamlSyntaxTree';
import { DocumentType } from '../../document/Document';
import { parseJson } from '../../document/JsonParser';
import { parseYaml } from '../../document/YamlParser';

/**
 * Result of searching for Parameters section in a CloudFormation template.
 * Provides both existence check and content access for parameter manipulation.
 */
export type ParametersSectionResult = {
    exists: boolean;
    content?: string;
    startPosition?: number;
    endPosition?: number;
};

/**
 * Information about where to insert a new parameter in the template.
 * Handles both insertion within existing Parameters section and creation of new section.
 */
export type ParameterInsertionPoint = {
    position: number;
    withinExistingSection: boolean;
    indentationLevel?: number;
};

/**
 * Utility class for analyzing and manipulating CloudFormation template structure.
 * Focuses on Parameters section detection, creation, and modification for both JSON and YAML formats.
 * Uses the existing SyntaxTree infrastructure for robust parsing.
 */
export class TemplateStructureUtils {
    constructor(private readonly syntaxTreeManager: SyntaxTreeManager) {}
    /**
     * Locates the Parameters section in a CloudFormation template.
     * Uses SyntaxTree findTopLevelSections for robust parsing and error recovery.
     */
    findParametersSection(templateContent: string, documentType: DocumentType, uri?: string): ParametersSectionResult {
        if (!templateContent || templateContent.trim() === '') {
            return { exists: false };
        }

        try {
            const syntaxTree = this.getSyntaxTree(uri, templateContent, documentType);
            const topLevelSections = syntaxTree.findTopLevelSections([TopLevelSection.Parameters]);

            if (topLevelSections.has(TopLevelSection.Parameters)) {
                const parametersSection = topLevelSections.get(TopLevelSection.Parameters);

                // Ensure we have valid position data before returning success
                if (parametersSection?.startIndex !== undefined && parametersSection?.endIndex !== undefined) {
                    return {
                        exists: true,
                        content: parametersSection.text,
                        startPosition: parametersSection.startIndex,
                        endPosition: parametersSection.endIndex,
                    };
                }
            }
        } catch {
            return { exists: false };
        }

        return { exists: false };
    }

    /**
     * Creates a properly formatted Parameters section for the specified document type.
     * Maintains consistent indentation and formatting conventions.
     */
    createParametersSection(documentType: DocumentType): string {
        if (documentType === DocumentType.JSON) {
            return '  "Parameters": {\n  }';
        } else {
            return 'Parameters:';
        }
    }

    /**
     * Determines the optimal insertion point for a new parameter.
     * Considers existing Parameters section structure and template organization.
     */
    determineParameterInsertionPoint(
        templateContent: string,
        documentType: DocumentType,
        uri?: string,
    ): ParameterInsertionPoint {
        const parametersSection = this.findParametersSection(templateContent, documentType, uri);

        if (
            parametersSection.exists &&
            parametersSection.startPosition !== undefined &&
            parametersSection.endPosition !== undefined
        ) {
            // Insert within existing Parameters section
            let insertionPosition = parametersSection.endPosition;

            if (documentType === DocumentType.JSON) {
                // Find the position just before the closing brace of the Parameters object
                const parametersContent = templateContent.slice(
                    parametersSection.startPosition,
                    parametersSection.endPosition,
                );
                const lastBraceIndex = parametersContent.lastIndexOf('}');
                if (lastBraceIndex !== -1) {
                    // Check if there are existing parameters by looking for content before the closing brace
                    const contentBeforeBrace = parametersContent.slice(0, Math.max(0, lastBraceIndex)).trim();
                    const hasExistingParams = contentBeforeBrace.includes(':') || contentBeforeBrace.includes('"');

                    insertionPosition = parametersSection.startPosition + lastBraceIndex;

                    // If there are existing parameters, we need to add a comma before our new parameter
                    if (hasExistingParams) {
                        // Find the last non-whitespace character before the closing brace
                        let lastCharPos = lastBraceIndex - 1;
                        while (lastCharPos >= 0 && /\s/.test(parametersContent[lastCharPos])) {
                            lastCharPos--;
                        }
                        // If the last character is not a comma, we need to add one
                        if (lastCharPos >= 0 && parametersContent[lastCharPos] !== ',') {
                            insertionPosition = parametersSection.startPosition + lastCharPos + 1;
                        }
                    }
                }
            } else {
                // For YAML, use the SyntaxTree endPosition directly
                insertionPosition = parametersSection.endPosition;
            }

            return {
                position: insertionPosition,
                withinExistingSection: true,
                indentationLevel: documentType === DocumentType.JSON ? 4 : 2,
            };
        }

        // Need to create new Parameters section - find appropriate location
        const insertionPosition = this.findNewParametersSectionPosition(templateContent, documentType, uri);
        return {
            position: insertionPosition,
            withinExistingSection: false,
            indentationLevel: documentType === DocumentType.JSON ? 2 : 0,
        };
    }

    /**
     * Extracts all existing parameter names from the template.
     * Uses SyntaxTree findTopLevelSections for reliable parameter name extraction.
     */
    getExistingParameterNames(templateContent: string, documentType: DocumentType, uri?: string): Set<string> {
        try {
            const syntaxTree = this.getSyntaxTree(uri, templateContent, documentType);
            const topLevelSections = syntaxTree.findTopLevelSections([TopLevelSection.Parameters]);

            if (!topLevelSections.has(TopLevelSection.Parameters)) {
                return new Set();
            }

            // Use parsed template to extract parameter names
            if (documentType === DocumentType.JSON) {
                const parsed = parseJson(templateContent) as Record<string, unknown> | undefined;
                if (parsed?.Parameters && typeof parsed.Parameters === 'object' && parsed.Parameters !== null) {
                    return new Set(Object.keys(parsed.Parameters as Record<string, unknown>));
                }
            } else {
                const parsed = parseYaml(templateContent) as Record<string, unknown> | undefined;
                if (parsed?.Parameters && typeof parsed.Parameters === 'object' && parsed.Parameters !== null) {
                    return new Set(Object.keys(parsed.Parameters as Record<string, unknown>));
                }
            }

            return new Set();
        } catch {
            // Error parsing template - return empty set to be safe
            return new Set();
        }
    }

    /**
     * Gets a SyntaxTree instance for the given template content and type.
     * Uses SyntaxTreeManager if available and URI is provided, otherwise creates a new instance.
     */
    private getSyntaxTree(uri: string | undefined, templateContent: string, documentType: DocumentType): SyntaxTree {
        // If we have a SyntaxTreeManager and URI, try to get the existing syntax tree
        if (this.syntaxTreeManager && uri) {
            const existingTree = this.syntaxTreeManager.getSyntaxTree(uri);
            if (existingTree) {
                return existingTree;
            }
        }

        // Fallback to creating a new syntax tree
        return this.createSyntaxTree(templateContent, documentType);
    }

    /**
     * Creates a SyntaxTree instance for the given template content and type.
     * Encapsulates the logic for choosing the right parser.
     */
    private createSyntaxTree(templateContent: string, documentType: DocumentType): SyntaxTree {
        if (documentType === DocumentType.JSON) {
            return new JsonSyntaxTree(templateContent);
        } else {
            return new YamlSyntaxTree(templateContent);
        }
    }

    /**
     * Finds the appropriate position to insert a new Parameters section.
     * Considers CloudFormation template structure conventions.
     */
    private findNewParametersSectionPosition(
        templateContent: string,
        documentType: DocumentType,
        uri?: string,
    ): number {
        try {
            const syntaxTree = this.getSyntaxTree(uri, templateContent, documentType);
            const topLevelSections = syntaxTree.findTopLevelSections([
                TopLevelSection.AWSTemplateFormatVersion,
                TopLevelSection.Description,
            ]);

            // Try to find Description to insert after it
            if (topLevelSections.has(TopLevelSection.Description)) {
                const descriptionSection = topLevelSections.get(TopLevelSection.Description);
                if (descriptionSection?.endIndex !== undefined) {
                    // For JSON, we need to find the comma after the value and insert after it
                    if (documentType === DocumentType.JSON) {
                        const afterValue = templateContent.slice(descriptionSection.endIndex);
                        const commaMatch = afterValue.match(/^(\s*,)/);
                        if (commaMatch) {
                            return descriptionSection.endIndex + commaMatch[0].length;
                        }
                    }
                    return descriptionSection.endIndex;
                }
            }

            // Try to find AWSTemplateFormatVersion to insert after it
            if (topLevelSections.has(TopLevelSection.AWSTemplateFormatVersion)) {
                const versionSection = topLevelSections.get(TopLevelSection.AWSTemplateFormatVersion);
                if (versionSection?.endIndex !== undefined) {
                    // For JSON, we need to find the comma after the value and insert after it
                    if (documentType === DocumentType.JSON) {
                        const afterValue = templateContent.slice(versionSection.endIndex);
                        const commaMatch = afterValue.match(/^(\s*,)/);
                        if (commaMatch) {
                            return versionSection.endIndex + commaMatch[0].length;
                        }
                    }
                    return versionSection.endIndex;
                }
            }

            // Fallback: insert at the beginning of the template content
            if (documentType === DocumentType.JSON) {
                // Find the opening brace and insert after it
                const openBraceIndex = templateContent.indexOf('{');
                return openBraceIndex === -1 ? 0 : openBraceIndex + 1;
            } else {
                // For YAML, insert at the beginning
                return 0;
            }
        } catch {
            // Fallback to simple string-based approach
            if (documentType === DocumentType.JSON) {
                const openBraceIndex = templateContent.indexOf('{');
                return openBraceIndex === -1 ? 0 : openBraceIndex + 1;
            } else {
                return 0;
            }
        }
    }
}
