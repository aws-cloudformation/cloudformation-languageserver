import { SyntaxNode } from 'tree-sitter';
import { DocumentSymbol, SymbolKind, DocumentSymbolParams, Range, Position } from 'vscode-languageserver';
import { Context, SectionType } from '../context/Context';
import { TopLevelSection } from '../context/ContextType';
import { contextEntitiesInSections } from '../context/SectionContextBuilder';
import { EntityType } from '../context/semantic/SemanticTypes';
import { SyntaxTreeManager } from '../context/syntaxtree/SyntaxTreeManager';
import { FieldNames } from '../context/syntaxtree/utils/TreeSitterTypes';
import { LoggerFactory } from '../telemetry/LoggerFactory';
import { Track } from '../telemetry/TelemetryDecorator';
import { extractErrorMessage } from '../utils/Errors';
import { nodeToRange, pointToPosition } from '../utils/TypeConverters';

// Configuration for CloudFormation sections - defines all section behavior in one place
interface SectionConfig {
    section: TopLevelSection;
    symbolKind: SymbolKind;
    hasEntities: boolean;
    entityType?: 'simple' | 'typed';
    entitySymbolKind?: SymbolKind;
    entityEntityType?: EntityType;
}

const SECTION_CONFIGS: SectionConfig[] = [
    {
        section: TopLevelSection.AWSTemplateFormatVersion,
        symbolKind: SymbolKind.Constant,
        hasEntities: false,
    },
    {
        section: TopLevelSection.Description,
        symbolKind: SymbolKind.String,
        hasEntities: false,
    },
    {
        section: TopLevelSection.Transform,
        symbolKind: SymbolKind.Package,
        hasEntities: false,
    },
    {
        section: TopLevelSection.Parameters,
        symbolKind: SymbolKind.Module,
        hasEntities: true,
        entityType: 'typed',
        entitySymbolKind: SymbolKind.Variable,
        entityEntityType: EntityType.Parameter,
    },
    {
        section: TopLevelSection.Mappings,
        symbolKind: SymbolKind.Object,
        hasEntities: true,
        entityType: 'simple',
        entitySymbolKind: SymbolKind.Object,
    },
    {
        section: TopLevelSection.Conditions,
        symbolKind: SymbolKind.Boolean,
        hasEntities: true,
        entityType: 'simple',
        entitySymbolKind: SymbolKind.Boolean,
    },
    {
        section: TopLevelSection.Rules,
        symbolKind: SymbolKind.Function,
        hasEntities: true,
        entityType: 'simple',
        entitySymbolKind: SymbolKind.Function,
    },
    {
        section: TopLevelSection.Resources,
        symbolKind: SymbolKind.Namespace,
        hasEntities: true,
        entityType: 'typed',
        entitySymbolKind: SymbolKind.Class,
        entityEntityType: EntityType.Resource,
    },
    {
        section: TopLevelSection.Outputs,
        symbolKind: SymbolKind.Interface,
        hasEntities: true,
        entityType: 'simple',
        entitySymbolKind: SymbolKind.Field,
    },
    {
        section: TopLevelSection.Metadata,
        symbolKind: SymbolKind.Namespace,
        hasEntities: true,
        entityType: 'simple',
        entitySymbolKind: SymbolKind.Namespace,
    },
];
const log = LoggerFactory.getLogger('DocumentSymbolRouter');

export class DocumentSymbolRouter {
    private readonly log = LoggerFactory.getLogger(DocumentSymbolRouter);

    constructor(private readonly syntaxTreeManager: SyntaxTreeManager) {}

    @Track({ name: 'getDocumentSymbols' })
    getDocumentSymbols(params: DocumentSymbolParams) {
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(params.textDocument.uri);
        if (!syntaxTree) {
            return [];
        }

        try {
            const symbols: DocumentSymbol[] = [];

            // Get all top-level sections from the syntax tree using our configuration
            const sectionsToFind = SECTION_CONFIGS.map((config) => config.section);
            const topLevelSections = syntaxTree.findTopLevelSections(sectionsToFind);

            // Use the existing contextEntitiesInSections function to get properly parsed entities
            const contextEntities = contextEntitiesInSections(topLevelSections, syntaxTree);

            // Process each section
            for (const [section, sectionNode] of topLevelSections.entries()) {
                const sectionSymbol = this.createSectionSymbol(section, sectionNode, contextEntities);
                if (sectionSymbol) {
                    symbols.push(sectionSymbol);
                }
            }

            return symbols;
        } catch (error) {
            log.error(`Error creating document symbols for ${params.textDocument.uri}: ${extractErrorMessage(error)}`);
            return [];
        }
    }

    private createSectionSymbol(
        section: TopLevelSection,
        sectionNode: SyntaxNode,
        contextEntities: Map<SectionType, Map<string, Context>>,
    ): DocumentSymbol | undefined {
        // Find the configuration for this section
        const config = SECTION_CONFIGS.find((c) => c.section === section);
        if (!config) {
            this.log.warn(`No configuration found for section: ${section}`);
            return undefined;
        }

        const sectionRange = nodeToRange(sectionNode);
        const sectionSelectionRange = this.getKeyRange(sectionNode) ?? sectionRange;

        const sectionSymbol: DocumentSymbol = {
            name: section,
            kind: config.symbolKind,
            range: sectionRange,
            selectionRange: sectionSelectionRange,
            children: [],
        };

        // Add children if this section has entities
        if (config.hasEntities) {
            const sectionEntities = contextEntities.get(section as SectionType);

            if (config.entityType === 'simple' && config.entitySymbolKind) {
                const symbolKind = config.entitySymbolKind;
                sectionSymbol.children = this.extractEntitySymbols(sectionEntities, (logicalId, context) =>
                    this.createBaseEntitySymbol(logicalId, context, symbolKind),
                );
            } else if (config.entityType === 'typed' && config.entitySymbolKind && config.entityEntityType) {
                const symbolKind = config.entitySymbolKind;
                const entityType = config.entityEntityType;
                sectionSymbol.children = this.extractEntitySymbols(sectionEntities, (logicalId, context) =>
                    this.createTypedEntitySymbol(logicalId, context, symbolKind, entityType),
                );
            }
        }

        return sectionSymbol;
    }

    // Generic method to extract entity symbols using existing infrastructure
    private extractEntitySymbols(
        sectionEntities: Map<string, Context> | undefined,
        createSymbol: (logicalId: string, context: Context) => DocumentSymbol,
    ): DocumentSymbol[] {
        if (!sectionEntities) {
            return [];
        }

        const symbols: DocumentSymbol[] = [];

        // No need to search for entity nodes - Context already has entityRootNode!
        for (const [logicalId, context] of sectionEntities.entries()) {
            const symbol = createSymbol(logicalId, context);
            symbols.push(symbol);
        }

        return symbols;
    }

    // Helper method to create the base entity symbol with common range logic
    private createBaseEntitySymbol(name: string, context: Context, symbolKind: SymbolKind): DocumentSymbol {
        const range = context.entityRootNode ? nodeToRange(context.entityRootNode) : this.createFallbackRange();
        const selectionRange = Range.create(
            pointToPosition(context.startPosition),
            pointToPosition(context.endPosition),
        );

        return {
            name,
            kind: symbolKind,
            range,
            selectionRange,
            children: [],
        };
    }

    // Generic method to create type-based entity symbols (logical ID + Type from entity)
    private createTypedEntitySymbol(
        logicalId: string,
        context: Context,
        symbolKind: SymbolKind,
        entityType: EntityType,
    ): DocumentSymbol {
        // Extract type from entity - handle cases where entity or Type property might be undefined
        let typeInfo = '';
        try {
            if (context.entity && 'Type' in context.entity && context.entity.entityType === entityType) {
                const typedEntity = context.entity as { Type?: string };
                // Additional safety check - ensure typedEntity is not null/undefined before accessing Type
                if (typedEntity && typeof typedEntity === 'object') {
                    typeInfo = typedEntity.Type ?? '';
                }
            }
        } catch (error) {
            this.log.debug(
                { error, logicalId, entityType },
                'Failed to extract type information from entity during document symbol creation',
            );
        }

        // Always show the Type in parentheses, even if it's empty
        const displayName = `${logicalId} (${typeInfo})`;
        return this.createBaseEntitySymbol(displayName, context, symbolKind);
    }

    private createFallbackRange(): Range {
        // Fallback range when we can't find the actual node
        return Range.create(Position.create(0, 0), Position.create(0, 1));
    }

    private getKeyRange(node: SyntaxNode): Range | undefined {
        const keyNode = node.childForFieldName(FieldNames.KEY);
        return keyNode ? nodeToRange(keyNode) : undefined;
    }
}
