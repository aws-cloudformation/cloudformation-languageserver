#!/usr/bin/env node
import { v4 } from 'uuid';
import { LoggerFactory } from '../src/telemetry/LoggerFactory';
import { TelemetryService } from '../src/telemetry/TelemetryService';

const id = v4();
const initParams: ExtendedInitializeParams = {
    capabilities: {},
    processId: 1,
    rootUri: 'SomeUri',
    initializationOptions: {
        aws: {
            telemetryEnabled: true,
            clientInfo: {
                extension: {
                    name: 'Test Telemetry Generator',
                    version: '0.0.0',
                },
                clientId: id,
            },
            logLevel: 'warn',
        },
    },
};

LoggerFactory.initialize(initParams?.initializationOptions?.aws);
TelemetryService.initialize(
    initParams?.initializationOptions?.aws?.clientInfo?.extension,
    initParams?.initializationOptions?.aws,
);

import { readdirSync } from 'fs';
import { join, extname, resolve } from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { generatePositions, TestPosition, discoverTemplateFiles } from './utils';
import { DocumentManager } from '../src/document/DocumentManager';
import { TextDocuments } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
    createMockLspDiagnostics,
    createMockLspWorkspace,
    createMockLspDocuments,
    createMockLspCommunication,
    createMockAuthHandlers,
} from '../tst/utils/MockServerComponents';
import { getTestPrivateSchemas } from '../tst/utils/SchemaUtils';
import { MemoryDataStoreFactoryProvider } from '../src/datastore/DataStore';
import { SchemaStore } from '../src/schema/SchemaStore';
import { GetSchemaTaskManager } from '../src/schema/GetSchemaTaskManager';
import { getRemotePublicSchemas } from '../src/schema/GetSchemaTask';
import { completionHandler } from '../src/handlers/CompletionHandler';
import { hoverHandler } from '../src/handlers/HoverHandler';
import { definitionHandler } from '../src/handlers/DefinitionHandler';
import { documentSymbolHandler } from '../src/handlers/DocumentSymbolHandler';
import { codeLensHandler } from '../src/handlers/CodeLensHandler';
import { LspComponents } from '../src/protocol/LspComponents';
import { CfnInfraCore } from '../src/server/CfnInfraCore';
import { CfnExternal } from '../src/server/CfnExternal';
import { CfnLspProviders } from '../src/server/CfnLspProviders';
import { ServerComponents } from '../src/server/ServerComponents';
import { CancellationToken } from 'vscode-jsonrpc/lib/common/cancellation';
import { stubInterface } from 'ts-sinon';
import { LspHandlers } from '../src/protocol/LspHandlers';
import { LspStackHandlers } from '../src/protocol/LspStackHandlers';
import { LspResourceHandlers } from '../src/protocol/LspResourceHandlers';
import { LspRelatedResourcesHandlers } from '../src/protocol/LspRelatedResourcesHandlers';
import { LspS3Handlers } from '../src/protocol/LspS3Handlers';
import { ExtendedInitializeParams } from '../src/server/InitParams';
import { FeatureFlagProvider } from '../src/featureFlag/FeatureFlagProvider';
import { RelationshipSchemaService } from '../src/services/RelationshipSchemaService';
import { LspEnvironmentHandlers } from '../src/protocol/LspEnvironmentHandlers';

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
        default: 1000,
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

const textDocuments = new TextDocuments(TextDocument);

function processTemplate(uri: string, content: string, pos: TestPosition, components: ServerComponents) {
    const position = { line: pos.line, character: pos.character };
    const params = { textDocument: { uri }, position };

    try {
        components.syntaxTreeManager.add(uri, content);
        components.contextManager.getContext(params);
        components.contextManager.getContextAndRelatedEntities(params);
        components.fileContextManager.getFileContext(params.textDocument.uri);

        components.hoverRouter.getHoverDoc(params);
        components.completionRouter.getCompletions({ ...params, context: { triggerKind: 2 } }).catch(console.error);
        components.definitionProvider.getDefinitions(params);
        components.documentSymbolRouter.getDocumentSymbols(params);
        components.codeLensProvider.getCodeLenses(params.textDocument.uri);

        hoverHandler(components)(params, CancellationToken.None, undefined as any, undefined as any);

        completionHandler(components)(
            { ...params, context: { triggerKind: 2 } },
            CancellationToken.None,
            undefined as any,
            undefined as any,
        );

        definitionHandler(components)(
            { textDocument: { uri }, position },
            CancellationToken.None,
            undefined as any,
            undefined as any,
        );

        documentSymbolHandler(components)(
            { textDocument: { uri } },
            CancellationToken.None,
            undefined as any,
            undefined as any,
        );

        codeLensHandler(components)(
            { textDocument: { uri } },
            CancellationToken.None,
            undefined as any,
            undefined as any,
        );
    } catch (err) {
        console.error(err, 'Something went wrong');
    }
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
    const lsp = new LspComponents(
        createMockLspDiagnostics(),
        createMockLspWorkspace(),
        createMockLspDocuments(),
        createMockLspCommunication(),
        stubInterface<LspHandlers>(),
        createMockAuthHandlers(),
        stubInterface<LspStackHandlers>(),
        stubInterface<LspEnvironmentHandlers>(),
        stubInterface<LspResourceHandlers>(),
        stubInterface<LspRelatedResourcesHandlers>(),
        stubInterface<LspS3Handlers>(),
    );

    const dataStoreFactory = new MemoryDataStoreFactoryProvider();
    const core = new CfnInfraCore(lsp, initParams, {
        dataStoreFactory,
        documentManager: new DocumentManager(textDocuments),
    });

    const schemaStore = new SchemaStore(dataStoreFactory);
    const external = new CfnExternal(lsp, core, {
        schemaStore,
        schemaTaskManager: new GetSchemaTaskManager(schemaStore, getRemotePublicSchemas, () =>
            Promise.resolve(getTestPrivateSchemas()),
        ),
        featureFlags: new FeatureFlagProvider(join(__dirname, '..', 'assets', 'featureFlag', 'alpha.json')),
    });

    const providers = new CfnLspProviders(core, external, {
        relationshipSchemaService: new RelationshipSchemaService(
            join(__dirname, '..', 'assets', 'relationship_schemas.json'),
        ),
    });
    const components: ServerComponents = {
        ...core,
        ...external,
        ...providers,
    };

    const templates = discoverTemplateFiles(TEMPLATE_PATHS);
    console.log(`📋 Found ${templates.length} template files`);

    const positions = new Map<string, TestPosition[]>();
    for (const template of templates) {
        positions.set(template.path, generatePositions(template.content, 10_000));
        const textDocument = TextDocument.create(template.path, '', 1, template.content);
        (textDocuments as any)._syncedDocuments.set(template.path, textDocument);
    }

    let iteration = 0;
    const interval = setInterval(() => {
        const template = pickRandom(templates);
        const pos = pickRandom(positions.get(template.path)!);
        processTemplate(template.path, template.content, pos, components);

        iteration++;
        if (iteration % 50 === 0) {
            console.log(`📊 Completed ${iteration} iterations`);
        }
    }, INTERVAL_MS);

    process.on('SIGINT', () => {
        clearInterval(interval);
        console.log('\n\n🛑 Shutting down...');
        TelemetryService.instance.close().catch(console.error);
        process.exit(0);
    });
}

main();
