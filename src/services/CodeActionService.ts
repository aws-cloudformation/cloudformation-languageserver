import { SyntaxNode } from 'tree-sitter';
import {
    CodeAction,
    CodeActionParams,
    Command,
    Diagnostic,
    Range,
    TextEdit,
    WorkspaceEdit,
} from 'vscode-languageserver';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { NodeSearch } from '../context/syntaxtree/utils/NodeSearch';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { DocumentManager } from '../document/DocumentManager';
import { ANALYZE_DIAGNOSTIC } from '../handlers/ExecutionHandler';
import { ServerComponents } from '../server/ServerComponents';
import { CFN_VALIDATION_SOURCE } from '../stackActions/ValidationWorkflow';
import { ClientMessage } from '../telemetry/ClientMessage';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { extractErrorMessage } from '../utils/Errors';
import { pointToPosition } from '../utils/TypeConverters';
import { DiagnosticCoordinator } from './DiagnosticCoordinator';

export interface CodeActionFix {
    title: string;
    kind: string;
    diagnostic: Diagnostic;
    textEdits: TextEdit[];
    command?: Command;
}

export class CodeActionService {
    private static readonly REMOVE_ERROR_TITLE = 'Remove validation error';
    private readonly log = LoggerFactory.getLogger(CodeActionService);

    constructor(
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly documentManager: DocumentManager,
        private readonly clientMessage: ClientMessage,
        private readonly diagnosticCoordinator: DiagnosticCoordinator,
    ) {}

    /**
     * Process diagnostics and generate code actions with fixes
     */
    public generateCodeActions(params: CodeActionParams): CodeAction[] {
        this.log.debug(
            {
                Router: 'CodeAction',
                TextDocument: params.textDocument,
                Context: params.context,
                Range: params.range,
            },
            'Processing code action request',
        );

        const codeActions: CodeAction[] = [];

        for (const diagnostic of params.context.diagnostics) {
            const fixes = this.generateFixesForDiagnostic(params.textDocument.uri, diagnostic, params.range);

            for (const fix of fixes) {
                const codeAction = this.createCodeAction(params.textDocument.uri, fix);
                if (codeAction) {
                    codeActions.push(codeAction);
                }
            }
        }

        if (params.context.diagnostics.length > 0) {
            codeActions.push(this.generateAIAnalysisAction(params.textDocument.uri, params.context.diagnostics));
        }

        this.log.debug(`Generated ${codeActions.length} code actions`);
        return codeActions;
    }

    /**
     * Generate fixes for a specific diagnostic
     */
    private generateFixesForDiagnostic(uri: string, diagnostic: Diagnostic, _range: Range): CodeActionFix[] {
        const fixes: CodeActionFix[] = [];

        try {
            if (diagnostic.source === 'cfn-lint') {
                fixes.push(...this.generateCfnLintFixes(diagnostic, uri));
            } else if (diagnostic.source === CFN_VALIDATION_SOURCE) {
                fixes.push(...this.generateCfnValidationFixes(diagnostic, uri));
            }
        } catch (error) {
            this.clientMessage.error(`Error generating fixes for diagnostic: ${extractErrorMessage(error)}`);
        }

        return fixes;
    }

    private generateAIAnalysisAction(uri: string, diagnostics: Diagnostic[]): CodeAction {
        return {
            title: 'Ask AI',
            kind: 'quickfix',
            diagnostics,
            command: {
                title: 'Ask AI',
                command: ANALYZE_DIAGNOSTIC,
                arguments: [uri, diagnostics],
            },
        };
    }

    /**
     * Generate fixes for CFN Validation diagnostics
     */
    private generateCfnValidationFixes(diagnostic: Diagnostic, uri: string): CodeActionFix[] {
        return [
            {
                title: CodeActionService.REMOVE_ERROR_TITLE,
                kind: 'quickfix',
                diagnostic,
                textEdits: [],
                command: {
                    title: CodeActionService.REMOVE_ERROR_TITLE,
                    command: '/command/template/clear-diagnostic',
                    arguments: [uri, diagnostic.data],
                },
            },
        ];
    }

    /**
     * Generate fixes for CFN Lint diagnostics
     */
    private generateCfnLintFixes(diagnostic: Diagnostic, uri: string): CodeActionFix[] {
        const fixes: CodeActionFix[] = [];

        if (diagnostic.code) {
            const code = diagnostic.code.toString();

            switch (code) {
                case 'E2001': {
                    // E2001 covers multiple scenarios - check message content to determine appropriate fix
                    if (
                        diagnostic.message.includes('is a required property') ||
                        diagnostic.message.includes('required property')
                    ) {
                        // Missing required property - offer to add it
                        fixes.push(...this.generateAddRequiredPropertyFix(diagnostic, uri));
                    } else if (diagnostic.message.includes('Additional properties are not allowed')) {
                        // Additional/invalid property - offer to remove it
                        fixes.push(...this.generateRemovePropertyFix(diagnostic, uri));
                    }
                    // If neither pattern matches, don't generate a fix (unknown E2001 variant)
                    break;
                }
                case 'E3002': {
                    // Invalid Property for resource type
                    fixes.push(...this.generateRemovePropertyFix(diagnostic, uri));
                    break;
                }
                case 'E3003': {
                    // Required Property missing
                    fixes.push(...this.generateAddRequiredPropertyFix(diagnostic, uri));
                    break;
                }
            }
        }

        return fixes;
    }

    /**
     * Generate fix to remove an invalid property
     */
    private generateRemovePropertyFix(diagnostic: Diagnostic, uri: string): CodeActionFix[] {
        const fixes: CodeActionFix[] = [];

        const propertyMatch = diagnostic.message.match(/'([^']+)'/);
        const propertyName = propertyMatch ? propertyMatch[1] : 'invalid property';

        const range = this.getKeyPairRange(diagnostic, uri);
        if (range) {
            fixes.push({
                title: `Remove invalid property '${propertyName}'`,
                kind: 'quickfix',
                diagnostic,
                textEdits: [
                    {
                        range,
                        newText: '',
                    },
                ],
            });
        } else {
            this.clientMessage.debug(`Skipping quickfix for '${propertyName}' - could not determine proper range`);
        }

        return fixes;
    }

    /**
     * Get the complete range for a key-value pair from a diagnostic range
     * Uses the syntax tree to find the proper key-value pair boundaries
     */
    private getKeyPairRange(diagnostic: Diagnostic, uri: string): Range {
        try {
            // Get the syntax tree and node at the diagnostic position
            const position = diagnostic.range.start;
            const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);

            if (syntaxTree) {
                const node = syntaxTree.getNodeAtPosition(position);
                const expandedRange = this.expandToKeyPairBoundaries(node, uri);
                if (expandedRange) {
                    return expandedRange;
                }
            }
        } catch (error) {
            this.clientMessage.warn(
                `Could not determine key-pair range from syntax tree: ${extractErrorMessage(error)}`,
            );
        }

        // Fallback to the diagnostic range as provided by cfn-lint
        this.clientMessage.debug(`Using fallback diagnostic range`);
        return diagnostic.range;
    }

    /**
     * Find the key-value pair boundaries using the syntax tree
     * Walks up from the current node to find the containing key-value pair
     */
    private expandToKeyPairBoundaries(node: SyntaxNode, uri: string): Range | undefined {
        try {
            // Get document type from DocumentManager
            const document = this.documentManager.get(uri);
            if (!document) {
                return undefined;
            }

            // Find the key-value pair node using NodeSearch utility and proper type checking
            const keyValueNode = NodeSearch.findAncestorNode(node, (n) =>
                NodeType.isPairNode(n, document.documentType),
            );

            if (keyValueNode) {
                const start = pointToPosition(keyValueNode.startPosition);
                const end = pointToPosition(keyValueNode.endPosition);

                // For YAML block mappings, include the entire line from start to end with newline
                if (keyValueNode.type === 'block_mapping_pair') {
                    const lineStart = { line: start.line, character: 0 };
                    const lineEnd = { line: end.line + 1, character: 0 };
                    return { start: lineStart, end: lineEnd };
                }

                // For flow pairs and JSON pairs, use the exact node boundaries
                return { start, end };
            }

            this.clientMessage.debug(`No key-value pair found after traversal`);
            return {
                start: pointToPosition(node.startPosition),
                end: pointToPosition(node.endPosition),
            };
        } catch (error) {
            this.clientMessage.warn(`Error finding key-pair boundaries in syntax tree: ${extractErrorMessage(error)}`);
            return undefined;
        }
    }

    /**
     * Generate fix to add a required property
     */
    private generateAddRequiredPropertyFix(diagnostic: Diagnostic, uri: string): CodeActionFix[] {
        const fixes: CodeActionFix[] = [];

        const propertyName = this.extractPropertyNameFromMessage(diagnostic.message);
        if (!propertyName) {
            return fixes;
        }

        try {
            // Find the proper insertion point using syntax tree context
            const insertionPoint = this.findFirstChildInsertionPoint(diagnostic, uri, propertyName);

            if (insertionPoint) {
                fixes.push({
                    title: `Add required property '${propertyName}'`,
                    kind: 'quickfix',
                    diagnostic,
                    textEdits: [
                        {
                            range: insertionPoint.range,
                            newText: insertionPoint.newText,
                        },
                    ],
                });
            }
            // If we can't find a proper insertion point using syntax tree, don't generate a fix
        } catch (error) {
            this.clientMessage.warn(`Error generating add required property fix: ${extractErrorMessage(error)}`);
            // If we can't generate a proper fix using syntax tree, don't generate a fix
        }

        return fixes;
    }

    /**
     * Create a CodeAction from a CodeActionFix
     */
    private createCodeAction(uri: string, fix: CodeActionFix): CodeAction | undefined {
        try {
            const codeAction: CodeAction = {
                title: fix.title,
                kind: fix.kind,
                diagnostics: [fix.diagnostic],
            };

            if (fix.textEdits.length > 0) {
                const workspaceEdit: WorkspaceEdit = {
                    changes: {
                        [uri]: fix.textEdits,
                    },
                };
                codeAction.edit = workspaceEdit;
            }

            if (fix.command) {
                codeAction.command = fix.command;
            }

            return codeAction;
        } catch (error) {
            this.clientMessage.error(`Error creating code action: ${extractErrorMessage(error)}`);
            return undefined;
        }
    }

    /**
     * Find the insertion point at the first child position
     */
    private findFirstChildInsertionPoint(
        diagnostic: Diagnostic,
        uri: string,
        propertyName: string,
    ): { range: Range; newText: string } | undefined {
        try {
            const position = diagnostic.range.start;
            const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);

            if (!syntaxTree) {
                return undefined;
            }

            const node = syntaxTree.getNodeAtPosition(position);

            // Find the containing block mapping pair (the parameter definition)
            const blockMappingNode = NodeSearch.findAncestorNode(node, (n) => n.type === 'block_mapping_pair');

            if (blockMappingNode) {
                // Found the parameter block, now find its first child property
                const firstChildPosition = this.findFirstChildPosition(blockMappingNode);

                if (firstChildPosition) {
                    // Insert BEFORE the first child, with same indentation and a newline after
                    return {
                        range: {
                            start: {
                                line: firstChildPosition.position.line,
                                character: 0,
                            },
                            end: {
                                line: firstChildPosition.position.line,
                                character: 0,
                            },
                        },
                        newText: `${firstChildPosition.indentation}${propertyName}: ""\n`,
                    };
                }

                // If no children exist, we can't determine proper indentation from the structure
                // This shouldn't happen for valid YAML where we're adding a required property
                this.clientMessage.debug(
                    `No child properties found in block mapping pair - cannot determine indentation`,
                );
                return undefined;
            }

            return undefined;
        } catch (error) {
            this.clientMessage.warn(`Error finding first child insertion point: ${extractErrorMessage(error)}`);
            return undefined;
        }
    }

    /**
     * Find the position and indentation of the first child property using only syntax tree
     */
    private findFirstChildPosition(
        mappingPairNode: SyntaxNode,
    ): { position: { line: number; character: number }; indentation: string } | undefined {
        try {
            const children = mappingPairNode.children;

            for (const child of children) {
                if (child.type === 'block_node') {
                    const result = this.findFirstPropertyInBlockNode(child);
                    if (result) {
                        return result;
                    }
                }
            }

            return undefined;
        } catch (error) {
            this.clientMessage.warn(
                `Error finding first child position using syntax tree: ${extractErrorMessage(error)}`,
            );
            return undefined;
        }
    }

    /**
     * Find the first property in a block node
     */
    private findFirstPropertyInBlockNode(
        blockNode: SyntaxNode,
    ): { position: { line: number; character: number }; indentation: string } | undefined {
        const blockNodeChildren = blockNode.children;

        for (const grandChild of blockNodeChildren) {
            if (grandChild.type === 'block_mapping_pair') {
                return this.extractPositionAndIndentation(grandChild);
            } else if (grandChild.type === 'block_mapping') {
                const result = this.findFirstPropertyInBlockMapping(grandChild);
                if (result) {
                    return result;
                }
            }
        }

        return undefined;
    }

    /**
     * Find the first property in a block mapping
     */
    private findFirstPropertyInBlockMapping(
        blockMapping: SyntaxNode,
    ): { position: { line: number; character: number }; indentation: string } | undefined {
        const blockMappingChildren = blockMapping.children;

        for (const greatGrandChild of blockMappingChildren) {
            if (greatGrandChild.type === 'block_mapping_pair') {
                return this.extractPositionAndIndentation(greatGrandChild);
            }
        }

        return undefined;
    }

    /**
     * Create position and indentation from a syntax node
     */
    private extractPositionAndIndentation(node: SyntaxNode): {
        position: { line: number; character: number };
        indentation: string;
    } {
        const position = pointToPosition(node.startPosition);

        const indentation = ' '.repeat(position.character);

        return {
            position,
            indentation,
        };
    }

    /**
     * Extract property name from CFN Lint error messages
     */
    private extractPropertyNameFromMessage(message: string): string | undefined {
        // Handle the actual cfn-lint message format: "'Type' is a required property"
        const match = message.match(/'([^']+)' is a required property/);
        return match ? match[1] : undefined;
    }

    static create(components: ServerComponents) {
        return new CodeActionService(
            components.syntaxTreeManager,
            components.documentManager,
            components.clientMessage,
            components.diagnosticCoordinator,
        );
    }
}
