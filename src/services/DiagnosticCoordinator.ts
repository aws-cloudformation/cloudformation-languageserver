import { Diagnostic, PublishDiagnosticsParams } from 'vscode-languageserver';
import { LspDiagnostics } from '../protocol/LspDiagnostics';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { CFN_VALIDATION_SOURCE } from '../templates/ValidationWorkflow';
import { extractErrorMessage } from '../utils/Errors';

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

    constructor(private readonly lspDiagnostics: LspDiagnostics) {}

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

            // Merge all diagnostics from all sources
            const mergedDiagnostics = this.mergeDiagnostics(collection);

            // Publish merged diagnostics to LSP client
            const params: PublishDiagnosticsParams = {
                uri,
                diagnostics: mergedDiagnostics,
            };

            await this.lspDiagnostics.publishDiagnostics(params);

            this.log.debug(
                `Published ${mergedDiagnostics.length} diagnostics for ${uri} from ${collection.size} sources`,
            );
        } catch (error) {
            this.log.error(
                `Failed to publish diagnostics for source ${source}, URI ${uri}: ${extractErrorMessage(error)}`,
            );
            throw error;
        }
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

            this.log.debug(`Cleared all diagnostics for ${uri} from ${collection.size} sources`);
        } catch (error) {
            this.log.error(`Failed to clear all diagnostics for URI ${uri}: ${extractErrorMessage(error)}`);
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
}
