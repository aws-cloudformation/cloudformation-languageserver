import { Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import { Context } from '../../context/Context';
import { DocumentType } from '../../document/Document';
import { EditorSettings } from '../../settings/Settings';

/**
 * Core service for extracting literal values to CloudFormation parameters.
 * Separates validation logic from extraction logic to enable early rejection
 * of invalid extraction requests without expensive computation.
 */
export interface ExtractToParameterProvider {
    /**
     * Fast validation to avoid expensive extraction computation for invalid cases.
     * Checks template structure, literal type, and context constraints.
     */
    canExtract(context: Context): boolean;

    /**
     * Performs the complete extraction workflow including name generation,
     * type inference, and text edit creation. Only called after canExtract validation.
     */
    generateExtraction(
        context: Context,
        range: Range,
        editorSettings: EditorSettings,
    ): ExtractToParameterResult | undefined;

    /**
     * Creates a workspace edit from an extraction result.
     * Combines parameter insertion and literal replacement into a single atomic operation.
     */
    createWorkspaceEdit(documentUri: string, extractionResult: ExtractToParameterResult): WorkspaceEdit;

    /**
     * Validates that a workspace edit is well-formed and safe to apply.
     * Checks for common issues that could cause edit application failures.
     */
    validateWorkspaceEdit(workspaceEdit: WorkspaceEdit): void;
}

/**
 * Atomic refactoring operation result. Contains both edits to ensure
 * the extraction is applied as a single workspace change, preventing
 * partial application that would break the template.
 */
export type ExtractToParameterResult = {
    parameterName: string;
    parameterDefinition: ParameterDefinition;
    replacementEdit: TextEdit;
    parameterInsertionEdit: TextEdit;
};

/**
 * Extended result for extracting all occurrences of a literal value.
 * Contains multiple replacement edits for all matching literals.
 */
export type ExtractAllOccurrencesResult = {
    parameterName: string;
    parameterDefinition: ParameterDefinition;
    replacementEdits: TextEdit[];
    parameterInsertionEdit: TextEdit;
};

/**
 * CloudFormation parameter structure matching AWS specification.
 * Minimal definition to avoid over-constraining generated parameters.
 */
export type ParameterDefinition = {
    Type: string;
    Default?: string | number | boolean | string[];
    /** Empty per requirements to keep generated parameters simple */
    Description: string;
    /** Only used for boolean literals to constrain to "true"/"false" */
    AllowedValues?: string[];
};

/**
 * CloudFormation parameter types that support literal value extraction.
 * Limited subset to ensure reliable type inference and parameter generation.
 */
export enum ParameterType {
    STRING = 'String',
    NUMBER = 'Number',
    COMMA_DELIMITED_LIST = 'CommaDelimitedList',
}

/**
 * JavaScript literal types detectable in CloudFormation templates.
 * Maps to syntax tree node types for consistent detection across JSON/YAML.
 */
export enum LiteralValueType {
    STRING = 'string',
    NUMBER = 'number',
    BOOLEAN = 'boolean',
    ARRAY = 'array',
}

/**
 * Type inference configuration. Enables consistent mapping from JavaScript
 * literals to CloudFormation parameter types across different template formats.
 */
export type ParameterTypeMapping = {
    literalType: LiteralValueType;
    parameterType: ParameterType;
    /** Required for boolean types to constrain values to "true"/"false" */
    allowedValues?: string[];
};

/**
 * Name generation strategy to create meaningful, conflict-free parameter names.
 * Prioritizes context-aware naming over generic fallbacks for better readability.
 */
export type ParameterNameConfig = {
    baseName: string;
    existingNames: Set<string>;
    fallbackPrefix: string;
};

/**
 * Literal detection result. Includes reference check to prevent extraction
 * of values that are already parameterized or use intrinsic functions.
 */
export type LiteralValueInfo = {
    value: string | number | boolean | unknown[];
    type: LiteralValueType;
    range: Range;
};

/**
 * Template analysis result for parameter insertion. Handles both existing
 * Parameters sections and creation of new sections with proper formatting.
 */
export type TemplateStructureInfo = {
    hasParametersSection: boolean;
    parametersSectionRange?: Range;
    parameterInsertionPoint: Range;
    documentType: DocumentType;
};
