import { Range, TextEdit, WorkspaceEdit } from 'vscode-languageserver';
import { Context } from '../../context/Context';
import { TopLevelSection } from '../../context/ContextType';
import { EditorSettings } from '../../settings/Settings';
import { LoggerFactory } from '../../telemetry/LoggerFactory';
import { AllOccurrencesFinder } from './AllOccurrencesFinder';
import {
    ExtractToParameterProvider as IExtractToParameterProvider,
    ExtractToParameterResult,
    ExtractAllOccurrencesResult,
    LiteralValueInfo,
} from './ExtractToParameterTypes';
import { LiteralValueDetector } from './LiteralValueDetector';
import { ParameterNameGenerator } from './ParameterNameGenerator';
import { ParameterTypeInferrer } from './ParameterTypeInferrer';
import { TemplateStructureUtils } from './TemplateStructureUtils';
import { TextEditGenerator } from './TextEditGenerator';
import { WorkspaceEditBuilder } from './WorkspaceEditBuilder';

/**
 * Main service class for extracting literal values to CloudFormation parameters.
 * Orchestrates the complete extraction workflow from validation through text edit generation.
 */
export class ExtractToParameterProvider implements IExtractToParameterProvider {
    private readonly log = LoggerFactory.getLogger(ExtractToParameterProvider);
    private readonly literalDetector: LiteralValueDetector;
    private readonly nameGenerator: ParameterNameGenerator;
    private readonly typeInferrer: ParameterTypeInferrer;
    private readonly structureUtils: TemplateStructureUtils;
    private readonly textEditGenerator: TextEditGenerator;
    private readonly workspaceEditBuilder: WorkspaceEditBuilder;
    private readonly allOccurrencesFinder: AllOccurrencesFinder;

    constructor(syntaxTreeManager?: import('../../context/syntaxtree/SyntaxTreeManager').SyntaxTreeManager) {
        this.literalDetector = new LiteralValueDetector();
        this.nameGenerator = new ParameterNameGenerator();
        this.typeInferrer = new ParameterTypeInferrer();
        this.structureUtils = new TemplateStructureUtils(syntaxTreeManager);
        this.textEditGenerator = new TextEditGenerator();
        this.workspaceEditBuilder = new WorkspaceEditBuilder();
        this.allOccurrencesFinder = new AllOccurrencesFinder();
    }

    /**
     * Fast validation to determine if extraction is possible for the given context.
     * Checks if the context represents an extractable literal value without expensive computation.
     */
    canExtract(context: Context): boolean {
        if (context.section !== TopLevelSection.Resources && context.section !== TopLevelSection.Outputs) {
            return false;
        }

        if (!context.isValue()) {
            return false;
        }

        const literalInfo = this.literalDetector.detectLiteralValue(context.syntaxNode);

        if (!literalInfo) {
            return false;
        }

        if (literalInfo.isReference) {
            return false;
        }

        return true;
    }

    /**
     * Checks if there are multiple occurrences of the selected literal value in the template.
     * Used to determine whether to offer the "Extract All Occurrences" action.
     */
    hasMultipleOccurrences(context: Context): boolean {
        if (!this.canExtract(context)) {
            return false;
        }

        const literalInfo = this.literalDetector.detectLiteralValue(context.syntaxNode);

        if (!literalInfo || literalInfo.isReference) {
            return false;
        }

        const rootNode = context.syntaxNode.tree?.rootNode;
        if (!rootNode) {
            return false;
        }

        const allOccurrences = this.allOccurrencesFinder.findAllOccurrences(
            rootNode,
            literalInfo.value,
            literalInfo.type,
            context.documentType,
        );

        return allOccurrences.length > 1;
    }

    /**
     * Performs the complete extraction workflow including name generation,
     * type inference, and text edit creation.
     */
    generateExtraction(
        context: Context,
        range: Range,
        editorSettings: EditorSettings,
        uri?: string,
    ): ExtractToParameterResult | undefined {
        if (!this.canExtract(context)) {
            return undefined;
        }

        const literalInfo = this.literalDetector.detectLiteralValue(context.syntaxNode);
        if (!literalInfo || literalInfo.isReference) {
            return undefined;
        }

        try {
            const templateContent = this.getTemplateContent(context);
            const parameterName = this.generateParameterName(context, templateContent, uri);
            const parameterDefinition = this.typeInferrer.inferParameterType(literalInfo.type, literalInfo.value);
            const replacementEdit = this.generateReplacementEdit(parameterName, literalInfo, context);
            const parameterInsertionEdit = this.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                templateContent,
                context,
                editorSettings,
                uri,
            );

            return {
                parameterName,
                parameterDefinition,
                replacementEdit,
                parameterInsertionEdit,
            };
        } catch {
            return undefined;
        }
    }

    /**
     * Performs extraction for all occurrences of the selected literal value.
     * Finds all matching literals in the template and replaces them with the same parameter reference.
     */
    generateAllOccurrencesExtraction(
        context: Context,
        range: Range,
        editorSettings: EditorSettings,
        uri?: string,
    ): ExtractAllOccurrencesResult | undefined {
        if (!this.canExtract(context)) {
            return undefined;
        }

        const literalInfo = this.literalDetector.detectLiteralValue(context.syntaxNode);
        if (!literalInfo || literalInfo.isReference) {
            return undefined;
        }

        try {
            const templateContent = this.getTemplateContent(context);
            const parameterName = this.generateParameterName(context, templateContent, uri);
            const parameterDefinition = this.typeInferrer.inferParameterType(literalInfo.type, literalInfo.value);

            const rootNode = context.syntaxNode.tree?.rootNode;
            if (!rootNode) {
                return undefined;
            }

            const allOccurrences = this.allOccurrencesFinder.findAllOccurrences(
                rootNode,
                literalInfo.value,
                literalInfo.type,
                context.documentType,
            );

            const replacementEdits = allOccurrences.map((occurrenceRange) =>
                this.textEditGenerator.generateLiteralReplacementEdit(
                    parameterName,
                    occurrenceRange,
                    context.documentType,
                ),
            );

            const parameterInsertionEdit = this.generateParameterInsertionEdit(
                parameterName,
                parameterDefinition,
                templateContent,
                context,
                editorSettings,
                uri,
            );

            return {
                parameterName,
                parameterDefinition,
                replacementEdits,
                parameterInsertionEdit,
            };
        } catch {
            return undefined;
        }
    }

    /**
     * Retrieves the template content from the context.
     * Gets the full document content, not just the entity content.
     */
    private getTemplateContent(context: Context): string {
        const rootNode = context.syntaxNode.tree?.rootNode;
        if (rootNode) {
            return rootNode.text;
        }

        const templateContent = context.getRootEntityText();
        return templateContent ?? '';
    }

    /**
     * Generates a unique parameter name based on context and existing parameters.
     * Uses property path information to create meaningful names.
     */
    private generateParameterName(context: Context, templateContent: string, uri?: string): string {
        const existingNames = this.structureUtils.getExistingParameterNames(templateContent, context.documentType, uri);
        const propertyName = this.extractPropertyName(context);
        const resourceName = context.logicalId;

        return this.nameGenerator.generateParameterName({
            propertyName,
            resourceName,
            existingNames,
            fallbackPrefix: 'Parameter',
        });
    }

    /**
     * Extracts the property name from the context's property path.
     * Uses the last element in the path as the property name.
     */
    private extractPropertyName(context: Context): string | undefined {
        if (context.propertyPath.length === 0) {
            return undefined;
        }

        const lastElement = context.propertyPath[context.propertyPath.length - 1];
        return typeof lastElement === 'string' ? lastElement : undefined;
    }

    /**
     * Generates the text edit for replacing the literal value with a parameter reference.
     */
    private generateReplacementEdit(parameterName: string, literalInfo: LiteralValueInfo, context: Context): TextEdit {
        return this.textEditGenerator.generateLiteralReplacementEdit(
            parameterName,
            literalInfo.range,
            context.documentType,
        );
    }

    private generateParameterInsertionEdit(
        parameterName: string,
        parameterDefinition: import('./ExtractToParameterTypes').ParameterDefinition,
        templateContent: string,
        context: Context,
        editorSettings: EditorSettings,
        uri?: string,
    ): TextEdit {
        const insertionPoint = this.structureUtils.determineParameterInsertionPoint(
            templateContent,
            context.documentType,
            uri,
        );

        const insertionRange: Range = {
            start: this.positionFromOffset(templateContent, insertionPoint.position),
            end: this.positionFromOffset(templateContent, insertionPoint.position),
        };

        return this.textEditGenerator.generateParameterInsertionEdit(
            parameterName,
            parameterDefinition,
            insertionRange,
            context.documentType,
            insertionPoint.withinExistingSection,
            editorSettings,
        );
    }

    /**
     * Converts a character offset to a line/character position.
     * Simple implementation that counts newlines to determine line numbers.
     */
    private positionFromOffset(content: string, offset: number): { line: number; character: number } {
        const lines = content.slice(0, Math.max(0, offset)).split('\n');
        const position = {
            line: lines.length - 1,
            character: lines[lines.length - 1].length,
        };

        return position;
    }

    /**
     * Creates a workspace edit from an extraction result.
     * Combines parameter insertion and literal replacement into a single atomic operation.
     */
    createWorkspaceEdit(documentUri: string, extractionResult: ExtractToParameterResult): WorkspaceEdit {
        return this.workspaceEditBuilder.createWorkspaceEdit(documentUri, extractionResult);
    }

    /**
     * Validates that a workspace edit is well-formed and safe to apply.
     * Checks for common issues that could cause edit application failures.
     */
    validateWorkspaceEdit(workspaceEdit: WorkspaceEdit): void {
        this.workspaceEditBuilder.validateWorkspaceEdit(workspaceEdit);
    }
}
