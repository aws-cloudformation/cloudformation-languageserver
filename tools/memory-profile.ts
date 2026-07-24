#!/usr/bin/env node -r ts-node/register
/**
 * Memory Profiling Script for the CloudFormation Language Server
 *
 * Spawns the server via the existing LspClient, drives it through various
 * scenarios, and reports peak memory usage per scenario.
 *
 * Usage:
 *   npx ts-node tools/memory-profile.ts
 *   npx ts-node tools/memory-profile.ts --path ./cfn-lsp-server-standalone.js
 *   npx ts-node tools/memory-profile.ts --scenarios 1,2,3
 *   npx ts-node tools/memory-profile.ts --max-old-space-size 384
 */

import { join } from 'path';
import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { randomUUID as v4 } from 'crypto';
import { LspClient } from './lspClient/LspClient';
import { WaitFor } from '../tst/utils/Utils';
import { fromIni } from '@aws-sdk/credential-provider-ini';
import { IamCredentials } from '../src/auth/AwsLspAuthTypes';

// --- Configuration ---

interface ProfileConfig {
    serverPath: string;
    maxOldSpaceSize: number | undefined;
    scenarios: number[];
    settleMs: number;
    outputPath: string;
    awsProfile: string;
}

function parseArgs(): ProfileConfig {
    const args = process.argv.slice(2);
    const config: ProfileConfig = {
        serverPath: './server/cfn-lsp-server-standalone.js',
        maxOldSpaceSize: undefined,
        scenarios: [],
        settleMs: 10_000,
        outputPath: `./memory-profile-${new Date().toISOString().slice(0, 10)}.md`,
        awsProfile: 'eastern',
    };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--path':
                config.serverPath = args[++i];
                break;
            case '--max-old-space-size':
                config.maxOldSpaceSize = Number.parseInt(args[++i]);
                break;
            case '--scenarios':
                config.scenarios = args[++i].split(',').map(Number);
                break;
            case '--settle-ms':
                config.settleMs = Number.parseInt(args[++i]);
                break;
            case '--output':
                config.outputPath = args[++i];
                break;
            case '--profile':
                config.awsProfile = args[++i];
                break;
        }
    }

    return config;
}

// --- Credential Loading ---

async function loadCredentials(profile: string): Promise<IamCredentials> {
    const provider = fromIni({ profile });
    const creds = await provider();
    return {
        accessKeyId: creds.accessKeyId,
        secretAccessKey: creds.secretAccessKey,
        sessionToken: creds.sessionToken,
        profile,
        region: 'us-east-1',
    };
}

// --- Memory Measurement ---

interface MemorySnapshot {
    rssKb: number;
    timestamp: number;
}

function getProcessRss(pid: number): number | null {
    try {
        const { execSync } = require('child_process');
        if (process.platform === 'win32') {
            // tasklist outputs memory in KB with commas: "1,234,567 K"
            const output = execSync(
                `tasklist /FI "PID eq ${pid}" /FO CSV /NH`,
                { encoding: 'utf8' },
            ).trim();
            const match = output.match(/"([0-9,]+)\sK"/);
            if (!match) return null;
            return Number.parseInt(match[1].replace(/,/g, ''));
        } else {
            // macOS and Linux — ps reports RSS in KB
            const output = execSync(`ps -o rss= -p ${pid}`, { encoding: 'utf8' }).trim();
            return Number.parseInt(output);
        }
    } catch {
        return null;
    }
}

interface ScenarioResult {
    name: string;
    peakRssKb: number;
    settledRssKb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    heapLimitMb: number;
    externalMb: number;
    wasmMb: number;
    durationMs: number;
    notes: string;
}

// --- Template Generation ---

function generateTemplate(resourceCount: number, withErrors: boolean): string {
    const resources: string[] = [];
    const resourceTypes = [
        { type: 'AWS::S3::Bucket', props: (i: number, err: boolean) => err && i % 4 === 0
            ? `      BucketName: 123` // Type error: number instead of string
            : `      BucketName: !Sub "my-bucket-${i}-\${AWS::StackName}"` },
        { type: 'AWS::EC2::Instance', props: (i: number, err: boolean) => err && i % 5 === 0
            ? `      InstanceType: t2.micro` // Missing required ImageId
            : `      ImageId: ami-12345678\n      InstanceType: t2.micro` },
        { type: 'AWS::Lambda::Function', props: (i: number, err: boolean) => err && i % 3 === 0
            ? `      FunctionName: func-${i}` // Missing required Runtime and Handler
            : `      FunctionName: func-${i}\n      Runtime: nodejs18.x\n      Handler: index.handler\n      Code:\n        ZipFile: "exports.handler = async () => {};"` },
        { type: 'AWS::SQS::Queue', props: (i: number, _err: boolean) =>
            `      QueueName: queue-${i}\n      VisibilityTimeout: 30` },
        { type: 'AWS::SNS::Topic', props: (i: number, _err: boolean) =>
            `      TopicName: topic-${i}` },
    ];

    for (let i = 0; i < resourceCount; i++) {
        const rt = resourceTypes[i % resourceTypes.length];
        resources.push(`  Resource${i}:\n    Type: ${rt.type}\n    Properties:\n${rt.props(i, withErrors)}`);
    }

    return `AWSTemplateFormatVersion: "2010-09-09"\nDescription: Generated template with ${resourceCount} resources\nResources:\n${resources.join('\n')}`;
}

function generateJsonTemplate(resourceCount: number, withErrors: boolean): string {
    const resources: Record<string, any> = {};
    const types = ['AWS::S3::Bucket', 'AWS::EC2::Instance', 'AWS::Lambda::Function', 'AWS::SQS::Queue'];

    for (let i = 0; i < resourceCount; i++) {
        const type = types[i % types.length];
        const props: Record<string, any> = {};
        switch (type) {
            case 'AWS::S3::Bucket':
                props.BucketName = withErrors && i % 4 === 0 ? 123 : `bucket-${i}`;
                break;
            case 'AWS::EC2::Instance':
                props.ImageId = 'ami-12345678';
                props.InstanceType = 't2.micro';
                break;
            case 'AWS::Lambda::Function':
                props.FunctionName = `func-${i}`;
                props.Runtime = 'nodejs18.x';
                props.Handler = 'index.handler';
                props.Code = { ZipFile: 'exports.handler = async () => {};' };
                break;
            case 'AWS::SQS::Queue':
                props.QueueName = `queue-${i}`;
                break;
        }
        resources[`Resource${i}`] = { Type: type, Properties: props };
    }

    return JSON.stringify({
        AWSTemplateFormatVersion: '2010-09-09',
        Description: `Generated JSON template with ${resourceCount} resources`,
        Resources: resources,
    }, null, 2);
}

function generateIntrinsicTemplate(resourceCount: number): string {
    const resources: string[] = [];

    for (let i = 0; i < resourceCount; i++) {
        const type = i % 3;
        switch (type) {
            case 0:
                resources.push([
                    `  Bucket${i}:`,
                    `    Type: AWS::S3::Bucket`,
                    `    Properties:`,
                    `      BucketName: !Sub "\${AWS::StackName}-bucket-${i}-\${AWS::Region}"`,
                    `      Tags:`,
                    `        - Key: Environment`,
                    `          Value: !If [IsProd, production, development]`,
                    `        - Key: StackId`,
                    `          Value: !Ref AWS::StackId`,
                ].join('\n'));
                break;
            case 1:
                resources.push([
                    `  Function${i}:`,
                    `    Type: AWS::Lambda::Function`,
                    `    Condition: IsEnabled`,
                    `    Properties:`,
                    `      FunctionName: !Sub "\${AWS::StackName}-fn-${i}"`,
                    `      Runtime: !FindInMap [RuntimeMap, !Ref AWS::Region, python]`,
                    `      Handler: index.handler`,
                    `      Code:`,
                    `        ZipFile: "def handler(event, context): return {'status': 200}"`,
                    `      Environment:`,
                    `        Variables:`,
                    `          TABLE: !Ref Table${i > 0 ? i - 1 : 0}`,
                    `          REGION: !Ref AWS::Region`,
                    `          ENDPOINT: !Sub "https://\${RestApi}.execute-api.\${AWS::Region}.amazonaws.com"`,
                ].join('\n'));
                break;
            case 2:
                resources.push([
                    `  Queue${i}:`,
                    `    Type: AWS::SQS::Queue`,
                    `    Properties:`,
                    `      QueueName: !Join ["-", [!Ref AWS::StackName, "queue", "${i}"]]`,
                    `      VisibilityTimeout: !Select [0, !Split [",", !Ref TimeoutList]]`,
                    `      RedrivePolicy:`,
                    `        deadLetterTargetArn: !GetAtt DeadLetterQueue.Arn`,
                    `        maxReceiveCount: !If [IsProd, 5, 3]`,
                ].join('\n'));
                break;
        }
    }

    return [
        'AWSTemplateFormatVersion: "2010-09-09"',
        `Description: Template with ${resourceCount} resources using intrinsic functions`,
        'Parameters:',
        '  TimeoutList:',
        '    Type: String',
        '    Default: "30,60,120"',
        '  EnvType:',
        '    Type: String',
        '    Default: dev',
        '    AllowedValues: [dev, prod]',
        'Conditions:',
        '  IsProd: !Equals [!Ref EnvType, prod]',
        '  IsEnabled: !Not [!Equals [!Ref EnvType, ""]]',
        'Mappings:',
        '  RuntimeMap:',
        '    us-east-1:',
        '      python: python3.12',
        '    us-west-2:',
        '      python: python3.12',
        '    eu-west-1:',
        '      python: python3.11',
        'Resources:',
        '  DeadLetterQueue:',
        '    Type: AWS::SQS::Queue',
        '    Properties:',
        '      QueueName: !Sub "${AWS::StackName}-dlq"',
        '  RestApi:',
        '    Type: AWS::ApiGateway::RestApi',
        '    Properties:',
        '      Name: !Sub "${AWS::StackName}-api"',
        ...resources,
    ].join('\n');
}

function generateNestedTemplate(resourceCount: number): string {
    // Deep nesting with conditions, outputs referencing other resources, and cross-references
    const resources: string[] = [];
    const outputs: string[] = [];

    for (let i = 0; i < resourceCount; i++) {
        const hasDependency = i > 0;
        resources.push([
            `  Resource${i}:`,
            `    Type: AWS::CloudFormation::WaitConditionHandle`,
            i % 3 === 0 ? `    Condition: Condition${i % 5}` : '',
            hasDependency ? `    DependsOn: Resource${i - 1}` : '',
            `    Metadata:`,
            `      Comment: !Sub "Resource ${i} in \${AWS::StackName}"`,
            `      Nested:`,
            `        Level1:`,
            `          Level2:`,
            `            Level3:`,
            `              Value: !If [Condition${i % 5}, !Ref Resource${Math.max(0, i-1)}, !Ref AWS::NoValue]`,
        ].filter(Boolean).join('\n'));

        if (i % 5 === 0) {
            outputs.push([
                `  Output${i}:`,
                `    Value: !Ref Resource${i}`,
                `    Condition: Condition${i % 5}`,
                `    Export:`,
                `      Name: !Sub "\${AWS::StackName}-output-${i}"`,
            ].join('\n'));
        }
    }

    const conditions = Array.from({ length: 5 }, (_, i) =>
        `  Condition${i}: !Equals [!Select [${i}, !Split [",", !Ref Flags]], "true"]`
    ).join('\n');

    return [
        'AWSTemplateFormatVersion: "2010-09-09"',
        `Description: Deeply nested template with ${resourceCount} resources, conditions, and cross-references`,
        'Parameters:',
        '  Flags:',
        '    Type: String',
        '    Default: "true,false,true,false,true"',
        'Conditions:',
        conditions,
        'Resources:',
        ...resources,
        'Outputs:',
        ...outputs,
    ].join('\n');
}

// --- Scenarios ---

type ScenarioFn = (config: ProfileConfig) => Promise<ScenarioResult>;

async function createClient(config: ProfileConfig): Promise<LspClient> {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (config.maxOldSpaceSize) {
        env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;
    }

    const { resolve, dirname, basename } = require('path');
    const serverFullPath = resolve(config.serverPath);
    const serverDir = dirname(serverFullPath);
    const serverFile = basename(serverFullPath);

    const client = new LspClient({
        serverPath: serverFullPath,
        mode: 'stdio',
        clientConfig: { name: 'Memory Profile', version: '1.0.0' },
        awsConfig: {
            clientInfo: { clientId: `mem-profile-${v4()}`, extension: { name: 'memory-profile', version: '1.0.0' } },
            telemetryEnabled: false,
            storageDir: join(process.cwd(), 'node_modules', '.cache', 'mem-profile', v4()),
            logLevel: 'silent',
        },
        env,
        cwd: serverDir,
    });

    await client.initialize();
    await client.waitForSystemReady();
    return client;
}

function getPid(client: LspClient): number {
    // Access the server process PID (serverProcess is private but we need it)
    return (client as any).serverProcess.pid;
}

async function measureScenario(
    name: string,
    config: ProfileConfig,
    run: (client: LspClient) => Promise<string>,
): Promise<ScenarioResult> {
    const start = Date.now();
    const client = await createClient(config);
    const pid = getPid(client);

    let peakRssKb = 0;
    const pollInterval = setInterval(() => {
        const rss = getProcessRss(pid);
        if (rss && rss > peakRssKb) peakRssKb = rss;
    }, 500);

    let notes = '';
    try {
        notes = await run(client);
        // Let memory settle
        await new Promise((r) => setTimeout(r, config.settleMs));
    } finally {
        clearInterval(pollInterval);
    }

    const settledRss = getProcessRss(pid) ?? 0;
    // One final peak check
    if (settledRss > peakRssKb) peakRssKb = settledRss;

    // Get V8 heap breakdown from the server
    let heapUsedMb = 0, heapTotalMb = 0, heapLimitMb = 0, externalMb = 0, wasmMb = 0;
    try {
        const mem = await client.getMemoryStats();
        heapUsedMb = mem.heap_used_mb;
        heapTotalMb = mem.heap_total_mb;
        heapLimitMb = mem.heap_limit_mb;
        externalMb = mem.external_mb + mem.array_buffers_mb;
        wasmMb = mem.wasm_mb;
    } catch {}

    await client.shutdown();
    return { name, peakRssKb, settledRssKb: settledRss, heapUsedMb, heapTotalMb, heapLimitMb, externalMb, wasmMb, durationMs: Date.now() - start, notes };
}

// Scenario definitions

const scenarios: Record<number, { name: string; fn: ScenarioFn }> = {
    1: {
        name: 'Baseline — idle (small template)',
        fn: (config) => measureScenario('Baseline — idle', config, async (client) => {
            const template = generateTemplate(20, false);
            await client.openDocument('file:///test/small-clean.yaml', template);
            return '20 resources, no errors, waited for system ready';
        }),
    },
    2: {
        name: 'Single large file (1000 resources)',
        fn: (config) => measureScenario('Large file', config, async (client) => {
            const template = generateTemplate(1000, false);
            await client.openDocument('file:///test/large-clean.yaml', template);
            // Wait for lint to produce diagnostics
            await new Promise((r) => setTimeout(r, 30_000));
            return '1000 resources, waited 30s for lint';
        }),
    },
    3: {
        name: 'XL file (3000 resources)',
        fn: (config) => measureScenario('XL file', config, async (client) => {
            const template = generateTemplate(3000, false);
            await client.openDocument('file:///test/xlarge-clean.yaml', template);
            await new Promise((r) => setTimeout(r, 60_000));
            return '3000 resources, waited 60s for lint';
        }),
    },
    4: {
        name: 'Error-heavy lint (1000 resources, ~200 errors)',
        fn: (config) => measureScenario('Error-heavy lint', config, async (client) => {
            const template = generateTemplate(1000, true);
            const uri = 'file:///test/large-errors.yaml';
            await client.openDocument(uri, template);
            // Trigger re-lints with edits
            for (let i = 0; i < 5; i++) {
                await new Promise((r) => setTimeout(r, 10_000));
                await client.updateDocument(uri, i + 2, `${template}\n# edit ${i}`);
            }
            return '1000 resources, ~200 errors, 5 re-lints';
        }),
    },
    5: {
        name: 'Multi-file workspace (10 files)',
        fn: (config) => measureScenario('Multi-file workspace', config, async (client) => {
            for (let i = 0; i < 10; i++) {
                const template = generateTemplate(100, false);
                await client.openDocument(`file:///test/workspace/file-${i}.yaml`, template);
            }
            await new Promise((r) => setTimeout(r, 30_000));
            return '10 files x 100 resources each';
        }),
    },
    6: {
        name: 'Rapid edits (60s continuous)',
        fn: (config) => measureScenario('Rapid edits', config, async (client) => {
            const template = generateTemplate(200, true);
            const uri = 'file:///test/rapid-edits.yaml';
            await client.openDocument(uri, template);
            // Simulate typing — one edit per second for 60s
            for (let i = 0; i < 60; i++) {
                await client.updateDocument(uri, i + 2, `${template}\n# keystroke ${i}`);
                await new Promise((r) => setTimeout(r, 1000));
            }
            return '200 resources, 60 edits over 60s';
        }),
    },
    7: {
        name: 'Lint disabled',
        fn: async (config) => {
            // Must pass cfnLint.enabled=false BEFORE initialization so Pyodide never loads.
            // The server reads settings via workspace/configuration during initializedHandler.
            const env: NodeJS.ProcessEnv = { ...process.env };
            if (config.maxOldSpaceSize) env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;

            const start = Date.now();
            const client = new LspClient({
                serverPath: config.serverPath,
                mode: 'stdio',
                clientConfig: { name: 'Memory Profile', version: '1.0.0' },
                awsConfig: {
                    clientInfo: { clientId: `mem-profile-${v4()}`, extension: { name: 'memory-profile', version: '1.0.0' } },
                    telemetryEnabled: false,
                    storageDir: join(process.cwd(), 'node_modules', '.cache', 'mem-profile', v4()),
                    logLevel: 'silent',
                },
                env,
                workspaceConfig: [{ 'aws.cloudformation': { diagnostics: { cfnLint: { enabled: false } } } }],
            });

            await client.initialize();
            await client.waitForSystemReady();
            const pid = getPid(client);

            let peakRssKb = 0;
            const pollInterval = setInterval(() => {
                const rss = getProcessRss(pid);
                if (rss && rss > peakRssKb) peakRssKb = rss;
            }, 500);

            const template = generateTemplate(1000, false);
            await client.openDocument('file:///test/lint-disabled.yaml', template);
            await new Promise((r) => setTimeout(r, 10_000));

            clearInterval(pollInterval);
            const settledRss = getProcessRss(pid) ?? 0;
            if (settledRss > peakRssKb) peakRssKb = settledRss;

            let heapUsedMb = 0, heapTotalMb = 0, heapLimitMb = 0, externalMb = 0, wasmMb = 0;
            try {
                const mem = await client.getMemoryStats();
                heapUsedMb = mem.heap_used_mb;
                heapTotalMb = mem.heap_total_mb;
                heapLimitMb = mem.heap_limit_mb;
                externalMb = mem.external_mb + mem.array_buffers_mb;
                wasmMb = mem.wasm_mb;
            } catch {}

            await client.shutdown();

            return {
                name: 'Lint disabled',
                peakRssKb,
                settledRssKb: settledRss,
                heapUsedMb,
                heapTotalMb,
                heapLimitMb,
                externalMb,
                wasmMb,
                durationMs: Date.now() - start,
                notes: '1000 resources, cfnLint.enabled=false at init — Pyodide should not load',
            };
        },
    },
    10: {
        name: 'Multi-window (3 server instances)',
        fn: async (config) => {
            const start = Date.now();
            const clients: LspClient[] = [];
            const pids: number[] = [];
            let peakTotalKb = 0;

            // Spawn 3 independent server processes
            for (let i = 0; i < 3; i++) {
                const client = await createClient(config);
                clients.push(client);
                pids.push(getPid(client));
            }

            // Open different templates in each
            const sizes = [1000, 500, 200];
            for (let i = 0; i < clients.length; i++) {
                const template = generateTemplate(sizes[i], i === 1);
                await clients[i].openDocument(`file:///window${i}/template.yaml`, template);
            }

            // Wait for lint, poll total RSS
            const pollInterval = setInterval(() => {
                const total = pids.reduce((sum, pid) => sum + (getProcessRss(pid) ?? 0), 0);
                if (total > peakTotalKb) peakTotalKb = total;
            }, 500);

            await new Promise((r) => setTimeout(r, 30_000));
            clearInterval(pollInterval);

            // Capture per-process breakdown BEFORE shutdown
            const perProcess: string[] = [];
            let totalHeapUsed = 0, totalHeapTotal = 0, totalExternal = 0, totalWasm = 0;
            for (let i = 0; i < clients.length; i++) {
                const rss = getProcessRss(pids[i]) ?? 0;
                try {
                    const mem = await clients[i].getMemoryStats();
                    perProcess.push(`P${i}(${sizes[i]}res): RSS=${rss ? Math.round(rss/1024) : '?'}MB heap=${mem.heap_used_mb}MB wasm=${mem.wasm_mb}MB`);
                    totalHeapUsed += mem.heap_used_mb;
                    totalHeapTotal += mem.heap_total_mb;
                    totalExternal += mem.external_mb + mem.array_buffers_mb;
                    totalWasm += mem.wasm_mb;
                } catch {
                    perProcess.push(`P${i}(${sizes[i]}res): RSS=${rss ? Math.round(rss/1024) : '?'}MB (stats unavailable)`);
                }
            }

            const settledTotal = pids.reduce((sum, pid) => sum + (getProcessRss(pid) ?? 0), 0);

            for (const client of clients) await client.shutdown();

            return {
                name: 'Multi-window (3 instances)',
                peakRssKb: peakTotalKb,
                settledRssKb: settledTotal,
                heapUsedMb: totalHeapUsed,
                heapTotalMb: totalHeapTotal,
                heapLimitMb: 0,
                externalMb: totalExternal,
                wasmMb: totalWasm,
                durationMs: Date.now() - start,
                notes: perProcess.join(' | '),
            };
        },
    },
    8: {
        name: 'Guard rules active',
        fn: (config) => measureScenario('Guard rules active', config, async (client) => {
            await client.changeConfiguration({
                settings: { diagnostics: { cfnGuard: { enabled: true } } },
            });
            const template = generateTemplate(200, false);
            await client.openDocument('file:///test/guard-active.yaml', template);
            await new Promise((r) => setTimeout(r, 30_000));
            return '200 resources, guard enabled, waited 30s';
        }),
    },
    9: {
        name: 'Credentials active',
        fn: (config) => measureScenario('Credentials active', config, async (client) => {
            const creds = await loadCredentials(config.awsProfile);
            await client.updateCredentials(creds);
            const template = generateTemplate(200, false);
            await client.openDocument('file:///test/creds-active.yaml', template);
            await new Promise((r) => setTimeout(r, 20_000));
            return `200 resources, credentials from profile "${config.awsProfile}"`;
        }),
    },
    11: {
        name: 'Cross-IDE simulation (2 independent servers)',
        fn: async (config) => {
            const start = Date.now();
            const clients: LspClient[] = [];
            const pids: number[] = [];
            let peakTotalKb = 0;

            // Simulate VS Code + JetBrains — 2 independent server processes
            for (let i = 0; i < 2; i++) {
                const client = await createClient(config);
                clients.push(client);
                pids.push(getPid(client));
            }

            // Same workspace opened in both
            const template = generateTemplate(500, false);
            for (let i = 0; i < clients.length; i++) {
                await clients[i].openDocument('file:///shared-workspace/template.yaml', template);
            }

            const pollInterval = setInterval(() => {
                const total = pids.reduce((sum, pid) => sum + (getProcessRss(pid) ?? 0), 0);
                if (total > peakTotalKb) peakTotalKb = total;
            }, 500);

            await new Promise((r) => setTimeout(r, 30_000));
            clearInterval(pollInterval);

            // Capture per-process breakdown BEFORE shutdown
            const perProcess: string[] = [];
            let totalHeapUsed = 0, totalHeapTotal = 0, totalExternal = 0, totalWasm = 0;
            for (let i = 0; i < clients.length; i++) {
                const rss = getProcessRss(pids[i]) ?? 0;
                try {
                    const mem = await clients[i].getMemoryStats();
                    perProcess.push(`P${i}: RSS=${rss ? Math.round(rss/1024) : '?'}MB heap=${mem.heap_used_mb}MB wasm=${mem.wasm_mb}MB`);
                    totalHeapUsed += mem.heap_used_mb;
                    totalHeapTotal += mem.heap_total_mb;
                    totalExternal += mem.external_mb + mem.array_buffers_mb;
                    totalWasm += mem.wasm_mb;
                } catch {
                    perProcess.push(`P${i}: RSS=${rss ? Math.round(rss/1024) : '?'}MB (stats unavailable)`);
                }
            }

            const settledTotal = pids.reduce((sum, pid) => sum + (getProcessRss(pid) ?? 0), 0);

            for (const client of clients) await client.shutdown();

            return {
                name: 'Cross-IDE (2 instances, same workspace)',
                peakRssKb: peakTotalKb,
                settledRssKb: settledTotal,
                heapUsedMb: totalHeapUsed,
                heapTotalMb: totalHeapTotal,
                heapLimitMb: 0,
                externalMb: totalExternal,
                wasmMb: totalWasm,
                durationMs: Date.now() - start,
                notes: `2 servers, same 500-resource template. ${perProcess.join(' | ')}`,
            };
        },
    },
    12: {
        name: 'Settings toggle (enable → disable → re-enable lint)',
        fn: (config) => measureScenario('Settings toggle', config, async (client) => {
            const template = generateTemplate(500, false);
            const uri = 'file:///test/toggle.yaml';

            // Phase 1: lint enabled (default), open file
            await client.openDocument(uri, template);
            await new Promise((r) => setTimeout(r, 20_000));
            const phase1Rss = getProcessRss(getPid(client));

            // Phase 2: disable lint mid-session
            await client.changeConfiguration({
                settings: { diagnostics: { cfnLint: { enabled: false } } },
            });
            await new Promise((r) => setTimeout(r, 10_000));
            const phase2Rss = getProcessRss(getPid(client));

            // Phase 3: re-enable lint
            await client.changeConfiguration({
                settings: { diagnostics: { cfnLint: { enabled: true } } },
            });
            await client.updateDocument(uri, 2, `${template}\n# trigger relint`);
            await new Promise((r) => setTimeout(r, 20_000));
            const phase3Rss = getProcessRss(getPid(client));

            return `Enabled: ${Math.round((phase1Rss ?? 0) / 1024)}MB → Disabled: ${Math.round((phase2Rss ?? 0) / 1024)}MB → Re-enabled: ${Math.round((phase3Rss ?? 0) / 1024)}MB`;
        }),
    },
    13: {
        name: 'Telemetry enabled vs disabled',
        fn: async (config) => {
            // Run with telemetry disabled
            const resultOff = await measureScenario('Telemetry OFF', config, async (client) => {
                const template = generateTemplate(200, false);
                await client.openDocument('file:///test/telem-off.yaml', template);
                await new Promise((r) => setTimeout(r, 20_000));
                return 'telemetry disabled (default in profiling)';
            });

            // Run with telemetry enabled — need a fresh client with different config
            const start = Date.now();
            const env: NodeJS.ProcessEnv = { ...process.env };
            if (config.maxOldSpaceSize) env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;

            const client = new LspClient({
                serverPath: config.serverPath,
                mode: 'stdio',
                clientConfig: { name: 'Memory Profile', version: '1.0.0' },
                awsConfig: {
                    clientInfo: { clientId: `mem-profile-${v4()}`, extension: { name: 'memory-profile', version: '1.0.0' } },
                    telemetryEnabled: true,
                    storageDir: join(process.cwd(), 'node_modules', '.cache', 'mem-profile', v4()),
                    logLevel: 'silent',
                },
                env,
            });
            await client.initialize();
            await client.waitForSystemReady();
            const pid = getPid(client);

            let peakRssKb = 0;
            const pollInterval = setInterval(() => {
                const rss = getProcessRss(pid);
                if (rss && rss > peakRssKb) peakRssKb = rss;
            }, 500);

            const template = generateTemplate(200, false);
            await client.openDocument('file:///test/telem-on.yaml', template);
            await new Promise((r) => setTimeout(r, 20_000));

            clearInterval(pollInterval);
            const settledRss = getProcessRss(pid) ?? 0;
            await client.shutdown();

            return {
                name: 'Telemetry comparison',
                peakRssKb: Math.max(resultOff.peakRssKb, peakRssKb),
                settledRssKb: settledRss,
                heapUsedMb: 0, heapTotalMb: 0, heapLimitMb: 0, externalMb: 0, wasmMb: 0,
                durationMs: Date.now() - start,
                notes: `Telemetry OFF: peak ${Math.round(resultOff.peakRssKb / 1024)}MB, settled ${Math.round(resultOff.settledRssKb / 1024)}MB | Telemetry ON: peak ${Math.round(peakRssKb / 1024)}MB, settled ${Math.round(settledRss / 1024)}MB`,
            };
        },
    },
    14: {
        name: 'Cold start (no schema cache)',
        fn: async (config) => {
            // Use a fixed storageDir that we clear first to guarantee cold
            const storageDir = join(process.cwd(), 'node_modules', '.cache', 'mem-profile', 'schema-cache-test');
            const { rmSync, mkdirSync } = require('fs');
            try { rmSync(storageDir, { recursive: true }); } catch {}
            mkdirSync(storageDir, { recursive: true });

            const env: NodeJS.ProcessEnv = { ...process.env };
            if (config.maxOldSpaceSize) env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;

            const start = Date.now();
            const client = new LspClient({
                serverPath: config.serverPath,
                mode: 'stdio',
                clientConfig: { name: 'Memory Profile', version: '1.0.0' },
                awsConfig: {
                    clientInfo: { clientId: `mem-profile-${v4()}`, extension: { name: 'memory-profile', version: '1.0.0' } },
                    telemetryEnabled: false,
                    storageDir,
                    logLevel: 'silent',
                },
                env,
            });
            await client.initialize();
            await client.waitForSystemReady();
            const pid = getPid(client);

            let peakRssKb = 0;
            const pollInterval = setInterval(() => {
                const rss = getProcessRss(pid);
                if (rss && rss > peakRssKb) peakRssKb = rss;
            }, 500);

            const template = generateTemplate(200, false);
            await client.openDocument('file:///test/cold-start.yaml', template);
            await new Promise((r) => setTimeout(r, 30_000));

            clearInterval(pollInterval);
            const settledRss = getProcessRss(pid) ?? 0;
            if (settledRss > peakRssKb) peakRssKb = settledRss;
            await client.shutdown();

            return {
                name: 'Cold start (no cache)',
                peakRssKb,
                settledRssKb: settledRss,
                heapUsedMb: 0, heapTotalMb: 0, heapLimitMb: 0, externalMb: 0, wasmMb: 0,
                durationMs: Date.now() - start,
                notes: 'Fresh storageDir — schemas downloaded from scratch',
            };
        },
    },
    15: {
        name: 'Warm start (schemas cached)',
        fn: async (config) => {
            // Reuse the same storageDir populated by scenario 14
            const storageDir = join(process.cwd(), 'node_modules', '.cache', 'mem-profile', 'schema-cache-test');

            const env: NodeJS.ProcessEnv = { ...process.env };
            if (config.maxOldSpaceSize) env.NODE_OPTIONS = `--max-old-space-size=${config.maxOldSpaceSize}`;

            const start = Date.now();
            const client = new LspClient({
                serverPath: config.serverPath,
                mode: 'stdio',
                clientConfig: { name: 'Memory Profile', version: '1.0.0' },
                awsConfig: {
                    clientInfo: { clientId: `mem-profile-${v4()}`, extension: { name: 'memory-profile', version: '1.0.0' } },
                    telemetryEnabled: false,
                    storageDir,
                    logLevel: 'silent',
                },
                env,
            });
            await client.initialize();
            await client.waitForSystemReady();
            const pid = getPid(client);

            let peakRssKb = 0;
            const pollInterval = setInterval(() => {
                const rss = getProcessRss(pid);
                if (rss && rss > peakRssKb) peakRssKb = rss;
            }, 500);

            const template = generateTemplate(200, false);
            await client.openDocument('file:///test/warm-start.yaml', template);
            await new Promise((r) => setTimeout(r, 20_000));

            clearInterval(pollInterval);
            const settledRss = getProcessRss(pid) ?? 0;
            if (settledRss > peakRssKb) peakRssKb = settledRss;
            await client.shutdown();

            return {
                name: 'Warm start (cached)',
                peakRssKb,
                settledRssKb: settledRss,
                heapUsedMb: 0, heapTotalMb: 0, heapLimitMb: 0, externalMb: 0, wasmMb: 0,
                durationMs: Date.now() - start,
                notes: 'Reused storageDir from scenario 14 — schemas already cached. Run 14 before 15.',
            };
        },
    },
    16: {
        name: 'Hover + completions under load',
        fn: (config) => measureScenario('Hover + completions', config, async (client) => {
            const template = generateTemplate(200, false);
            const uri = 'file:///test/hover-completions.yaml';
            await client.openDocument(uri, template);
            await new Promise((r) => setTimeout(r, 20_000)); // wait for lint + schema

            // Fire hover and completion requests across the document
            for (let line = 5; line < 100; line += 10) {
                try {
                    await client.hover(uri, line, 4);
                    await client.completion(uri, line, 10);
                } catch {
                    // Some positions won't have results — that's fine
                }
            }
            // Do another round after a pause
            await new Promise((r) => setTimeout(r, 5_000));
            for (let line = 100; line < 200; line += 10) {
                try {
                    await client.hover(uri, line, 4);
                    await client.completion(uri, line, 10);
                } catch {}
            }
            return '200 resources, ~20 hover + ~20 completion requests';
        }),
    },
    17: {
        name: 'Online components (credentials + live API)',
        fn: (config) => measureScenario('Online components', config, async (client) => {
            // Load real credentials so the server can make live API calls
            const creds = await loadCredentials(config.awsProfile);
            await client.updateCredentials(creds);

            // Open a template with resource types that trigger online features
            // (schema registry lookups, resource type completions from live API)
            const template = [
                'AWSTemplateFormatVersion: "2010-09-09"',
                'Resources:',
                '  MyBucket:',
                '    Type: AWS::S3::Bucket',
                '    Properties:',
                '      BucketName: test-bucket',
                '  MyFunction:',
                '    Type: AWS::Lambda::Function',
                '    Properties:',
                '      FunctionName: test-func',
                '      Runtime: nodejs18.x',
                '      Handler: index.handler',
                '      Code:',
                '        ZipFile: "exports.handler = async () => {};"',
                '  MyStack:',
                '    Type: AWS::CloudFormation::Stack',
                '    Properties:',
                '      TemplateURL: https://s3.amazonaws.com/bucket/template.yaml',
            ].join('\n');

            const uri = 'file:///test/online-components.yaml';
            await client.openDocument(uri, template);

            // Wait for online features to activate (schema fetches, etc.)
            await new Promise((r) => setTimeout(r, 30_000));

            // Trigger hovers/completions that may use live data
            for (let line = 2; line < 18; line += 3) {
                try {
                    await client.hover(uri, line, 10);
                    await client.completion(uri, line, 15);
                } catch {}
            }

            await new Promise((r) => setTimeout(r, 10_000));
            return `Template with live resource types, credentials from "${config.awsProfile}", hovers+completions triggered`;
        }),
    },
    18: {
        name: 'Server restart cycle (5 restarts)',
        fn: async (config) => {
            // Spawn and kill the server 5 times, verify no orphan processes accumulate
            const start = Date.now();
            const pidsAfterKill: number[] = [];
            let peakRssKb = 0;

            for (let i = 0; i < 5; i++) {
                const client = await createClient(config);
                const pid = getPid(client);
                const rss = getProcessRss(pid);
                if (rss && rss > peakRssKb) peakRssKb = rss;

                const template = generateTemplate(100, false);
                await client.openDocument(`file:///test/restart-${i}.yaml`, template);
                await new Promise((r) => setTimeout(r, 5_000));

                const rssAfterLint = getProcessRss(pid);
                if (rssAfterLint && rssAfterLint > peakRssKb) peakRssKb = rssAfterLint;

                await client.shutdown();
                // Verify process is actually gone after a short wait
                await new Promise((r) => setTimeout(r, 1_000));
                const rssAfterShutdown = getProcessRss(pid);
                if (rssAfterShutdown && rssAfterShutdown > 0) {
                    pidsAfterKill.push(pid);
                }
            }

            return {
                name: 'Server restart cycle (5x)',
                peakRssKb,
                settledRssKb: 0,
                heapUsedMb: 0, heapTotalMb: 0, heapLimitMb: 0, externalMb: 0, wasmMb: 0,
                durationMs: Date.now() - start,
                notes: pidsAfterKill.length === 0
                    ? '5 restarts, all processes exited cleanly — no orphans'
                    : `WARNING: ${pidsAfterKill.length} orphan process(es) survived shutdown: PIDs ${pidsAfterKill.join(', ')}`,
            };
        },
    },
    19: {
        name: 'JSON template format (1000 resources)',
        fn: (config) => measureScenario('JSON template', config, async (client) => {
            const template = generateJsonTemplate(1000, false);
            await client.openDocument('file:///test/large-clean.json', template);
            await new Promise((r) => setTimeout(r, 30_000));
            return '1000 resources in JSON format, waited 30s for lint';
        }),
    },
    20: {
        name: 'Intrinsic functions (heavy Fn::Sub/Ref/If usage)',
        fn: (config) => measureScenario('Intrinsic functions', config, async (client) => {
            const template = generateIntrinsicTemplate(200);
            await client.openDocument('file:///test/intrinsics.yaml', template);
            await new Promise((r) => setTimeout(r, 30_000));
            return '200 resources with heavy intrinsic function usage';
        }),
    },
    21: {
        name: 'Deeply nested template (conditions + mappings)',
        fn: (config) => measureScenario('Deeply nested', config, async (client) => {
            const template = generateNestedTemplate(100);
            await client.openDocument('file:///test/nested.yaml', template);
            await new Promise((r) => setTimeout(r, 30_000));
            return '100 resources with deep nesting, conditions, and mappings';
        }),
    },
};

// --- Main ---

async function main() {
    const config = parseArgs();
    const scenarioIds = config.scenarios.length > 0 ? config.scenarios : Object.keys(scenarios).map(Number);

    console.log('CloudFormation LSP Memory Profiling');
    console.log(`Server: ${config.serverPath}`);
    console.log(`NODE_OPTIONS: --max-old-space-size=${config.maxOldSpaceSize ?? 'default'}`);
    console.log(`Scenarios: ${scenarioIds.join(', ')}`);
    console.log('');

    const results: ScenarioResult[] = [];

    for (const id of scenarioIds) {
        const scenario = scenarios[id];
        if (!scenario) {
            console.log(`Skipping unknown scenario ${id}`);
            continue;
        }
        console.log(`--- Scenario ${id}: ${scenario.name} ---`);
        try {
            const result = await scenario.fn(config);
            results.push(result);
            console.log(`  Peak RSS: ${Math.round(result.peakRssKb / 1024)} MB`);
            console.log(`  Settled RSS: ${Math.round(result.settledRssKb / 1024)} MB`);
            console.log(`  V8 Heap: ${result.heapUsedMb}/${result.heapTotalMb} MB (limit: ${result.heapLimitMb} MB)`);
            console.log(`  External: ${result.externalMb} MB | Pyodide WASM: ${result.wasmMb} MB`);
            console.log(`  Duration: ${Math.round(result.durationMs / 1000)}s`);
            console.log(`  Notes: ${result.notes}`);
            console.log('');
        } catch (error) {
            console.error(`  FAILED: ${error}`);
            results.push({ name: scenario.name, peakRssKb: 0, settledRssKb: 0, heapUsedMb: 0, heapTotalMb: 0, heapLimitMb: 0, externalMb: 0, wasmMb: 0, durationMs: 0, notes: `ERROR: ${error}` });
        }
    }

    // Generate report
    const report = generateReport(config, results);
    writeFileSync(config.outputPath, report);
    console.log(`\nReport written to: ${config.outputPath}`);
}

function generateReport(config: ProfileConfig, results: ScenarioResult[]): string {
    const lines = [
        '# Memory Profiling Results',
        '',
        `- **Date:** ${new Date().toISOString()}`,
        `- **Platform:** ${process.platform} ${process.arch}`,
        `- **Node:** ${process.version}`,
        `- **Server:** ${config.serverPath}`,
        `- **max-old-space-size:** ${config.maxOldSpaceSize ?? 'not set (V8 default)'}`,
        `- **AWS Profile:** ${config.awsProfile}`,
        '',
        '## Results',
        '',
        '| Scenario | Total Memory (MB) | Settled (MB) | JS Heap (MB) | Buffers (MB) | Pyodide WASM (MB) | Other (MB) | Duration (s) | Notes |',
        '|----------|-------------------|--------------|-------------|-------------|-------------------|-----------|--------------|-------|',
    ];

    for (const r of results) {
        const totalSettled = Math.round(r.settledRssKb / 1024);
        const other = totalSettled > 0 ? Math.max(0, totalSettled - r.heapTotalMb - r.externalMb - r.wasmMb) : 0;
        lines.push(
            `| ${r.name} | ${Math.round(r.peakRssKb / 1024)} | ${totalSettled} | ${r.heapUsedMb} | ${r.externalMb} | ${r.wasmMb} | ${other} | ${Math.round(r.durationMs / 1000)} | ${r.notes} |`,
        );
    }

    const peakOverall = Math.max(...results.map((r) => r.peakRssKb));
    const maxHeapUsed = Math.max(...results.map((r) => r.heapUsedMb));
    lines.push(
        '',
        '## Summary',
        '',
        `**Overall peak RSS:** ${Math.round(peakOverall / 1024)} MB`,
        `**Max V8 heap used:** ${maxHeapUsed} MB`,
        `**Recommended --max-old-space-size:** ${Math.ceil(maxHeapUsed * 2)} MB (2x headroom over observed peak)`,
    );

    return lines.join('\n');
}

void main();
