#!/usr/bin/env node

import { ContextManager } from '../src/context/ContextManager';
import { SyntaxTreeManager } from '../src/context/syntaxtree/SyntaxTreeManager';
import { TelemetryService } from '../src/telemetry/TelemetryService';
import { readdirSync } from 'fs';
import { join, extname, resolve } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generatePositions, TestPosition, discoverTemplateFiles } from './utils';
import { v4 } from 'uuid';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';

const argv = yargs(hideBin(process.argv))
    .option('templates', {
        alias: 't',
        type: 'array',
        description: 'List of template file paths (JSON/YAML)',
        default: [],
        coerce: (values: string[]) => {
            if (values.length === 0) {
                const currentDir = join(__dirname, '.');
                const files = readdirSync(currentDir);
                return files
                    .filter((file) => {
                        const ext = extname(file).toLowerCase();
                        return ext === '.json' || ext === '.yaml' || ext === '.yml';
                    })
                    .map((file) => resolve(currentDir, file));
            }
            return values.map((path) => resolve(path));
        },
    })
    .option('interval', {
        alias: 'i',
        type: 'number',
        default: 100,
        description: 'Interval between iterations in milliseconds',
        coerce: (value: number) => {
            if (value <= 10) {
                throw new Error('Interval must be > 10ms');
            }
            return value;
        },
    })
    .help()
    .parseSync();

const TEMPLATE_PATHS = argv.templates as string[];
const INTERVAL_MS = argv.interval;

type MetricStats = {
    count: number;
    sum: number;
    min: number;
    max: number;
};

const stats = {
    syntaxTree: new Map<string, MetricStats>(),
    context: new Map<string, MetricStats>(),
};

function updateStats(map: Map<string, MetricStats>, key: string, value: number): void {
    let stat = map.get(key);
    if (!stat) {
        stat = { count: 0, sum: 0, min: Infinity, max: -Infinity };
        map.set(key, stat);
    }
    stat.count++;
    stat.sum += value;
    stat.min = Math.min(stat.min, value);
    stat.max = Math.max(stat.max, value);
}

function printStats(): void {
    console.log('\n📊 Local Statistics Summary:');
    console.log('\n=== Syntax Tree Creation ===');
    for (const [key, stat] of stats.syntaxTree.entries()) {
        const avg = stat.sum / stat.count;
        console.log(`${key}:`);
        console.log(`  Count: ${stat.count}`);
        console.log(`  Min: ${stat.min.toFixed(2)} ms`);
        console.log(`  Max: ${stat.max.toFixed(2)} ms`);
        console.log(`  Avg: ${avg.toFixed(2)} ms`);
    }

    console.log('\n=== Context Resolution ===');
    for (const [key, stat] of stats.context.entries()) {
        const avg = stat.sum / stat.count;
        console.log(`${key}:`);
        console.log(`  Count: ${stat.count}`);
        console.log(`  Min: ${stat.min.toFixed(2)} ms`);
        console.log(`  Max: ${stat.max.toFixed(2)} ms`);
        console.log(`  Avg: ${avg.toFixed(2)} ms`);
    }
    console.log('');
}

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processTemplate(
    uri: string,
    content: string,
    pos: TestPosition,
    syntaxTreeManager: SyntaxTreeManager,
    contextManager: ContextManager,
) {
    const syntaxStart = performance.now();
    syntaxTreeManager.add(uri, content);
    const syntaxDuration = performance.now() - syntaxStart;
    updateStats(stats.syntaxTree, uri, syntaxDuration);

    const contextStart = performance.now();
    contextManager.getContext({
        textDocument: { uri },
        position: { line: pos.line, character: pos.character },
    });
    const contextDuration = performance.now() - contextStart;
    updateStats(stats.context, uri, contextDuration);
    await sleep(INTERVAL_MS);
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
    console.log('🚀 Starting Continuous Telemetry Metrics Generator');
    console.log(`⏱️  Interval: ${INTERVAL_MS}ms between iterations`);
    console.log('Press Ctrl+C to stop\n');

    if (TEMPLATE_PATHS.length === 0) {
        console.error(`❌ No template files found in ${TEMPLATE_PATHS}`);
        console.error(`   Current directory: ${__dirname}`);
        process.exit(1);
    }

    const id = v4();

    console.log(`Using id ${id}`);
    LoggerFactory.initialize({
        logLevel: 'silent',
    });
    TelemetryService.initialize(undefined, {
        telemetryEnabled: true,
        clientId: id,
    });

    const templates = discoverTemplateFiles(TEMPLATE_PATHS);
    console.log(`📋 Found ${templates.length} template files`);

    const syntaxTreeManager = new SyntaxTreeManager();
    const contextManager = new ContextManager(syntaxTreeManager);

    const positions = new Map<string, TestPosition[]>();
    for (const template of templates) {
        positions.set(template.path, generatePositions(template.content, 10_000));
    }

    let iteration = 0;
    setInterval(async () => {
        const template = pickRandom(templates);
        const pos = pickRandom(positions.get(template.path)!);
        await processTemplate(template.path, template.content, pos, syntaxTreeManager, contextManager);

        iteration++;
        if (iteration % 100 === 0) {
            console.log(`📊 Completed ${iteration} iterations`);
        }
    }, INTERVAL_MS);

    process.on('SIGINT', async () => {
        console.log('\n\n🛑 Shutting down...');
        printStats();
        await TelemetryService.instance.close();
        process.exit(0);
    });
}

main();
