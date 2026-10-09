import { EventEmitter } from 'events';
import path from 'path';
import { Worker } from 'worker_threads';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { CfnValidateEngine } from '../../../../src/services/cfnValidate/CfnValidateEngine';
import { WorkerExitError, WorkerFailureError, WorkerShutdownError } from '../../../../src/utils/errors/ErrorClasses';
import { CfnValidateResponse } from '../../../../src/services/cfnValidate/cfn-validate-worker';

// Path deliberately does not exist on disk: the engine must read the content it is given, not the file system
const UNSAVED_TEMPLATE_PATH = '/does/not/exist/template.yaml';
const WARN = { severityLevel: 'WARN' } as const;

const WORKER_SOURCE = path.join(__dirname, '../../../../src/services/cfnValidate/cfn-validate-worker.ts');

const TEMPLATE_WITH_UNKNOWN_PROPERTY = [
    'AWSTemplateFormatVersion: "2010-09-09"',
    'Resources:',
    '  Bucket:',
    '    Type: AWS::S3::Bucket',
    '    Properties:',
    '      NotARealProperty: value',
    '',
].join('\n');

describe('CfnValidateEngine', () => {
    describe('with the real worker', () => {
        let engine: CfnValidateEngine;

        beforeEach(() => {
            engine = new CfnValidateEngine(() => new Worker(WORKER_SOURCE, { execArgv: ['--import', 'tsx'] }));
        });

        afterEach(async () => {
            await engine.close();
        });

        test('validates in-memory content off the main thread and reports 1-based locations', async () => {
            await engine.initialize();

            const report = await engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, WARN);

            expect(engine.version()).toMatch(/^\d+\.\d+\.\d+/);
            expect(report.status).toBe('OK');
            expect(report.filePath).toBe(UNSAVED_TEMPLATE_PATH);
            const unknownProperty = report.diagnostics.find((diagnostic) => diagnostic.ruleId === 'F3002');
            expect(unknownProperty).toMatchObject({ startLine: 6, startColumn: 7, entity: { logicalId: 'Bucket' } });
        });

        test('returns a parse diagnostic instead of failing for invalid syntax, and drops findings below the level', async () => {
            await engine.initialize();

            const broken = await engine.validate('Resources:\n  Broken\n  Type: 1\n', UNSAVED_TEMPLATE_PATH, WARN);
            const warnAndAbove = await engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, WARN);
            const infoAndAbove = await engine.validate(TEMPLATE_WITH_UNKNOWN_PROPERTY, UNSAVED_TEMPLATE_PATH, {
                severityLevel: 'INFO',
            });

            expect(broken.status).toBe('ERROR');
            expect(broken.diagnostics.map((diagnostic) => diagnostic.ruleId)).toEqual(['F1101']);
            expect(warnAndAbove.diagnostics.some((diagnostic) => diagnostic.severity === 'INFO')).toBe(false);
            expect(infoAndAbove.diagnostics.some((diagnostic) => diagnostic.severity === 'INFO')).toBe(true);
        });

        test('rejects validation before initialization', async () => {
            await expect(engine.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, WARN)).rejects.toThrow(
                'CfnValidateEngine is not initialized',
            );
        });
    });

    describe('worker failures', () => {
        // eslint-disable-next-line unicorn/prefer-event-target
        class FakeWorker extends EventEmitter {
            readonly postMessage = vi.fn();
            readonly terminate = vi.fn(() => Promise.resolve(1));

            respond(message: CfnValidateResponse): void {
                this.emit('message', message);
            }
        }

        let worker: FakeWorker;
        const engine = () => new CfnValidateEngine(() => (worker = new FakeWorker()) as unknown as Worker);

        async function readyEngine(): Promise<CfnValidateEngine> {
            const ready = engine();
            const initialized = ready.initialize();
            worker.respond({ ready: '1.2.3' });
            await initialized;
            return ready;
        }

        afterEach(() => {
            vi.useRealTimers();
        });

        test('resolves with the report for the matching request id', async () => {
            const ready = await readyEngine();

            const validation = ready.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, WARN);
            const request = worker.postMessage.mock.calls[0][0];
            worker.respond({ id: request.id + 1, report: { status: 'STALE' } as never });
            worker.respond({ id: request.id, report: { status: 'OK' } as never });

            expect(request).toMatchObject({
                content: 'Resources: {}',
                path: UNSAVED_TEMPLATE_PATH,
                severityLevel: 'WARN',
            });
            await expect(validation).resolves.toEqual({ status: 'OK' });
            expect(ready.version()).toBe('1.2.3');
            expect(ready.isFailed()).toBe(false);
        });

        test('an engine error terminates the worker and fails the engine for the session', async () => {
            const ready = await readyEngine();

            const validation = ready.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, WARN);
            const { id } = worker.postMessage.mock.calls[0][0];
            worker.respond({
                id,
                error: { name: 'RuntimeError', message: 'unreachable', stack: 'RuntimeError: unreachable' },
            });

            await expect(validation).rejects.toMatchObject({ name: 'RuntimeError', message: 'unreachable' });
            expect(worker.terminate).toHaveBeenCalledOnce();
            expect(ready.isInitialized()).toBe(false);
            expect(ready.isFailed()).toBe(true);
        });

        test('a worker crash rejects the running validation instead of surfacing anywhere else', async () => {
            const ready = await readyEngine();

            const validation = ready.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, WARN);
            worker.emit('error', new Error('ERR_WORKER_OUT_OF_MEMORY'));
            worker.emit('exit', 1);

            await expect(validation).rejects.toBeInstanceOf(WorkerFailureError);
            expect(ready.isFailed()).toBe(true);
        });

        test('a worker exit during initialization rejects it', async () => {
            const initialized = engine().initialize();
            worker.emit('exit', 1);

            await expect(initialized).rejects.toBeInstanceOf(WorkerExitError);
        });

        test('a validation that exceeds the timeout terminates the worker', async () => {
            vi.useFakeTimers();
            const ready = await readyEngine();

            const validation = ready.validate('Resources: {}', UNSAVED_TEMPLATE_PATH, WARN);
            vi.advanceTimersByTime(30_000);

            await expect(validation).rejects.toThrow('did not finish within');
            expect(worker.terminate).toHaveBeenCalledOnce();
            expect(ready.isFailed()).toBe(true);
        });

        test('rejects a second validation while one is running', async () => {
            const ready = await readyEngine();
            const first = ready.validate('a', UNSAVED_TEMPLATE_PATH, WARN);

            await expect(ready.validate('b', UNSAVED_TEMPLATE_PATH, WARN)).rejects.toThrow('already validating');

            await ready.close();
            await expect(first).rejects.toBeInstanceOf(WorkerShutdownError);
        });

        test('close terminates the worker without counting as a failure', async () => {
            const ready = await readyEngine();

            await ready.close();
            worker.emit('exit', 1);

            expect(worker.terminate).toHaveBeenCalledOnce();
            expect(ready.isInitialized()).toBe(false);
            expect(ready.isFailed()).toBe(false);
        });
    });
});
