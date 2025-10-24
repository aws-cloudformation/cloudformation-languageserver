#!/usr/bin/env node --expose-gc

import { ContextManager } from '../src/context/ContextManager';
import { SyntaxTreeManager } from '../src/context/syntaxtree/SyntaxTreeManager';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, extname, resolve, basename, dirname } from 'path';
import { EntityType } from '../src/context/semantic/SemanticTypes';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { discoverTemplateFiles, generatePositions, TestPosition } from './utils';
import { DocumentType } from '../src/document/Document';
import { TelemetryService } from '../src/telemetry/TelemetryService';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';

/**
 * This script benchmarks the performance of context resolution for CloudFormation templates,
 * measuring syntax tree creation and context lookup latencies across multiple iterations.
 *
 * USAGE:
 *
 * Run with npm (recommended):
 *   npm run benchmark                                    # Default: 10,000 iterations, auto-discover templates, timestamped output
 *   npm run benchmark -- --help                         # Show all available options
 *   npm run benchmark -- --iterations 50000             # Custom iteration count
 *   npm run benchmark -- --templates file1.json file2.yaml  # Specific template files
 *   npm run benchmark -- -t template.json -i 5000       # Short form options
 *   npm run benchmark -- --output ./results/my-test.md  # Custom output file
 *
 * Run directly with node:
 *   node --expose-gc -r ts-node/register benchmark/benchmark.ts --help
 *   node --expose-gc -r ts-node/register benchmark/benchmark.ts --output ./my-results.md
 *
 * COMMAND LINE OPTIONS:
 *   -i, --iterations <number>    Number of iterations per template (default: 10000)
 *   -t, --templates <files...>   List of template file paths (JSON/YAML)
 *                               If not specified, auto-discovers templates in current directory
 *   -o, --output <file>          Output file path for benchmark results
 *                               Default: benchmark/benchmark-results-YYYY-MM-DD-HHMMSS.md
 *   -h, --help                  Show help information
 *
 * EXAMPLES:
 *   npm run benchmark -- --iterations 100000
 *   npm run benchmark -- --templates ./templates/small.json ./templates/large.yaml
 *   npm run benchmark -- -t template1.json template2.json -i 25000
 *   npm run benchmark -- --output ./results/my-benchmark.md
 *   npm run benchmark -- -o benchmark-$(date +%Y%m%d).md -i 5000
 *
 * OUTPUT:
 *   - Console output with real-time progress and summary statistics
 *   - Detailed markdown report saved to specified output file (default: timestamped)
 *   - Performance percentiles (P50, P90, P95, P99, P99.9, P99.99)
 *   - Memory usage analysis and resource consumption metrics
 *
 * REQUIREMENTS:
 *   - Node.js with --expose-gc flag (for accurate memory measurements)
 *   - TypeScript compilation (npm run build) or ts-node for direct execution
 *   - Template files must be valid JSON or YAML CloudFormation templates
 *
 * DETERMINISTIC BEHAVIOR:
 *   - Test positions are generated deterministically (no randomization)
 *   - Results are reproducible across runs with same parameters
 *   - Position selection uses weighted distribution based on template depth
 */
/**
 * Generate a default output filename with timestamp
 */
function generateDefaultOutputPath(): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/:/g, '').replace(/\..+/, '').replace('T', '-');
    return join(__dirname, `benchmark-results-${timestamp}.md`);
}

const argv = yargs(hideBin(process.argv))
    .option('iterations', {
        alias: 'i',
        type: 'number',
        default: 10000,
        description: 'Number of iterations per template',
        coerce: (value: number) => {
            if (value <= 0) {
                throw new Error('Iterations must be a positive number');
            }
            return value;
        },
    })
    .option('templates', {
        alias: 't',
        type: 'array',
        description: 'List of template file paths (JSON/YAML)',
        default: [],
        coerce: (values: string[]) => {
            if (values.length === 0) {
                // Default behavior: discover files in current directory
                const currentDir = join(__dirname, '.');
                const files = readdirSync(currentDir);
                return files
                    .filter((file) => {
                        const ext = extname(file).toLowerCase();
                        return ext === '.json' || ext === '.yaml' || ext === '.yml';
                    })
                    .map((file) => resolve(currentDir, file));
            }

            // Validate each provided template path
            const resolvedPaths = values.map((path) => resolve(path));
            for (const path of resolvedPaths) {
                if (!existsSync(path)) {
                    throw new Error(`Template file does not exist: ${path}`);
                }
                const ext = extname(path).toLowerCase();
                if (!['.json', '.yaml', '.yml'].includes(ext)) {
                    throw new Error(`Template file must be JSON or YAML: ${path}`);
                }
            }
            return resolvedPaths;
        },
    })
    .option('output', {
        alias: 'o',
        type: 'string',
        description: 'Output file path for benchmark results',
        default: generateDefaultOutputPath(),
        coerce: (value: string) => {
            const resolvedPath = resolve(value);

            // Ensure the directory exists
            const outputDir = dirname(resolvedPath);
            if (!existsSync(outputDir)) {
                try {
                    mkdirSync(outputDir, { recursive: true });
                } catch (error) {
                    throw new Error(`Cannot create output directory: ${outputDir} - ${error}`);
                }
            }

            // Validate file extension
            const ext = extname(resolvedPath).toLowerCase();
            if (ext !== '.md') {
                throw new Error(`Output file must have .md extension: ${resolvedPath}`);
            }

            return resolvedPath;
        },
    })
    .help()
    .alias('help', 'h')
    .example('$0', 'Run benchmark with default settings (10,000 iterations, auto-discover templates)')
    .example('$0 --iterations 50000', 'Run with 50,000 iterations per template')
    .example('$0 --templates template1.json template2.yaml', 'Run with specific template files')
    .example('$0 -t ./templates/*.json -i 5000', 'Run with JSON templates and 5,000 iterations')
    .example('$0 --output ./results/my-benchmark.md', 'Save results to custom location')
    .example('$0 -o benchmark-$(date +%Y%m%d).md -i 5000', 'Custom output filename with date')
    .parseSync();

// Configuration from command line arguments
const ITERATIONS = argv.iterations;
const TEMPLATE_PATHS = argv.templates as string[];
const OUTPUT_PATH = argv.output as string;

type Percentiles = {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    p99_9: number;
    p99_99: number;
};

type ResourceUsage = {
    cpuUsage: {
        user: number; // microseconds
        system: number; // microseconds
    };
    memoryUsage: {
        rss: number; // bytes
        heapUsed: number; // bytes
        heapTotal: number; // bytes
        external: number; // bytes
        arrayBuffers: number; // bytes
    };
};

interface BenchmarkResult {
    templateName: string;
    format: 'JSON' | 'YAML';
    iterations: number;
    contextNotFoundCount: number;
    contextUnknownCount: number;
    contextWithEntitiesNotFoundCount: number;
    relatedEntitiesCounts: number[];
    totalLatencies: number[];
    syntaxTreeLatencies: number[];
    contextLatencies: number[];
    contextWithEntitiesLatencies: number[];
    resourceUsage: {
        initial: ResourceUsage;
        final: ResourceUsage;
        peak: ResourceUsage;
        cpuUsagePercentiles: Percentiles;
        memoryUsagePercentiles: {
            rss: Percentiles;
            heapUsed: Percentiles;
            heapTotal: Percentiles;
        };
    };
    percentiles: {
        total: Percentiles;
        syntaxTree: Percentiles;
        context: Percentiles;
        contextWithEntities: Percentiles;
        relatedEntities: Percentiles;
    };
}

const templateFiles = discoverTemplateFiles(TEMPLATE_PATHS);

const templates = new Map<string, string>();

function formatNumber(num: number): string {
    return num.toLocaleString('en-US');
}

// Helper function to safely format numbers that might be NaN or Infinity
function safeFormatNumber(num: number, decimals: number = 2): string {
    if (isNaN(num)) return 'N/A';
    if (!isFinite(num)) return 'N/A';
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

// Helper function to safely format percentages
function safeFormatPercentage(numerator: number, denominator: number): string {
    if (denominator === 0) return 'N/A';
    const percentage = (numerator / denominator) * 100;
    if (isNaN(percentage) || !isFinite(percentage)) return 'N/A';
    return percentage.toFixed(1);
}

function loadTemplates(): void {
    templateFiles.forEach(({ name, path }) => {
        const content = readFileSync(path, 'utf8');
        templates.set(name, content);
    });
}

function calculatePercentiles(latencies: number[]): Percentiles {
    if (latencies.length === 0) {
        return {
            p50: NaN,
            p90: NaN,
            p95: NaN,
            p99: NaN,
            p99_9: NaN,
            p99_99: NaN,
        };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const len = sorted.length;

    // Use proper percentile calculation with interpolation for edge cases
    const getPercentile = (p: number): number => {
        if (len === 1) return sorted[0];
        const index = (len - 1) * p;
        const lower = Math.floor(index);
        const upper = Math.ceil(index);
        const weight = index % 1;

        if (upper >= len) return sorted[len - 1];
        if (lower < 0) return sorted[0];

        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    };

    return {
        p50: getPercentile(0.5),
        p90: getPercentile(0.9),
        p95: getPercentile(0.95),
        p99: getPercentile(0.99),
        p99_9: getPercentile(0.999),
        p99_99: getPercentile(0.9999),
    };
}

function getCurrentResourceUsage(): ResourceUsage {
    const cpuUsage = process.cpuUsage();
    const memoryUsage = process.memoryUsage();

    return {
        cpuUsage: {
            user: cpuUsage.user,
            system: cpuUsage.system,
        },
        memoryUsage: {
            rss: memoryUsage.rss,
            heapUsed: memoryUsage.heapUsed,
            heapTotal: memoryUsage.heapTotal,
            external: memoryUsage.external,
            arrayBuffers: memoryUsage.arrayBuffers,
        },
    };
}

function calculateResourceDelta(initial: ResourceUsage, current: ResourceUsage): ResourceUsage {
    return {
        cpuUsage: {
            user: current.cpuUsage.user - initial.cpuUsage.user,
            system: current.cpuUsage.system - initial.cpuUsage.system,
        },
        memoryUsage: {
            rss: current.memoryUsage.rss - initial.memoryUsage.rss,
            heapUsed: current.memoryUsage.heapUsed - initial.memoryUsage.heapUsed,
            heapTotal: current.memoryUsage.heapTotal - initial.memoryUsage.heapTotal,
            external: current.memoryUsage.external - initial.memoryUsage.external,
            arrayBuffers: current.memoryUsage.arrayBuffers - initial.memoryUsage.arrayBuffers,
        },
    };
}

function updatePeakUsage(peak: ResourceUsage, current: ResourceUsage): ResourceUsage {
    return {
        cpuUsage: {
            user: Math.max(peak.cpuUsage.user, current.cpuUsage.user),
            system: Math.max(peak.cpuUsage.system, current.cpuUsage.system),
        },
        memoryUsage: {
            rss: Math.max(peak.memoryUsage.rss, current.memoryUsage.rss),
            heapUsed: Math.max(peak.memoryUsage.heapUsed, current.memoryUsage.heapUsed),
            heapTotal: Math.max(peak.memoryUsage.heapTotal, current.memoryUsage.heapTotal),
            external: Math.max(peak.memoryUsage.external, current.memoryUsage.external),
            arrayBuffers: Math.max(peak.memoryUsage.arrayBuffers, current.memoryUsage.arrayBuffers),
        },
    };
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const size = bytes / Math.pow(k, i);
    return `${size.toFixed(2)} ${sizes[i]}`;
}

function benchmarkTemplate(templateName: string, format: DocumentType): BenchmarkResult | null {
    // @ts-ignore
    global.gc();
    const content = templates.get(templateName);
    if (!content) {
        console.error(`❌ Template ${templateName} not found, skipping...`);
        return null;
    }

    const uri = `file:///${templateName}`;

    let testPositions: TestPosition[];
    try {
        testPositions = generatePositions(content, ITERATIONS);
    } catch (error) {
        console.error(`❌ Failed to generate test positions for ${templateName}: ${error}, skipping...`);
        return null;
    }

    const totalLatencies: number[] = [];
    const syntaxTreeLatencies: number[] = [];
    const contextLatencies: number[] = [];
    const contextWithEntitiesLatencies: number[] = [];
    const relatedEntitiesCounts: number[] = [];
    const cpuUsageDeltas: number[] = [];
    const rssUsages: number[] = [];
    const heapUsedUsages: number[] = [];
    const heapTotalUsages: number[] = [];

    let contextNotFoundCount = 0;
    let contextUnknownCount = 0;
    let contextWithEntitiesNotFoundCount = 0;
    let errors = 0;

    console.log(`Running ${formatNumber(ITERATIONS)} iterations for ${templateName}...`);
    const syntaxTreeManager = new SyntaxTreeManager();
    try {
        syntaxTreeManager.add(uri, content);
    } catch (error) {}
    const contextManager = new ContextManager(syntaxTreeManager);

    // Get initial resource usage
    const initialResourceUsage = getCurrentResourceUsage();
    let peakResourceUsage = { ...initialResourceUsage };

    for (let i = 0; i < ITERATIONS; i++) {
        const pos = testPositions[i];
        const iterationStartUsage = getCurrentResourceUsage();
        const totalStartTime = performance.now();

        let syntaxTreeSuccess = false;
        let contextSuccess = false;
        let contextWithEntitiesSuccess = false;
        let context = null;
        let contextWithEntities = null;

        // Try syntax tree creation
        try {
            const syntaxTreeStartTime = performance.now();
            syntaxTreeManager.add(uri, content);
            syntaxTreeLatencies.push((performance.now() - syntaxTreeStartTime) * 1000);
            syntaxTreeSuccess = true;
        } catch (error) {
            errors++;
            if (errors < 10 || errors % 5000 === 0) {
                console.warn(`⚠️  Iteration ${i + 1} syntax tree failed for ${templateName}: ${error}, continuing...`);
            }
        }

        // Always try context resolution, regardless of syntax tree success
        try {
            const contextStartTime = performance.now();
            context = contextManager.getContext({
                textDocument: { uri },
                position: { line: pos.line, character: pos.character },
            });

            // Force evaluate lazy properties
            context?.entity;
            context?.intrinsicContext;
            contextLatencies.push((performance.now() - contextStartTime) * 1000);
            contextSuccess = true;
        } catch (error) {
            errors++;
            if (errors < 10 || errors % 5000 === 0) {
                console.warn(
                    `⚠️  Iteration ${i + 1} context resolution failed for ${templateName}: ${error}, continuing...`,
                );
            }
        }

        // Try getContextAndRelatedEntities
        try {
            const contextWithEntitiesStartTime = performance.now();
            contextWithEntities = contextManager.getContextAndRelatedEntities({
                textDocument: { uri },
                position: { line: pos.line, character: pos.character },
            });

            // Force evaluate lazy properties
            contextWithEntities?.entity;
            contextWithEntities?.intrinsicContext;
            const relatedEntities = contextWithEntities?.relatedEntities;

            contextWithEntitiesLatencies.push((performance.now() - contextWithEntitiesStartTime) * 1000);
            contextWithEntitiesSuccess = true;

            if (relatedEntities) {
                let count = 0;
                for (const innerMap of relatedEntities.values()) {
                    count += innerMap.size;
                }
                relatedEntitiesCounts.push(count);
            }
        } catch (error) {
            errors++;
            if (errors < 10 || errors % 5000 === 0) {
                console.warn(
                    `⚠️  Iteration ${i + 1} contextWithEntities resolution failed for ${templateName}: ${error}, continuing...`,
                );
            }
        }

        // Record total latency ONLY if ALL operations succeeded
        if (syntaxTreeSuccess && contextSuccess && contextWithEntitiesSuccess) {
            totalLatencies.push((performance.now() - totalStartTime) * 1000);
        }

        // Track context results
        if (!contextSuccess) {
            // getContext threw an exception - context not found
            contextNotFoundCount++;
        } else if (context === undefined) {
            // getContext returned undefined - context not found
            contextNotFoundCount++;
        } else if (context && context.entity && context.entity.entityType === EntityType.Unknown) {
            // getContext returned a valid context but entity is Unknown
            contextUnknownCount++;
        }

        // Track contextWithEntities results
        if (!contextWithEntitiesSuccess || contextWithEntities === undefined) {
            contextWithEntitiesNotFoundCount++;
        }

        // Track resource usage (for any iteration that had at least partial success)
        if (syntaxTreeSuccess || contextSuccess || contextWithEntitiesSuccess) {
            const iterationEndUsage = getCurrentResourceUsage();
            const cpuDelta = calculateResourceDelta(iterationStartUsage, iterationEndUsage);
            cpuUsageDeltas.push(cpuDelta.cpuUsage.user + cpuDelta.cpuUsage.system);
            rssUsages.push(iterationEndUsage.memoryUsage.rss);
            heapUsedUsages.push(iterationEndUsage.memoryUsage.heapUsed);
            heapTotalUsages.push(iterationEndUsage.memoryUsage.heapTotal);

            // Update peak usage
            peakResourceUsage = updatePeakUsage(peakResourceUsage, iterationEndUsage);
        }

        if ((i + 1) % 2000 === 0) {
            console.log(`  Completed ${formatNumber(i + 1)}/${formatNumber(ITERATIONS)} iterations`);
            // Log current memory usage every 1000 iterations
            const currentMem = getCurrentResourceUsage().memoryUsage;
            console.log(
                `    Current memory: RSS=${formatBytes(currentMem.rss)}, Heap=${formatBytes(currentMem.heapUsed)}/${formatBytes(currentMem.heapTotal)}`,
            );
        }
    }
    // Get final resource usage
    const finalResourceUsage = getCurrentResourceUsage();
    syntaxTreeManager.deleteSyntaxTree(uri);

    // Ensure we have enough data points for meaningful percentiles
    if (totalLatencies.length < ITERATIONS * 0.1) {
        console.warn(
            `⚠️  Low success rate for ${templateName} (${totalLatencies.length}/${ITERATIONS} successful total measurements)`,
        );
    }

    if (errors > 0) {
        console.warn(`⚠️  Found ${errors} errors during ${templateName} benchmark`);
    }

    return {
        templateName,
        format,
        iterations: ITERATIONS, // Total attempted iterations
        contextNotFoundCount,
        contextUnknownCount,
        contextWithEntitiesNotFoundCount,
        relatedEntitiesCounts,
        totalLatencies,
        syntaxTreeLatencies,
        contextLatencies,
        contextWithEntitiesLatencies,
        resourceUsage: {
            initial: initialResourceUsage,
            final: finalResourceUsage,
            peak: peakResourceUsage,
            cpuUsagePercentiles: calculatePercentiles(cpuUsageDeltas),
            memoryUsagePercentiles: {
                rss: calculatePercentiles(rssUsages),
                heapUsed: calculatePercentiles(heapUsedUsages),
                heapTotal: calculatePercentiles(heapTotalUsages),
            },
        },
        percentiles: {
            total: calculatePercentiles(totalLatencies),
            syntaxTree: calculatePercentiles(syntaxTreeLatencies),
            context: calculatePercentiles(contextLatencies),
            contextWithEntities: calculatePercentiles(contextWithEntitiesLatencies),
            relatedEntities: calculatePercentiles(relatedEntitiesCounts),
        },
    };
}

function formatResults(result: BenchmarkResult): string {
    const {
        templateName,
        format,
        iterations,
        contextNotFoundCount,
        contextUnknownCount,
        contextWithEntitiesNotFoundCount,
        percentiles,
        resourceUsage,
    } = result;

    // Calculate context rates based on total iterations
    const contextFoundCount = iterations - contextNotFoundCount;
    const contextValidCount = contextFoundCount - contextUnknownCount;
    const contextFoundRate = safeFormatPercentage(contextFoundCount, iterations);
    const contextValidRate = safeFormatPercentage(contextValidCount, iterations);
    const contextUnknownRate = safeFormatPercentage(contextUnknownCount, iterations);
    const contextWithEntitiesFoundCount = iterations - contextWithEntitiesNotFoundCount;
    const contextWithEntitiesFoundRate = safeFormatPercentage(contextWithEntitiesFoundCount, iterations);

    // Calculate resource deltas
    const memoryDelta = calculateResourceDelta(resourceUsage.initial, resourceUsage.final);
    const peakMemoryDelta = calculateResourceDelta(resourceUsage.initial, resourceUsage.peak);

    // Get data point counts for each metric in Context/SyntaxTree/Total format
    const totalDataPoints = result.totalLatencies.length;
    const syntaxTreeDataPoints = result.syntaxTreeLatencies.length;
    const contextDataPoints = result.contextLatencies.length;
    const contextWithEntitiesDataPoints = result.contextWithEntitiesLatencies.length;

    // Check if we have valid data
    const hasValidData =
        totalDataPoints > 0 || syntaxTreeDataPoints > 0 || contextDataPoints > 0 || contextWithEntitiesDataPoints > 0;

    return `
## ${templateName} (${format})

### Overview
- **Target Iterations:** ${formatNumber(ITERATIONS)}
- **Successful Iterations:** ${formatNumber(iterations)}
- **Context Found:** ${formatNumber(contextFoundCount)} (${contextFoundRate}%)
- **Context Valid:** ${formatNumber(contextValidCount)} (${contextValidRate}%)
- **Context Unknown:** ${formatNumber(contextUnknownCount)} (${contextUnknownRate}%)
- **Context With Entities Found:** ${formatNumber(contextWithEntitiesFoundCount)} (${contextWithEntitiesFoundRate}%)
- **Related Entities Detected:** P50=${safeFormatNumber(percentiles.relatedEntities.p50, 0)}, P90=${safeFormatNumber(percentiles.relatedEntities.p90, 0)}, P99=${safeFormatNumber(percentiles.relatedEntities.p99, 0)}

### Data Points Used for Percentile Calculations
- **Context Resolution:** ${formatNumber(contextDataPoints)} measurements
- **Context With Entities:** ${formatNumber(contextWithEntitiesDataPoints)} measurements
- **Syntax Tree:** ${formatNumber(syntaxTreeDataPoints)} measurements  
- **Total Latency:** ${formatNumber(totalDataPoints)} measurements

${!hasValidData ? '⚠️ **No successful measurements - all metrics show N/A**\n' : ''}

### Performance Summary
| Component | P50 (μs) | P90 (μs) | P99 (μs) | P99.9 (μs) | P99.99 (μs) |
|-----------|----------|----------|----------|------------|-------------|
| **Total** | ${safeFormatNumber(percentiles.total.p50)} | ${safeFormatNumber(percentiles.total.p90)} | ${safeFormatNumber(percentiles.total.p99)} | ${safeFormatNumber(percentiles.total.p99_9)} | ${safeFormatNumber(percentiles.total.p99_99)} |
| **Syntax Tree** | ${safeFormatNumber(percentiles.syntaxTree.p50)} | ${safeFormatNumber(percentiles.syntaxTree.p90)} | ${safeFormatNumber(percentiles.syntaxTree.p99)} | ${safeFormatNumber(percentiles.syntaxTree.p99_9)} | ${safeFormatNumber(percentiles.syntaxTree.p99_99)} |
| **Context Resolution** | ${safeFormatNumber(percentiles.context.p50)} | ${safeFormatNumber(percentiles.context.p90)} | ${safeFormatNumber(percentiles.context.p99)} | ${safeFormatNumber(percentiles.context.p99_9)} | ${safeFormatNumber(percentiles.context.p99_99)} |
| **Context With Entities** | ${safeFormatNumber(percentiles.contextWithEntities.p50)} | ${safeFormatNumber(percentiles.contextWithEntities.p90)} | ${safeFormatNumber(percentiles.contextWithEntities.p99)} | ${safeFormatNumber(percentiles.contextWithEntities.p99_9)} | ${safeFormatNumber(percentiles.contextWithEntities.p99_99)} |

### Resource Usage
| Metric | Initial | Final | Peak | Delta | Peak Delta |
|--------|---------|-------|------|-------|------------|
| **RSS** | ${formatBytes(resourceUsage.initial.memoryUsage.rss)} | ${formatBytes(resourceUsage.final.memoryUsage.rss)} | ${formatBytes(resourceUsage.peak.memoryUsage.rss)} | ${formatBytes(memoryDelta.memoryUsage.rss)} | ${formatBytes(peakMemoryDelta.memoryUsage.rss)} |
| **Heap Used** | ${formatBytes(resourceUsage.initial.memoryUsage.heapUsed)} | ${formatBytes(resourceUsage.final.memoryUsage.heapUsed)} | ${formatBytes(resourceUsage.peak.memoryUsage.heapUsed)} | ${formatBytes(memoryDelta.memoryUsage.heapUsed)} | ${formatBytes(peakMemoryDelta.memoryUsage.heapUsed)} |
| **Heap Total** | ${formatBytes(resourceUsage.initial.memoryUsage.heapTotal)} | ${formatBytes(resourceUsage.final.memoryUsage.heapTotal)} | ${formatBytes(resourceUsage.peak.memoryUsage.heapTotal)} | ${formatBytes(memoryDelta.memoryUsage.heapTotal)} | ${formatBytes(peakMemoryDelta.memoryUsage.heapTotal)} |

### Performance Breakdown

#### Component Overhead (% of Total Time)
| Metric | P50 | P99 |
|--------|-----|-----|
| **Syntax Tree** | ${safeFormatPercentage(percentiles.syntaxTree.p50, percentiles.total.p50)}% | ${safeFormatPercentage(percentiles.syntaxTree.p99, percentiles.total.p99)}% |
| **Context Resolution** | ${safeFormatPercentage(percentiles.context.p50, percentiles.total.p50)}% | ${safeFormatPercentage(percentiles.context.p99, percentiles.total.p99)}% |
| **Context With Entities** | ${safeFormatPercentage(percentiles.contextWithEntities.p50, percentiles.total.p50)}% | ${safeFormatPercentage(percentiles.contextWithEntities.p99, percentiles.total.p99)}% |
- **Memory Growth:** ${formatBytes(memoryDelta.memoryUsage.rss)} RSS, ${formatBytes(memoryDelta.memoryUsage.heapUsed)} Heap
- **Peak Memory Usage:** ${formatBytes(resourceUsage.peak.memoryUsage.rss)} RSS, ${formatBytes(resourceUsage.peak.memoryUsage.heapUsed)} Heap

### CPU Usage Per Iteration
| Metric | CPU Time (μs) |
|--------|---------------|
| P50 | ${safeFormatNumber(resourceUsage.cpuUsagePercentiles.p50)} |
| P90 | ${safeFormatNumber(resourceUsage.cpuUsagePercentiles.p90)} |
| P99 | ${safeFormatNumber(resourceUsage.cpuUsagePercentiles.p99)} |
| P99.9 | ${safeFormatNumber(resourceUsage.cpuUsagePercentiles.p99_9)} |
| P99.99 | ${safeFormatNumber(resourceUsage.cpuUsagePercentiles.p99_99)} |
`;
}

function generateAndSaveReport(results: BenchmarkResult[]): void {
    const report: string[] = [];

    // Header
    report.push('# Context Resolution Benchmark Results\n');
    report.push(`**Generated:** ${new Date().toISOString()} at ${process.cwd()}`);
    report.push(`**Iterations per template:** ${formatNumber(ITERATIONS)}`);
    report.push(`**Templates benchmarked:** ${results.length}/${templateFiles.length}`);
    report.push(`**Total iterations:** ${formatNumber(results.reduce((sum, r) => sum + r.iterations, 0))}\n`);

    // Comparison Table
    report.push('## Performance Comparison\n');
    report.push(
        '| Template | Format | Size (KB) | Data Points | Success Rates | Related Entities (P50/P90/P99) | Syntax Tree P50/P99.9 (μs) | Context P50/P99.9 (μs) | Context+Entities P50/P99.9 (μs) | Total P50/P99.9 (μs) | Memory P50 (MB) |',
    );
    report.push(
        '|----------|--------|-----------|-------------|---------------|-------------------------------|----------------------------|------------------------|--------------------------------|----------------------|-----------------|',
    );

    // Sort results by file size (smallest first)
    const sortedResults = [...results].sort((a, b) => {
        const aContent = templates.get(a.templateName);
        const bContent = templates.get(b.templateName);
        if (!aContent || !bContent) return 0;
        const aSize = Buffer.byteLength(aContent, 'utf8');
        const bSize = Buffer.byteLength(bContent, 'utf8');
        return aSize - bSize;
    });

    sortedResults.forEach((result) => {
        const content = templates.get(result.templateName);
        if (!content) return;

        const fileSizeKB = (Buffer.byteLength(content, 'utf8') / 1024).toFixed(1);

        // Calculate context rates based on total iterations
        const contextFoundCount = result.iterations - result.contextNotFoundCount;
        const contextValidCount = contextFoundCount - result.contextUnknownCount;
        const contextFoundRate = safeFormatPercentage(contextFoundCount, result.iterations);
        const contextValidRate = safeFormatPercentage(contextValidCount, result.iterations);
        const contextWithEntitiesFoundCount = result.iterations - result.contextWithEntitiesNotFoundCount;
        const contextWithEntitiesFoundRate = safeFormatPercentage(contextWithEntitiesFoundCount, result.iterations);

        // Data points as bullets
        const syntaxTreeDataPoints = result.syntaxTreeLatencies.length;
        const contextWithEntitiesDataPoints = result.contextWithEntitiesLatencies.length;
        const dataPointsInfo = `• Syntax Tree: ${formatNumber(syntaxTreeDataPoints)}<br>• Valid Context: ${formatNumber(contextValidCount)}<br>• Found Context: ${formatNumber(contextFoundCount)}<br>• Context+Entities: ${formatNumber(contextWithEntitiesFoundCount)}`;

        // Success rates as bullets
        const successRatesInfo = `• Syntax Tree: ${safeFormatPercentage(syntaxTreeDataPoints, result.iterations)}%<br>• Valid Context: ${contextValidRate}%<br>• Found Context: ${contextFoundRate}%<br>• Context+Entities: ${contextWithEntitiesFoundRate}%`;

        // P50 and P99.9 latencies for each component
        const relatedEntitiesCount = `${safeFormatNumber(result.percentiles.relatedEntities.p50, 0)} / ${safeFormatNumber(result.percentiles.relatedEntities.p90, 0)} / ${safeFormatNumber(result.percentiles.relatedEntities.p99, 0)}`;
        const syntaxTreeLatencies = `${safeFormatNumber(result.percentiles.syntaxTree.p50)} / ${safeFormatNumber(result.percentiles.syntaxTree.p99_9)}`;
        const contextLatencies = `${safeFormatNumber(result.percentiles.context.p50)} / ${safeFormatNumber(result.percentiles.context.p99_9)}`;
        const contextWithEntitiesLatencies = `${safeFormatNumber(result.percentiles.contextWithEntities.p50)} / ${safeFormatNumber(result.percentiles.contextWithEntities.p99_9)}`;
        const totalLatencies = `${safeFormatNumber(result.percentiles.total.p50)} / ${safeFormatNumber(result.percentiles.total.p99_9)}`;

        // Memory usage
        const memoryP50MB = safeFormatNumber(result.resourceUsage.memoryUsagePercentiles.rss.p50 / (1024 * 1024), 1);

        report.push(
            `| ${result.templateName} | ${result.format} | ${fileSizeKB} | ${dataPointsInfo} | ${successRatesInfo} | ${relatedEntitiesCount} | ${syntaxTreeLatencies} | ${contextLatencies} | ${contextWithEntitiesLatencies} | ${totalLatencies} | ${memoryP50MB} |`,
        );
    });

    // Performance Analysis
    report.push('## Performance Analysis\n');

    const validResults = results.filter((r) => r.totalLatencies.length > 0);
    if (validResults.length > 0) {
        const totalP50Latencies = validResults.map((r) => r.percentiles.total.p50);
        const totalP99Latencies = validResults.map((r) => r.percentiles.total.p99);
        const syntaxTreeP50Latencies = validResults.map((r) => r.percentiles.syntaxTree.p50);
        const syntaxTreeP99Latencies = validResults.map((r) => r.percentiles.syntaxTree.p99);
        const contextP50Latencies = validResults.map((r) => r.percentiles.context.p50);
        const contextP99Latencies = validResults.map((r) => r.percentiles.context.p99);
        const contextWithEntitiesP50Latencies = validResults.map((r) => r.percentiles.contextWithEntities.p50);
        const contextWithEntitiesP99Latencies = validResults.map((r) => r.percentiles.contextWithEntities.p99);

        report.push('### Latency Distribution Ranges\n');

        report.push('| Component | P50 Range (μs) | P99 Range (μs) |');
        report.push('|-----------|----------------|----------------|');
        report.push(
            `| **Total Latency** | ${safeFormatNumber(Math.min(...totalP50Latencies))} - ${safeFormatNumber(Math.max(...totalP50Latencies))} | ${safeFormatNumber(Math.min(...totalP99Latencies))} - ${safeFormatNumber(Math.max(...totalP99Latencies))} |`,
        );
        report.push(
            `| **Syntax Tree** | ${safeFormatNumber(Math.min(...syntaxTreeP50Latencies))} - ${safeFormatNumber(Math.max(...syntaxTreeP50Latencies))} | ${safeFormatNumber(Math.min(...syntaxTreeP99Latencies))} - ${safeFormatNumber(Math.max(...syntaxTreeP99Latencies))} |`,
        );
        report.push(
            `| **Context Resolution** | ${safeFormatNumber(Math.min(...contextP50Latencies))} - ${safeFormatNumber(Math.max(...contextP50Latencies))} | ${safeFormatNumber(Math.min(...contextP99Latencies))} - ${safeFormatNumber(Math.max(...contextP99Latencies))} |`,
        );
        report.push(
            `| **Context With Entities** | ${safeFormatNumber(Math.min(...contextWithEntitiesP50Latencies))} - ${safeFormatNumber(Math.max(...contextWithEntitiesP50Latencies))} | ${safeFormatNumber(Math.min(...contextWithEntitiesP99Latencies))} - ${safeFormatNumber(Math.max(...contextWithEntitiesP99Latencies))} |\n`,
        );
    }

    report.push('### Context Success Analysis');
    sortedResults.forEach((result) => {
        // Calculate context rates based on total iterations
        const contextFoundCount = result.iterations - result.contextNotFoundCount;
        const contextValidCount = contextFoundCount - result.contextUnknownCount;
        const contextFoundRate = safeFormatPercentage(contextFoundCount, result.iterations);
        const contextValidRate = safeFormatPercentage(contextValidCount, result.iterations);
        const contextUnknownRate = safeFormatPercentage(result.contextUnknownCount, result.iterations);
        const contextWithEntitiesFoundCount = result.iterations - result.contextWithEntitiesNotFoundCount;
        const contextWithEntitiesFoundRate = safeFormatPercentage(contextWithEntitiesFoundCount, result.iterations);
        report.push(
            `- **${result.templateName}:** Found ${contextFoundRate}%, Valid ${contextValidRate}%, Unknown ${contextUnknownRate}%, With Entities ${contextWithEntitiesFoundRate}%`,
        );
    });

    report.push('### Component Overhead Analysis\n');

    report.push('| Template | Syntax Tree Overhead | Context Resolution Overhead | Context With Entities Overhead |');
    report.push('|----------|---------------------|----------------------------|-------------------------------|');

    sortedResults.forEach((result) => {
        const syntaxTreeP50Pct = safeFormatPercentage(result.percentiles.syntaxTree.p50, result.percentiles.total.p50);
        const syntaxTreeP99Pct = safeFormatPercentage(result.percentiles.syntaxTree.p99, result.percentiles.total.p99);
        const contextP50Pct = safeFormatPercentage(result.percentiles.context.p50, result.percentiles.total.p50);
        const contextP99Pct = safeFormatPercentage(result.percentiles.context.p99, result.percentiles.total.p99);
        const contextWithEntitiesP50Pct = safeFormatPercentage(
            result.percentiles.contextWithEntities.p50,
            result.percentiles.total.p50,
        );
        const contextWithEntitiesP99Pct = safeFormatPercentage(
            result.percentiles.contextWithEntities.p99,
            result.percentiles.total.p99,
        );

        report.push(
            `| **${result.templateName}** | ${syntaxTreeP50Pct}% (P50) / ${syntaxTreeP99Pct}% (P99) | ${contextP50Pct}% (P50) / ${contextP99Pct}% (P99) | ${contextWithEntitiesP50Pct}% (P50) / ${contextWithEntitiesP99Pct}% (P99) |`,
        );
    });

    // Detailed results for each template (sorted by performance)
    report.push('\n---\n');
    report.push('# Detailed Results by Template\n');

    sortedResults.forEach((result) => {
        report.push(formatResults(result));
    });

    // Save the report
    try {
        writeFileSync(OUTPUT_PATH, report.join('\n'), 'utf8');
        console.log(`📄 Results saved to: ${OUTPUT_PATH}`);
    } catch (error) {
        console.error(`❌ Failed to save results to ${OUTPUT_PATH}: ${error}`);
        console.log('📄 Benchmark results (printing to console):');
        console.log(report.join('\n'));
    }
}

function main(): void {
    // Set up error handlers to ensure report is always generated
    const handleExit = (exitCode: number = 0, results: BenchmarkResult[] = []) => {
        console.log('\n📋 Generating final report...');
        if (results.length > 0) {
            generateAndSaveReport(results);
        } else {
            console.log('⚠️  No benchmark data to save');
        }
        process.exit(exitCode);
    };

    let results: BenchmarkResult[] = [];

    // Handle only unexpected errors, not user interruption
    process.on('uncaughtException', (error) => {
        console.error('\n❌ Uncaught exception:', error);
        console.log('Attempting to save partial results...');
        handleExit(1, results);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('\n❌ Unhandled rejection at:', promise, 'reason:', reason);
        console.log('Attempting to save partial results...');
        handleExit(1, results);
    });

    try {
        console.log('🚀 Starting Context Resolution Benchmark');
        console.log(`📊 Running ${formatNumber(ITERATIONS)} iterations per template`);
        console.log(`📄 Results will be saved to: ${OUTPUT_PATH}`);

        // Check if garbage collection is available - REQUIRED for benchmark to start
        if (!global.gc) {
            console.error('❌ Garbage collection not available. This is REQUIRED for benchmark accuracy.');
            console.error('   Please run with --expose-gc flag:');
            console.error('   node --expose-gc benchmark.js');
            console.error('   Exiting...');
            process.exit(1);
        } else {
            console.log('✅ Garbage collection enabled - forcing GC between iterations');
        }

        console.log('📁 Discovering template files...');

        if (TEMPLATE_PATHS.length === 0) {
            console.error(`❌ No template files found in ${TEMPLATE_PATHS}`);
            console.error(`   Current directory: ${__dirname}`);
            process.exit(1);
        }

        if (templateFiles.length === 0) {
            console.error('❌ No valid template files found');
            console.error(`   Specified paths: ${TEMPLATE_PATHS.join(', ')}`);
            process.exit(1);
        }

        LoggerFactory.initialize({
            logLevel: 'silent',
        });
        TelemetryService.initialize(undefined, {
            telemetryEnabled: false,
        });

        console.log(`📋 Found ${templateFiles.length} template files (sorted by size):`);
        templateFiles.forEach(({ name, documentType, size }) => {
            const sizeKB = (size / 1024).toFixed(2);
            console.log(`   - ${name} (${documentType}) - ${sizeKB} KB`);
        });

        loadTemplates();

        for (const { name, documentType } of templateFiles) {
            console.log(`\n📈 Benchmarking ${name} (${documentType})`);
            try {
                const result = benchmarkTemplate(name, documentType);
                if (result) {
                    results.push(result);
                    console.log(`✅ Completed ${name}`);
                    console.log(`   Total P50: ${safeFormatNumber(result.percentiles.total.p50)} μs`);
                    console.log(`   Syntax tree P50: ${safeFormatNumber(result.percentiles.syntaxTree.p50)} μs`);
                    console.log(`   Context resolution P50: ${safeFormatNumber(result.percentiles.context.p50)} μs`);
                    const contextFoundCount = result.iterations - result.contextNotFoundCount;
                    const contextValidCount = contextFoundCount - result.contextUnknownCount;
                    console.log(
                        `   Context found: ${formatNumber(contextFoundCount)}/${formatNumber(result.iterations)} (${safeFormatPercentage(contextFoundCount, result.iterations)}%)`,
                    );
                    console.log(
                        `   Context valid: ${formatNumber(contextValidCount)}/${formatNumber(result.iterations)} (${safeFormatPercentage(contextValidCount, result.iterations)}%)`,
                    );
                    console.log(
                        `   Context unknown: ${formatNumber(result.contextUnknownCount)}/${formatNumber(result.iterations)} (${safeFormatPercentage(result.contextUnknownCount, result.iterations)}%)`,
                    );
                } else {
                    console.log(`⚠️  Skipped ${name} due to errors`);
                }
            } catch (error) {
                console.error(`❌ Failed to benchmark ${name}: ${error}, moving to next file...`);
                // Continue with other templates even if one fails
            }
        }

        if (results.length === 0) {
            console.error('❌ No successful benchmark results.');
            handleExit(1, results);
        }

        console.log('\n📋 Generating summary and analysis...');

        try {
            generateAndSaveReport(results);

            console.log(`\n✨ Benchmark complete!`);
            console.log(`📊 Successfully benchmarked ${results.length}/${templateFiles.length} templates`);
            console.log(`\n📊 Quick Summary:`);
            results.forEach((result) => {
                const contextFoundCount = result.iterations - result.contextNotFoundCount;
                const contextValidCount = contextFoundCount - result.contextUnknownCount;
                const contextFoundRate = safeFormatPercentage(contextFoundCount, result.iterations);
                const contextValidRate = safeFormatPercentage(contextValidCount, result.iterations);
                const contextUnknownRate = safeFormatPercentage(result.contextUnknownCount, result.iterations);
                const contextWithEntitiesFoundCount = result.iterations - result.contextWithEntitiesNotFoundCount;
                const contextWithEntitiesFoundRate = safeFormatPercentage(
                    contextWithEntitiesFoundCount,
                    result.iterations,
                );
                console.log(
                    `   ${result.templateName} (${result.format}): P50=${safeFormatNumber(result.percentiles.total.p50)} μs, P99=${safeFormatNumber(result.percentiles.total.p99)} μs, Found=${contextFoundRate}%, Valid=${contextValidRate}%, Unknown=${contextUnknownRate}%, WithEntities=${contextWithEntitiesFoundRate}%`,
                );
            });

            process.exit(0);
        } catch (error) {
            console.error('❌ Error during report generation:', error);
            handleExit(1, results);
        }
    } catch (error) {
        console.error('❌ Fatal error in main function:', error);
        handleExit(1, results);
    }
}

main();
