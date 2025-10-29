#!/usr/bin/env node
import { v4 } from 'uuid';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';

const id = v4();
LoggerFactory.initialize({ logLevel: 'silent' });
TelemetryService.initialize(undefined, {
    telemetryEnabled: true,
    clientInfo: {
        extension: {
            name: 'Test Telemetry Generator',
            version: '0.0.0',
        },
        clientId: id,
    },
});

import { readdirSync } from 'fs';
import { join, extname, resolve } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generatePositions, TestPosition, discoverTemplateFiles } from './utils';
import { SyntaxTreeManager } from '../src/context/syntaxtree/SyntaxTreeManager';
import { ContextManager } from '../src/context/ContextManager';
import { DocumentManager } from '../src/document/DocumentManager';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    createMockComponents,
    createMockSchemaRetriever,
    createMockResourceStateManager,
} from '../tst/utils/MockServerComponents';
import { combinedSchemas } from '../tst/utils/SchemaUtils';
import { CompletionRouter, createCompletionProviders } from '../src/autocomplete/CompletionRouter';
import { HoverRouter } from '../src/hover/HoverRouter';
import { MultiDataStoreFactoryProvider } from '../src/datastore/DataStore';
import { SchemaStore } from '../src/schema/SchemaStore';
import { GetSchemaTaskManager } from '../src/schema/GetSchemaTaskManager';
import { getRemotePublicSchemas } from '../src/schema/GetSchemaTask';

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

const TEMPLATE_PATHS = argv.templates;
const INTERVAL_MS = argv.interval;

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const textDocuments = new TextDocuments(TextDocument);

async function processTemplate(uri: string, content: string, pos: TestPosition, components: any) {
    const position = { line: pos.line, character: pos.character };
    const params = { textDocument: { uri }, position };

    const textDocument = TextDocument.create(uri, '', 1, content);
    (textDocuments as any)._syncedDocuments.set(uri, textDocument);

    components.syntaxTreeManager.add(uri, content);
    components.contextManager.getContext(params);
    components.contextManager.getContextAndRelatedEntities(params);
    components.hoverRouter.getHoverDoc(params);
    components.completionRouter.getCompletions({ ...params, context: { triggerKind: 2 } });
    components.definitionProvider.getDefinitions(params);
    components.inlineCompletionRouter.getInlineCompletions({ ...params, context: { triggerKind: 0 } });

    await sleep(INTERVAL_MS);
}

function pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function main() {
    console.log('🚀 Starting Continuous Telemetry Metrics Generator');
    console.log(`⏱️  Interval: ${INTERVAL_MS}ms between iterations`);
    console.log('Press Ctrl+C to stop\n');

    if (TEMPLATE_PATHS.length === 0) {
        console.error(`❌ No template files found in ${TEMPLATE_PATHS}`);
        console.error(`   Current directory: ${__dirname}`);
        process.exit(1);
    }

    console.log(`Using id ${id}`);

    const syntaxTreeManager = new SyntaxTreeManager();
    const documentManager = new DocumentManager(textDocuments);
    const contextManager = new ContextManager(syntaxTreeManager);
    const schemaRetriever = createMockSchemaRetriever(combinedSchemas());

    const dataStoreFactory = new MultiDataStoreFactoryProvider();
    const schemaStore = new SchemaStore(dataStoreFactory);
    const schemaTaskManager = new GetSchemaTaskManager(schemaStore, getRemotePublicSchemas, () => {
        return Promise.resolve([]);
    });

    const mockTestComponents = createMockComponents({
        schemaRetriever,
        syntaxTreeManager,
        documentManager,
        dataStoreFactory,
        schemaStore,
        schemaTaskManager,
        resourceStateManager: createMockResourceStateManager(),
    });

    const { core, external, providers } = createMockComponents(mockTestComponents);
    const completionProviders = createCompletionProviders(core, external, providers);
    const completionRouter = new CompletionRouter(contextManager, completionProviders, documentManager);
    const hoverRouter = new HoverRouter(contextManager, schemaRetriever);

    const components = {
        syntaxTreeManager,
        contextManager,
        hoverRouter,
        completionRouter,
        definitionProvider: providers.definitionProvider,
        inlineCompletionRouter: providers.inlineCompletionRouter,
    };

    const templates = discoverTemplateFiles(TEMPLATE_PATHS);
    console.log(`📋 Found ${templates.length} template files`);

    const positions = new Map<string, TestPosition[]>();
    for (const template of templates) {
        positions.set(template.path, generatePositions(template.content, 10_000));
    }

    let iteration = 0;
    setInterval(() => {
        const template = pickRandom(templates);
        const pos = pickRandom(positions.get(template.path)!);
        processTemplate(template.path, template.content, pos, components).catch(console.error);

        iteration++;
        if (iteration % 100 === 0) {
            console.log(`📊 Completed ${iteration} iterations`);
        }
    }, INTERVAL_MS);

    process.on('SIGINT', () => {
        console.log('\n\n🛑 Shutting down...');
        TelemetryService.instance.close().catch(console.error);
        process.exit(0);
    });
}

main();
