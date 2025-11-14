#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { extname, resolve, join } from 'path';
import { SyntaxTreeManager } from '../src/context/syntaxtree/SyntaxTreeManager';
import { ContextManager } from '../src/context/ContextManager';
import { SyntaxTree } from '../src/context/syntaxtree/SyntaxTree';
import { SyntaxNode } from 'tree-sitter';
import { toString } from '../src/utils/String';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { DocumentManager } from '../src/document/DocumentManager';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument/lib/esm/main';

/**
 * Debug Tree Script
 *
 * This script creates a SyntaxTree from a CloudFormation template file,
 * traverses the tree, and logs diagnostic information about each node.
 * It also creates Context objects for strategic positions in the file.
 *
 * USAGE:
 *   npm run debug-tree -- --file template.json
 *   npm run debug-tree -- --file template.yaml
 *   npm run debug-tree -- -f template.json --output-dir ./debug-output
 *   node --expose-gc -r ts-node/register tools/debug_tree.ts --file template.yaml
 *
 * OPTIONS:
 *   -f, --file <path>           Path to the CloudFormation template file (required)
 *   -o, --output-dir <path>     Output directory for results (default: ./tools)
 *   --show-contexts             Show Context objects for strategic positions (default: true)
 *   --show-tree                 Show syntax tree traversal (default: true)
 *   --verbose                   Show verbose node information (default: true)
 *   -h, --help                  Show help information
 */

interface DebugOptions {
    file: string;
    outputDir: string;
    showContexts: boolean;
    showTree: boolean;
    verbose: boolean;
}

interface NodeInfo {
    id: string;
    type: string;
    text: string;
    startPosition: { row: number; column: number };
    endPosition: { row: number; column: number };
    depth: number;
    childCount: number;
    namedChildCount: number;
    isNamed: boolean;
    hasError: boolean;
    isMissing: boolean;
    fieldName?: string;
    parent?: string;
    children: string[];
    namedChildren: string[];
}

interface ContextInfo {
    line: number;
    column: number;
    contextJson?: string;
    error?: string;
}

interface DebugResults {
    fileInfo: {
        path: string;
        extension: string;
        size: number;
        cloudFormationFileType: string;
    };
    syntaxTree: {
        rootNodeType: string;
        totalNodes: number;
        namedNodes: number;
        maxDepth: number;
        hasErrors: boolean;
    };
    nodes: NodeInfo[];
    contexts: ContextInfo[];
    summary: {
        nodeTypeDistribution: Record<string, number>;
        sectionDistribution: Record<string, number>;
        entityTypeDistribution: Record<string, number>;
        errorCount: number;
        contextCount: number;
    };
}

class DebugTreeTool {
    private readonly syntaxTreeManager: SyntaxTreeManager;
    private readonly documentManager: DocumentManager;
    private readonly contextManager: ContextManager;
    private nodeCounter = 0;
    private readonly nodeIdMap = new Map<SyntaxNode, string>();

    constructor() {
        this.syntaxTreeManager = new SyntaxTreeManager();
        this.documentManager = new DocumentManager(new TextDocuments(TextDocument));
        this.contextManager = new ContextManager(this.syntaxTreeManager);
    }

    public debugTemplate(options: DebugOptions): DebugResults {
        console.log(`🔍 Debugging CloudFormation template: ${options.file}`);

        // Read and parse the file
        const filePath = resolve(options.file);
        const content = readFileSync(filePath, 'utf8');
        const fileExtension = extname(filePath).toLowerCase();

        console.log(`📄 File size: ${content.length} characters`);
        console.log(`📝 File type: ${fileExtension}`);

        // Create syntax tree
        this.syntaxTreeManager.add(filePath, content);
        const syntaxTree = this.syntaxTreeManager.getSyntaxTree(filePath);

        if (!syntaxTree) {
            throw new Error(`Failed to create syntax tree for ${filePath}`);
        }

        const cloudFormationFileType = this.documentManager.get(filePath)?.cfnFileType;
        console.log(`☁️  CloudFormation file type: ${cloudFormationFileType}`);

        // Initialize results
        const results: DebugResults = {
            fileInfo: {
                path: filePath,
                extension: fileExtension,
                size: content.length,
                cloudFormationFileType: cloudFormationFileType!.toString(),
            },
            syntaxTree: {
                rootNodeType: '',
                totalNodes: 0,
                namedNodes: 0,
                maxDepth: 0,
                hasErrors: false,
            },
            nodes: [],
            contexts: [],
            summary: {
                nodeTypeDistribution: {},
                sectionDistribution: {},
                entityTypeDistribution: {},
                errorCount: 0,
                contextCount: 0,
            },
        };

        // Traverse syntax tree
        if (options.showTree) {
            console.log('\n🌳 Traversing syntax tree...');
            this.traverseTree(syntaxTree, results, options);
        }

        // Create contexts for strategic positions
        if (options.showContexts) {
            console.log('\n🎯 Creating contexts for strategic positions...');
            this.createContextsForPositions(filePath, content, results);
        }

        // Generate summary
        this.generateSummary(results);

        // Always write results to markdown files in tools directory
        this.writeMarkdownResults(options.outputDir, results, options);

        return results;
    }

    private traverseTree(syntaxTree: SyntaxTree, results: DebugResults, _options: DebugOptions): void {
        const rootNode = (syntaxTree as any).tree.rootNode;
        results.syntaxTree.rootNodeType = rootNode.type;
        results.syntaxTree.hasErrors = rootNode.hasError;

        // Use a queue for breadth-first traversal to get better coverage
        const queue: Array<{ node: SyntaxNode; depth: number }> = [{ node: rootNode, depth: 0 }];
        let maxDepth = 0;

        while (queue.length > 0) {
            const { node, depth } = queue.shift()!;

            maxDepth = Math.max(maxDepth, depth);
            const nodeId = this.getNodeId(node);

            // Get field name by finding this node's index in parent's children
            let fieldName: string | undefined;
            if (node.parent) {
                const childIndex = node.parent.children.indexOf(node);
                if (childIndex !== -1) {
                    fieldName = node.parent.fieldNameForChild(childIndex) ?? undefined;
                }
            }

            const nodeInfo: NodeInfo = {
                id: nodeId,
                type: node.type,
                text: node.text,
                startPosition: node.startPosition,
                endPosition: node.endPosition,
                depth,
                childCount: node.childCount,
                namedChildCount: node.namedChildCount,
                isNamed: node.isNamed,
                hasError: node.hasError,
                isMissing: node.isMissing,
                fieldName,
                parent: node.parent ? this.getNodeId(node.parent) : undefined,
                children: node.children.map((child) => this.getNodeId(child)),
                namedChildren: node.namedChildren.map((child) => this.getNodeId(child)),
            };

            results.nodes.push(nodeInfo);
            results.syntaxTree.totalNodes++;

            if (node.isNamed) {
                results.syntaxTree.namedNodes++;
            }

            if (node.hasError) {
                results.summary.errorCount++;
            }

            // Update node type distribution
            results.summary.nodeTypeDistribution[node.type] =
                (results.summary.nodeTypeDistribution[node.type] || 0) + 1;

            // Add all children to queue for breadth-first traversal
            for (let i = 0; i < node.childCount; i++) {
                const child = node.child(i);
                if (child) {
                    queue.push({ node: child, depth: depth + 1 });
                }
            }
        }

        results.syntaxTree.maxDepth = maxDepth;
        console.log(`✅ Traversed ${results.syntaxTree.totalNodes} nodes (${results.syntaxTree.namedNodes} named)`);
    }

    private createContextsForPositions(filePath: string, content: string, results: DebugResults): void {
        const lines = content.split('\n');

        // Generate strategic positions based on syntax tree nodes
        const strategicPositions: Array<{ line: number; column: number; reason: string }> = [];

        // Add positions from syntax tree nodes
        for (const nodeInfo of results.nodes) {
            if (nodeInfo.isNamed && nodeInfo.text.trim().length > 0) {
                strategicPositions.push({
                    line: nodeInfo.startPosition.row,
                    column: nodeInfo.startPosition.column,
                    reason: `Start of ${nodeInfo.type} node`,
                });

                // Also add end position for multi-character nodes
                if (
                    nodeInfo.endPosition.row === nodeInfo.startPosition.row &&
                    nodeInfo.endPosition.column > nodeInfo.startPosition.column + 1
                ) {
                    strategicPositions.push({
                        line: nodeInfo.endPosition.row,
                        column: nodeInfo.endPosition.column - 1,
                        reason: `End of ${nodeInfo.type} node`,
                    });
                }
            }
        }

        // Add positions at significant characters for each non-empty line
        for (const [lineIndex, line] of lines.entries()) {
            if (line.trim().length === 0) continue;

            // Add positions at CloudFormation-significant characters
            for (let i = 0; i < line.length; i++) {
                const char = line[i];
                const prevChar = i > 0 ? line[i - 1] : '';
                const nextChar = i < line.length - 1 ? line[i + 1] : '';

                if (
                    char === ':' || // Property separators
                    char === '!' || // Intrinsic function markers
                    char === '"' ||
                    char === "'" || // String delimiters
                    (char === '{' && nextChar === '{') || // Template expressions
                    char === '.' || // GetAtt separators
                    (prevChar === ' ' && char !== ' ') || // Start of words
                    (char === '-' && (nextChar === ' ' || i === line.length - 1)) // YAML list items
                ) {
                    strategicPositions.push({
                        line: lineIndex,
                        column: i,
                        reason: `Character '${char}' at position ${i}`,
                    });
                }
            }

            // Always include start, middle, and end of non-empty lines
            strategicPositions.push(
                { line: lineIndex, column: 0, reason: 'Line start' },
                { line: lineIndex, column: Math.floor(line.length / 2), reason: 'Line middle' },
                { line: lineIndex, column: Math.max(0, line.length - 1), reason: 'Line end' },
            );
        }

        // Remove duplicates and sort
        const uniquePositions = [...new Map(strategicPositions.map((p) => [`${p.line},${p.column}`, p])).values()].sort(
            (a, b) => a.line - b.line || a.column - b.column,
        );

        console.log(`🎯 Testing ${uniquePositions.length} strategic positions...`);

        for (const { line: lineIndex, column } of uniquePositions) {
            if (lineIndex >= lines.length || column >= lines[lineIndex].length) continue;

            const contextInfo: ContextInfo = {
                line: lineIndex,
                column,
            };

            try {
                const context = this.contextManager.getContext({
                    textDocument: { uri: filePath },
                    position: { line: lineIndex, character: column },
                });

                if (context) {
                    // Store the JSON string for markdown output
                    const record = context.logRecord();
                    record['text'] = this.truncateWithEllipsis(context.text, 25);
                    contextInfo.contextJson = toString(record);

                    results.summary.contextCount++;

                    // Update distributions
                    results.summary.sectionDistribution[context.section] =
                        (results.summary.sectionDistribution[context.section] || 0) + 1;
                    results.summary.entityTypeDistribution[context.entity.entityType.toString()] =
                        (results.summary.entityTypeDistribution[context.entity.entityType.toString()] || 0) + 1;
                }
            } catch (error) {
                contextInfo.error = error instanceof Error ? error.message : String(error);
            }

            results.contexts.push(contextInfo);
        }

        console.log(`✅ Created ${results.summary.contextCount} contexts from ${uniquePositions.length} positions`);
    }

    private generateSummary(_results: DebugResults): void {
        // Summary is already being built during traversal
        console.log('\n📊 Analysis complete.');
    }

    private writeMarkdownResults(outputDir: string, results: DebugResults, options: DebugOptions): void {
        // Ensure output directory exists
        if (!existsSync(outputDir)) {
            mkdirSync(outputDir, { recursive: true });
        }

        // Write tree visualization to markdown
        const treeMarkdown = this.generateTreeVisualizationMarkdown(results, options);
        const treeOutputPath = join(outputDir, 'debug-tree-visualization.md');
        writeFileSync(treeOutputPath, treeMarkdown);
        console.log(`🌲 Tree visualization written to: ${treeOutputPath}`);

        // Write node results to markdown
        const nodeMarkdown = this.generateNodeMarkdown(results, options);
        const nodeOutputPath = join(outputDir, 'debug-nodes.md');
        writeFileSync(nodeOutputPath, nodeMarkdown);
        console.log(`🌳 Node results written to: ${nodeOutputPath}`);

        // Write context results to markdown
        const contextMarkdown = this.generateContextMarkdown(results, options);
        const contextOutputPath = join(outputDir, 'debug-contexts.md');
        writeFileSync(contextOutputPath, contextMarkdown);
        console.log(`🎯 Context results written to: ${contextOutputPath}`);
    }

    private generateTreeVisualizationMarkdown(results: DebugResults, _options: DebugOptions): string {
        let markdown = `# Syntax Tree Visualization\n\n`;
        markdown += `**File:** ${results.fileInfo.path}\n`;
        markdown += `**File Type:** ${results.fileInfo.cloudFormationFileType}\n`;
        markdown += `**Total Nodes:** ${results.syntaxTree.totalNodes}\n`;
        markdown += `**Named Nodes:** ${results.syntaxTree.namedNodes}\n`;
        markdown += `**Max Depth:** ${results.syntaxTree.maxDepth}\n`;
        markdown += `**Has Errors:** ${results.syntaxTree.hasErrors}\n\n`;

        markdown += `## Tree Structure\n\n`;
        markdown += '```\n';

        // Build a tree structure from the nodes
        const nodeMap = new Map<string, NodeInfo>();
        let rootNode: NodeInfo | undefined;

        // First pass: create node map and find root
        for (const node of results.nodes) {
            nodeMap.set(node.id, node);
            if (!node.parent) {
                rootNode = node;
            }
        }

        if (rootNode) {
            markdown += this.renderTreeNode(rootNode, nodeMap, '', true, new Set());
        }

        markdown += '```\n\n';

        markdown += `## Node Details\n\n`;
        markdown += `| Node ID | Type | Position | Text Preview | Named | Error |\n`;
        markdown += `|---------|------|----------|--------------|-------|-------|\n`;

        for (const node of results.nodes) {
            const textPreview = this.truncateWithEllipsis(node.text.replace(/\n/g, '\\n'), 30);
            const position = `${node.startPosition.row}:${node.startPosition.column}-${node.endPosition.row}:${node.endPosition.column}`;
            const named = node.isNamed ? '✓' : '';
            const error = node.hasError ? '❌' : '';

            markdown += `| ${node.id} | ${node.type} | ${position} | \`${textPreview}\` | ${named} | ${error} |\n`;
        }

        return markdown;
    }

    private renderTreeNode(
        node: NodeInfo,
        nodeMap: Map<string, NodeInfo>,
        prefix: string,
        isLast: boolean,
        visited: Set<string>,
    ): string {
        // Prevent infinite loops
        if (visited.has(node.id)) {
            return `${prefix}${isLast ? '└── ' : '├── '}[CIRCULAR: ${node.id}]\n`;
        }
        visited.add(node.id);

        let result = '';
        const connector = isLast ? '└── ' : '├── ';
        const textPreview = this.truncateWithEllipsis(node.text.replace(/\n/g, '\\n'), 40);
        const position = `${node.startPosition.row}:${node.startPosition.column}`;
        const errorIndicator = node.hasError ? ' ❌' : '';
        const namedIndicator = node.isNamed ? ' [named]' : '';

        result += `${prefix}${connector}${node.type}${namedIndicator}${errorIndicator} @ ${position}\n`;

        if (textPreview.trim()) {
            const textPrefix = prefix + (isLast ? '    ' : '│   ');
            result += `${textPrefix}📝 "${textPreview}"\n`;
        }

        // Render children
        const children = node.children
            .map((childId) => nodeMap.get(childId))
            .filter((child): child is NodeInfo => child !== undefined);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            const isLastChild = i === children.length - 1;
            const childPrefix = prefix + (isLast ? '    ' : '│   ');

            result += this.renderTreeNode(child, nodeMap, childPrefix, isLastChild, new Set(visited));
        }

        visited.delete(node.id);
        return result;
    }

    private generateNodeMarkdown(results: DebugResults, _options: DebugOptions): string {
        let markdown = `# Syntax Tree Node Analysis\n\n`;
        markdown += `**File:** ${results.fileInfo.path}\n`;
        markdown += `**File Type:** ${results.fileInfo.cloudFormationFileType}\n`;
        markdown += `**Total Nodes:** ${results.syntaxTree.totalNodes}\n`;
        markdown += `**Named Nodes:** ${results.syntaxTree.namedNodes}\n`;
        markdown += `**Max Depth:** ${results.syntaxTree.maxDepth}\n`;
        markdown += `**Has Errors:** ${results.syntaxTree.hasErrors}\n\n`;

        markdown += `## Node Type Distribution\n\n`;
        const sortedNodeTypes = Object.entries(results.summary.nodeTypeDistribution).sort(([, a], [, b]) => b - a);

        for (const [nodeType, count] of sortedNodeTypes) {
            markdown += `- **${nodeType}**: ${count}\n`;
        }

        markdown += `\n## All Nodes\n\n`;

        for (const node of results.nodes) {
            markdown += `### Node: ${node.id}\n\n`;

            // Always include verbose information in the markdown
            markdown += '```json\n';
            markdown += toString(node);
            markdown += '\n```\n\n---\n\n';
        }

        return markdown;
    }

    private generateContextMarkdown(results: DebugResults, _options: DebugOptions): string {
        let markdown = `# Context Analysis\n\n`;
        markdown += `**File:** ${results.fileInfo.path}\n`;
        markdown += `**Total Contexts:** ${results.summary.contextCount}\n`;
        markdown += `**Total Positions Tested:** ${results.contexts.length}\n\n`;

        markdown += `## Section Distribution\n\n`;
        const sortedSections = Object.entries(results.summary.sectionDistribution).sort(([, a], [, b]) => b - a);

        for (const [section, count] of sortedSections) {
            markdown += `- **${section}**: ${count}\n`;
        }

        markdown += `\n## Entity Type Distribution\n\n`;
        const sortedEntityTypes = Object.entries(results.summary.entityTypeDistribution).sort(([, a], [, b]) => b - a);

        for (const [entityType, count] of sortedEntityTypes) {
            markdown += `- **${entityType}**: ${count}\n`;
        }

        markdown += `\n## All Contexts\n\n`;

        for (const contextInfo of results.contexts) {
            if (contextInfo.contextJson) {
                markdown += `### Context at Line ${contextInfo.line}, Column ${contextInfo.column}\n\n`;
                markdown += '```json\n';
                markdown += contextInfo.contextJson;
                markdown += '\n```\n\n---\n\n';
            } else if (contextInfo.error) {
                markdown += `### Error at Line ${contextInfo.line}, Column ${contextInfo.column}\n\n`;
                markdown += `**Error:** ${contextInfo.error}\n\n---\n\n`;
            }
        }

        return markdown;
    }

    private getNodeId(node: SyntaxNode): string {
        if (!this.nodeIdMap.has(node)) {
            this.nodeIdMap.set(node, `node_${this.nodeCounter++}`);
        }
        return this.nodeIdMap.get(node)!;
    }

    private truncateWithEllipsis(str: string, maxLength: number) {
        const fullLength = str.length;

        if (fullLength <= maxLength) {
            return str;
        }

        return `${str.slice(0, maxLength)}...(${fullLength} chars)`;
    }
}

// CLI setup
async function main() {
    const argv = await yargs(hideBin(process.argv))
        .option('file', {
            alias: 'f',
            type: 'string',
            description: 'Path to the CloudFormation template file',
            demandOption: true,
        })
        .option('output-dir', {
            alias: 'o',
            type: 'string',
            description: 'Output directory for markdown results',
            default: './tools',
        })
        .option('show-contexts', {
            type: 'boolean',
            description: 'Show Context objects for strategic positions',
            default: true,
        })
        .option('show-tree', {
            type: 'boolean',
            description: 'Show syntax tree traversal',
            default: true,
        })
        .option('verbose', {
            alias: 'v',
            type: 'boolean',
            description: 'Show verbose node information',
            default: true,
        })
        .help().argv;

    const options: DebugOptions = {
        file: argv.file,
        outputDir: argv['output-dir'],
        showContexts: argv['show-contexts'],
        showTree: argv['show-tree'],
        verbose: argv.verbose,
    };

    try {
        const debugTool = new DebugTreeTool();
        debugTool.debugTemplate(options);
    } catch (error) {
        console.error('❌ Error:', error instanceof Error ? error.message : String(error));
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

export { DebugTreeTool, DebugOptions, DebugResults };
