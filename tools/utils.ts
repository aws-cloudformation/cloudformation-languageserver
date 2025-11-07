import { readFileSync, statSync } from 'fs';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { detectDocumentType, uriToPath } from '../src/document/DocumentUtils';
import { CloudFormationFileType, DocumentType, Document } from '../src/document/Document';

export type TestPosition = {
    line: number;
    character: number;
    depth: number;
};

export function generatePositions(content: string, iterations: number): TestPosition[] {
    const lines = content.split('\n');
    const positions: TestPosition[] = [];

    // Detect if this is JSON or YAML based on content
    const isJson = content.trim().startsWith('{') || content.trim().startsWith('[');

    for (const [i, line] of lines.entries()) {
        const trimmedLine = line.trim();

        // Skip empty lines and comments
        if (trimmedLine.length === 0 || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
            continue;
        }

        // Calculate depth based on indentation
        const indentLevel = line.length - line.trimStart().length;
        let depth: number;

        if (isJson) {
            // For JSON, count braces and brackets to determine nesting
            const beforeLine = content.slice(0, Math.max(0, content.indexOf(line)));
            const openBraces = (beforeLine.match(/[{[]/g) ?? []).length;
            const closeBraces = (beforeLine.match(/[}\]]/g) ?? []).length;
            depth = Math.max(1, openBraces - closeBraces + 1);
        } else {
            // For YAML, use indentation (handle both 2-space and 4-space, and tabs)
            const tabCount = line.match(/^\t*/)?.[0]?.length ?? 0;
            const spaceCount = indentLevel - tabCount;

            if (tabCount > 0) {
                depth = tabCount + 1;
            } else {
                // Auto-detect indentation (2 or 4 spaces most common)
                const indentSize = spaceCount > 0 ? (spaceCount <= 2 ? 2 : 4) : 2;
                depth = Math.floor(spaceCount / indentSize) + 1;
            }
        }

        // Generate multiple positions per line for better coverage
        const linePositions: TestPosition[] = [];

        // Position 1: At the start of content (after indentation)
        linePositions.push({
            line: i,
            character: indentLevel,
            depth,
        });

        // Position 2: After colon (for key-value pairs)
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0 && colonIndex < line.length - 1) {
            linePositions.push({
                line: i,
                character: colonIndex + 2, // After ": "
                depth,
            });
        }

        // Position 3: In the middle of values (for strings, numbers)
        const valueMatch = trimmedLine.match(/:\s*(.+)$/);
        if (valueMatch && valueMatch[1].length > 3) {
            const valueStart = line.indexOf(valueMatch[1]);
            const midValue = valueStart + Math.floor(valueMatch[1].length / 2);
            linePositions.push({
                line: i,
                character: midValue,
                depth,
            });
        }

        // Position 4: At array/object indicators
        if (trimmedLine.includes('[') || trimmedLine.includes('{')) {
            const bracketIndex = Math.max(line.indexOf('['), line.indexOf('{'));
            if (bracketIndex > 0) {
                linePositions.push({
                    line: i,
                    character: bracketIndex + 1,
                    depth: depth + 1,
                });
            }
        }

        positions.push(...linePositions);
    }

    if (positions.length === 0) {
        // Fallback: generate basic positions
        for (let i = 0; i < Math.min(lines.length, 10); i++) {
            if (lines[i].trim().length > 0) {
                positions.push({
                    line: i,
                    character: 0,
                    depth: 1,
                });
            }
        }
    }

    // Group positions by depth for balanced testing
    const positionsByDepth = new Map<number, TestPosition[]>();
    for (const pos of positions) {
        if (!positionsByDepth.has(pos.depth)) {
            positionsByDepth.set(pos.depth, []);
        }
        positionsByDepth.get(pos.depth)!.push(pos);
    }

    // Generate test positions with deterministic, balanced depth distribution
    const testPositions: TestPosition[] = [];
    const depths = [...positionsByDepth.keys()].sort((a, b) => b - a); // Deepest first

    // Calculate weights for each depth (deeper positions get higher weight)
    const depthWeights = new Map<number, number>();
    for (const depth of depths) {
        // Give higher weight to deeper positions (exponential weighting)
        const weight = Math.pow(1.5, depth - 1);
        depthWeights.set(depth, weight);
    }

    // Calculate total weight
    const totalWeight = [...depthWeights.values()].reduce((sum, weight) => sum + weight, 0);

    // Distribute iterations deterministically based on weights
    for (let i = 0; i < iterations; i++) {
        // Use deterministic distribution based on iteration index
        const weightRatio = (i / iterations) * totalWeight;
        let accumulatedWeight = 0;
        let selectedDepth = depths[0];

        for (const depth of depths) {
            const weight = depthWeights.get(depth)!;
            accumulatedWeight += weight;
            if (weightRatio <= accumulatedWeight) {
                selectedDepth = depth;
                break;
            }
        }

        const depthPositions = positionsByDepth.get(selectedDepth)!;
        // Use deterministic selection based on iteration index
        const positionIndex = i % depthPositions.length;
        const selectedPosition = depthPositions[positionIndex];
        testPositions.push(selectedPosition);
    }

    return testPositions;
}

export type TemplateFile = {
    name: string;
    path: string;
    extension: string;
    documentType: DocumentType;
    cfnFileType: CloudFormationFileType;
    content: string;
    size: number;
};

export function discoverTemplateFiles(paths: string[]): TemplateFile[] {
    return paths
        .map((path): TemplateFile => {
            const content = readFileSync(path, 'utf8');
            const { extension, type } = detectDocumentType(path, content);
            const textDocument = TextDocument.create(path, type === DocumentType.JSON ? 'json' : 'yaml', 1, content);
            const document = new Document(textDocument);

            return {
                name: uriToPath(path).base,
                path: path,
                extension,
                documentType: type,
                cfnFileType: document.cfnFileType,
                content,
                size: statSync(path).size,
            };
        })
        .sort((a, b) => a.size - b.size);
}
