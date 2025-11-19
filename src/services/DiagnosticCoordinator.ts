import { Diagnostic, PublishDiagnosticsParams, Range } from 'vscode-languageserver';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { NodeType } from '../context/syntaxtree/utils/NodeType';
import { FieldNames } from '../context/syntaxtree/utils/TreeSitterTypes';
import { LspDiagnostics } from '../protocol/LspDiagnostics';
import { ValidationManager } from '../stacks/actions/ValidationManager';
import { CFN_VALIDATION_SOURCE } from '../stacks/actions/ValidationWorkflow';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { CancellationError, Delayer } from '../utils/Delayer';

type SourceToDiagnostics = Map<string, Diagnostic[]>;

/**
 * DiagnosticCoordinator manages diagnostics from multiple sources and publishes
 * merged results to the LSP client. It ensures that diagnostics from different
 * sources (cfn-lint, Guard validation, etc.) are all visible simultaneously
 * without overwriting each other.
 */
export class DiagnosticCoordinator {
    private readonly urisToDiagnostics = new Map<string, SourceToDiagnostics>();
    private readonly log = LoggerFactory.getLogger(DiagnosticCoordinator);
    private readonly delayer: Delayer<void>;

    constructor(
        private readonly lspDiagnostics: LspDiagnostics,
        private readonly syntaxTreeManager: SyntaxTreeManager,
        private readonly validationManager: ValidationManager,
        delayer?: Delayer<void>,
    ) {
        this.delayer = delayer ?? new Delayer<void>(200);
    }

    /**
     * Publish diagnostics from a specific source for a document.
     * This will merge the diagnostics with existing diagnostics from other sources
     * and publish the combined result to the LSP client.
     *
     * @param source Identifier for the diagnostic source (e.g., "cfn-lint", "guard")
     * @param uri Document URI
     * @param diagnostics Array of diagnostics from the source
     */
    async publishDiagnostics(source: string, uri: string, diagnostics: Diagnostic[]): Promise<void> {
        try {
            // Get or create collection for this URI
            let collection = this.urisToDiagnostics.get(uri);
            if (!collection) {
                collection = new Map<string, Diagnostic[]>();
                this.urisToDiagnostics.set(uri, collection);
            }

            // Update diagnostics for this source
            collection.set(source, [...diagnostics]);

            // Debounce the actual LSP publishing to avoid spam on keystrokes
            await this.delayer.delay(uri, () => this.publishToLsp(uri));
        } catch (error) {
            // Suppress cancellation errors as they are expected behavior
            if (error instanceof CancellationError) {
                return;
            }
            this.log.error(error, `Failed to publish diagnostics for source ${source}, URI ${uri}`);
            throw error;
        }
    }

    /**
     * Internal method to publish merged diagnostics to LSP client
     */
    private async publishToLsp(uri: string): Promise<void> {
        const collection = this.urisToDiagnostics.get(uri);
        if (!collection) {
            return;
        }

        // Merge all diagnostics from all sources
        const mergedDiagnostics = this.mergeDiagnostics(collection);

        // Publish merged diagnostics to LSP client
        const params: PublishDiagnosticsParams = {
            uri,
            diagnostics: mergedDiagnostics,
        };

        await this.lspDiagnostics.publishDiagnostics(params);
    }

    /**
     * Clear all diagnostics for a document from all sources.
     * This is typically called when a document is closed.
     *
     * @param uri Document URI
     */
    async clearDiagnosticsForUri(uri: string): Promise<void> {
        try {
            const collection = this.urisToDiagnostics.get(uri);
            if (!collection) {
                // No diagnostics exist for this URI
                return;
            }

            // Remove the entire collection
            this.urisToDiagnostics.delete(uri);

            // Publish empty diagnostics to clear the document
            await this.lspDiagnostics.publishDiagnostics({
                uri,
                diagnostics: [],
            });
        } catch (error) {
            this.log.error(error, `Failed to clear all diagnostics for URI ${uri}`);
            throw error;
        }
    }

    /**
     * Handle clearing a CFN diagnostic by ID.
     */
    async handleClearCfnDiagnostic(uri: string, diagnosticId: string): Promise<void> {
        const collection = this.urisToDiagnostics.get(uri);
        if (!collection) return;

        const sourceDiagnostics = collection.get(CFN_VALIDATION_SOURCE);
        if (!sourceDiagnostics) return;

        this.validationManager.getLastValidationByUri(uri)?.removeValidationDetailByDiagnosticId(diagnosticId);
        const filteredDiagnostics = sourceDiagnostics.filter((d) => d.data !== diagnosticId);
        collection.set(CFN_VALIDATION_SOURCE, filteredDiagnostics);

        const mergedDiagnostics = this.mergeDiagnostics(collection);
        await this.lspDiagnostics.publishDiagnostics({ uri, diagnostics: mergedDiagnostics });
    }

    /**
     * Get current diagnostics for a document (merged from all sources).
     *
     * @param uri Document URI
     * @returns Array of merged diagnostics
     */
    getDiagnostics(uri: string): Diagnostic[] {
        const collection = this.urisToDiagnostics.get(uri);
        if (!collection) {
            return [];
        }

        return this.mergeDiagnostics(collection);
    }

    /**
     * Get list of diagnostic sources that have published diagnostics for a document.
     *
     * @param uri Document URI
     * @returns Array of source identifiers
     */
    getSources(uri: string): string[] {
        const collection = this.urisToDiagnostics.get(uri);
        if (!collection) {
            return [];
        }

        return [...collection.keys()];
    }

    /**
     * Merge diagnostics from all sources in a collection.
     * Preserves original diagnostic properties and sorts by line/column for consistency.
     *
     * @param collection Diagnostic collection for a URI
     * @returns Merged and sorted diagnostics array
     */
    private mergeDiagnostics(collection: SourceToDiagnostics): Diagnostic[] {
        const allDiagnostics: Diagnostic[] = [];

        // Flatten diagnostics from all sources
        for (const diagnostics of collection.values()) {
            allDiagnostics.push(...diagnostics);
        }

        // Sort by line number, then by column for consistent ordering
        allDiagnostics.sort((a, b) => {
            const lineCompare = a.range.start.line - b.range.start.line;
            if (lineCompare !== 0) {
                return lineCompare;
            }
            return a.range.start.character - b.range.start.character;
        });

        return allDiagnostics;
    }

    /**
     * Extract the key range from a path using syntax tree directly
     */
    getKeyRangeFromPath(uri: string, path: string): Range | undefined {
        // Parse paths like "/Resources/User/Properties/Policies"
        // Remove leading slash if present and split by '/'
        const pathSegments = path.startsWith('/') ? path.slice(1).split('/') : path.split('/');

        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(uri);
        if (!syntaxTree) {
            return undefined;
        }

        // Get the node at the path
        const result = syntaxTree.getNodeByPath(pathSegments);
        if (!result.node) {
            return undefined;
        }

        // Check if this is a pair node (key/value pair)
        if (NodeType.isPairNode(result.node, syntaxTree.type)) {
            // Get the key node from the pair
            const keyNode = result.node.childForFieldName(FieldNames.KEY);
            if (keyNode) {
                return {
                    start: {
                        line: keyNode.startPosition.row,
                        character: keyNode.startPosition.column,
                    },
                    end: {
                        line: keyNode.endPosition.row,
                        character: keyNode.endPosition.column,
                    },
                };
            }
        }

        return undefined;
    }
}
