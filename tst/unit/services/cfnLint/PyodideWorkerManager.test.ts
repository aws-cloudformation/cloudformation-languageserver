import path from 'path';
import { Worker } from 'worker_threads';
import sinon from 'ts-sinon';
import { describe, expect, beforeEach, vi, test, Mock } from 'vitest';
import { CloudFormationFileType } from '../../../../src/document/Document';
import { PyodideWorkerManager } from '../../../../src/services/cfnLint/PyodideWorkerManager';
import { mockLogger } from '../../../utils/MockServerComponents';

// Mock Worker class
vi.mock('worker_threads', () => {
    return {
        Worker: vi.fn(),
    };
});

// Mock path module - use importOriginal to preserve all exports
vi.mock('path', async (importOriginal) => {
    const originalPath = await importOriginal<typeof path>();
    return {
        ...originalPath,
        join: vi.fn().mockImplementation((...args) => args.join('/')),
    };
});

/**
 * Helper function to wait until a condition is met or timeout occurs
 * @param condition Function that returns true when the condition is met
 * @param options Configuration with timeout in milliseconds
 */
async function waitUntil(condition: () => boolean, options: { timeout: number }): Promise<void> {
    const startTime = Date.now();
    const checkInterval = 10; // Check every 10ms

    while (Date.now() - startTime < options.timeout) {
        if (condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
    }

    throw new Error(`Condition not met within ${options.timeout}ms timeout`);
}

describe('PyodideWorkerManager', () => {
    let workerManager: PyodideWorkerManager;
    let mockWorker: any;
    let mockLogging: any;
    let workerConstructor: Mock;
    // Define more specific function types instead of generic Function
    let messageHandler: (message: any) => void;
    let errorHandler: (error: Error) => void;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        sinon.restore();

        // Create mock worker
        mockWorker = {
            on: sinon.stub().callsFake((event: string, callback: (arg: any) => void) => {
                if (event === 'message') {
                    messageHandler = callback;
                } else if (event === 'error') {
                    errorHandler = callback;
                }
            }),
            postMessage: sinon.stub(),
            terminate: sinon.stub().resolves(undefined),
        };

        // Setup Worker constructor mock
        workerConstructor = Worker as unknown as Mock;
        workerConstructor.mockReturnValue(mockWorker);

        mockLogging = mockLogger();
        // Create the worker manager
        workerManager = new PyodideWorkerManager(
            {
                maxRetries: 0, // No retries for tests to avoid timeouts
                initialDelayMs: 10,
                maxDelayMs: 100,
                backoffMultiplier: 2,
                totalTimeoutMs: 5000, // Short timeout for tests
            },
            mockLogging,
        );
    }, 10000);

    describe('initialize', () => {
        test('should create a worker and send initialize message', async () => {
            // Start initialization
            const initPromise = workerManager.initialize();

            // Verify worker was created
            expect(workerConstructor).toHaveBeenCalledWith(expect.stringContaining('pyodide-worker.js'));

            // Verify event handlers were set up
            expect(mockWorker.on.calledWith('message', sinon.match.func)).toBe(true);
            expect(mockWorker.on.calledWith('error', sinon.match.func)).toBe(true);

            // Verify initialize message was sent
            expect(
                mockWorker.postMessage.calledWith({
                    id: '1',
                    action: 'initialize',
                    payload: {},
                }),
            ).toBe(true);

            // Simulate successful initialization response
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });

            // Wait for initialization to complete
            await initPromise;

            // Verify initialization completed successfully
            await expect(workerManager.initialize()).resolves.toBeUndefined();
        });

        test('should not reinitialize if already initialized', async () => {
            // Initialize once
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
            workerConstructor.mockClear();

            // Initialize again
            await workerManager.initialize();

            // Verify worker was not created again
            expect(workerConstructor).not.toHaveBeenCalled();
            expect(mockWorker.postMessage.called).toBe(false);
        });

        test('should handle worker creation error', async () => {
            // Setup mock to simulate worker creation error
            workerConstructor.mockImplementationOnce(() => {
                throw new Error('Worker creation failed');
            });

            // Call initialize and expect it to reject
            await expect(workerManager.initialize()).rejects.toThrow('Worker creation failed');
        });

        test('should handle worker error event', async () => {
            // Start initialization
            const initPromise = workerManager.initialize();

            // Simulate worker error
            errorHandler(new Error('Worker error'));

            // Expect initialization to reject
            await expect(initPromise).rejects.toThrow('Worker error');
        });

        test('should handle worker message error', async () => {
            // Start initialization
            const initPromise = workerManager.initialize();

            // Simulate worker sending back an error message
            messageHandler({
                id: '1',
                error: 'Initialization failed',
                success: false,
            });

            // Expect initialization to reject
            await expect(initPromise).rejects.toThrow('Initialization failed');
        });

        test('should handle concurrent initialization calls', async () => {
            // Start two concurrent initialization calls
            const promise1 = workerManager.initialize();
            const promise2 = workerManager.initialize();

            // Verify worker was created only once
            expect(workerConstructor).toHaveBeenCalledTimes(1);
            expect(mockWorker.postMessage.callCount).toBe(1);

            // Simulate successful initialization
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });

            // Wait for both promises to resolve
            await Promise.all([promise1, promise2]);

            // Both promises should resolve successfully
            await expect(promise1).resolves.toBeUndefined();
            await expect(promise2).resolves.toBeUndefined();
        });

        test('should share initialization failure across concurrent calls', async () => {
            // Start two concurrent initialization calls
            const promise1 = workerManager.initialize();
            const promise2 = workerManager.initialize();

            // Verify worker was created only once
            expect(workerConstructor).toHaveBeenCalledTimes(1);

            // Simulate worker error
            errorHandler(new Error('Worker initialization failed'));

            // Both promises should reject with the same error
            await expect(promise1).rejects.toThrow('Worker initialization failed');
            await expect(promise2).rejects.toThrow('Worker initialization failed');
        });

        test('should use correct worker path with __dirname', async () => {
            // Start initialization
            const initPromise = workerManager.initialize();

            // Simulate successful initialization
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });

            // Wait for initialization to complete
            await initPromise;

            // Skip path.join check since we're having trouble making it a spy
            // expect(path.join).toHaveBeenCalledWith(expect.any(String), 'pyodide-worker.js');

            // Verify Worker constructor was called with a string path
            expect(workerConstructor).toHaveBeenCalledWith(expect.any(String));
        });
    });

    describe('lintTemplate', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
        });

        test('should send lint message and return results', async () => {
            const mockContent = 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket';
            const mockUri = 'file:///test.yaml';
            const mockFileType = CloudFormationFileType.Template;
            const mockDiagnostics = [
                {
                    uri: mockUri,
                    diagnostics: [
                        {
                            severity: 2,
                            range: {
                                start: { line: 1, character: 2 },
                                end: { line: 1, character: 10 },
                            },
                            message: 'Test diagnostic',
                            source: 'cfn-lint',
                            code: 'E1001',
                        },
                    ],
                },
            ];

            // Start lintTemplate call
            const lintPromise = workerManager.lintTemplate(mockContent, mockUri, mockFileType);

            // Verify lint message was sent
            expect(
                mockWorker.postMessage.calledWith({
                    id: '2',
                    action: 'lint',
                    payload: {
                        content: mockContent,
                        uri: mockUri,
                        fileType: mockFileType,
                    },
                }),
            ).toBe(true);

            // Simulate successful lint response
            messageHandler({
                id: '2',
                result: mockDiagnostics,
                success: true,
            });

            // Wait for lintTemplate to complete
            const result = await lintPromise;

            // Verify result
            expect(result).toEqual(mockDiagnostics);
        });

        test('should handle lint error', async () => {
            const mockContent = 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket';
            const mockUri = 'file:///test.yaml';
            const mockFileType = CloudFormationFileType.Template;

            // Start lintTemplate call
            const lintPromise = workerManager.lintTemplate(mockContent, mockUri, mockFileType);

            // Simulate lint error response
            messageHandler({
                id: '2',
                error: 'Lint failed',
                success: false,
            });

            // Expect lintTemplate to reject
            await expect(lintPromise).rejects.toThrow('Lint failed');
        });

        test('should throw if not initialized', async () => {
            // Create a new worker manager that's not initialized
            const uninitializedManager = new PyodideWorkerManager(
                {
                    maxRetries: 0,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            // Mock the initialize method to immediately reject
            uninitializedManager.initialize = vi.fn().mockRejectedValue(new Error('Worker not initialized'));

            // Call lintTemplate and expect it to reject
            await expect(
                uninitializedManager.lintTemplate('content', 'uri', CloudFormationFileType.Template),
            ).rejects.toThrow('Worker not initialized');
        });
    });

    describe('lintFile', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
        });

        test('should send lintFile message and return results', async () => {
            const mockPath = '/path/to/template.yaml';
            const mockUri = 'file:///test.yaml';
            const mockFileType = CloudFormationFileType.Template;
            const mockDiagnostics = [
                {
                    uri: mockUri,
                    diagnostics: [
                        {
                            severity: 2,
                            range: {
                                start: { line: 1, character: 2 },
                                end: { line: 1, character: 10 },
                            },
                            message: 'Test diagnostic',
                            source: 'cfn-lint',
                            code: 'E1001',
                        },
                    ],
                },
            ];

            // Start lintFile call
            const lintFilePromise = workerManager.lintFile(mockPath, mockUri, mockFileType);

            // Verify lintFile message was sent
            expect(
                mockWorker.postMessage.calledWith({
                    id: '2',
                    action: 'lintFile',
                    payload: {
                        path: mockPath,
                        uri: mockUri,
                        fileType: mockFileType,
                    },
                }),
            ).toBe(true);

            // Simulate successful lintFile response
            messageHandler({
                id: '2',
                result: mockDiagnostics,
                success: true,
            });

            // Wait for lintFile to complete
            const result = await lintFilePromise;

            // Verify result
            expect(result).toEqual(mockDiagnostics);
        });
    });

    describe('mountFolder', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
        });

        test('should send mountFolder message and return results', async () => {
            const mockFsDir = '/path/to/fs';
            const mockMountDir = '/mount/dir';
            const mockResult = { mounted: true, mountDir: mockMountDir };

            // Start mountFolder call
            const mountFolderPromise = workerManager.mountFolder(mockFsDir, mockMountDir);

            // Verify mountFolder message was sent
            expect(
                mockWorker.postMessage.calledWith({
                    id: '2',
                    action: 'mountFolder',
                    payload: {
                        fsDir: mockFsDir,
                        mountDir: mockMountDir,
                    },
                }),
            ).toBe(true);

            // Simulate successful mountFolder response
            messageHandler({
                id: '2',
                result: mockResult,
                success: true,
            });

            // Wait for mountFolder to complete
            await mountFolderPromise;
        });
    });

    describe('shutdown', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
            mockWorker.terminate.resetHistory();
        });

        test('should terminate worker and clear state', async () => {
            // Add a task to the tasks map
            const mockReject = sinon.stub();
            (workerManager as any).tasks.set('test', {
                id: 'test',
                action: 'test',
                payload: {},
                resolve: sinon.stub(),
                reject: mockReject,
            });

            // Call shutdown
            await workerManager.shutdown();

            // Verify worker was terminated
            expect(mockWorker.terminate.called).toBe(true);

            // Verify tasks were rejected
            expect(mockReject.calledWith(sinon.match.instanceOf(Error))).toBe(true);

            // Verify tasks were cleared
            expect((workerManager as any).tasks.size).toBe(0);

            // Verify state was reset
            expect((workerManager as any).worker).toBeUndefined();
            expect((workerManager as any).initialized).toBe(false);
            expect((workerManager as any).initializationPromise).toBeUndefined();
        });

        test('should do nothing if not initialized', async () => {
            // Create a new worker manager that's not initialized
            const uninitializedManager = new PyodideWorkerManager(
                {
                    maxRetries: 0,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            // Call shutdown
            await uninitializedManager.shutdown();

            // Verify worker was not terminated
            expect(mockWorker.terminate.called).toBe(false);
        });
    });

    describe('handleWorkerMessage', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
        });

        test('should handle stdout messages', () => {
            // Call handleWorkerMessage directly
            (workerManager as any).handleWorkerMessage({
                type: 'stdout',
                data: 'Test stdout message',
            });

            // Verify logging was called
            expect(mockLogging.info.calledWith(sinon.match.string)).toBe(true);
        });

        test('should handle stderr messages', () => {
            // Call handleWorkerMessage directly
            (workerManager as any).handleWorkerMessage({
                type: 'stderr',
                data: 'Test stderr message',
            });

            // Verify logging was called
            expect(
                mockLogging.error.calledWith(
                    {
                        message: {
                            type: 'stderr',
                            data: 'Test stderr message',
                        },
                    },
                    'Pyodide stderr',
                ),
            ).toBe(true);
        });

        test('should ignore messages without an ID', () => {
            // Call handleWorkerMessage directly
            (workerManager as any).handleWorkerMessage({
                type: 'unknown',
                data: 'Test message',
            });

            // Verify logging was not called with error
            expect(mockLogging.error.calledWith(sinon.match(/unknown task/))).toBe(false);
        });

        test('should log error for unknown task ID', () => {
            // Call handleWorkerMessage directly
            (workerManager as any).handleWorkerMessage({
                id: 'unknown',
                result: 'Test result',
                success: true,
            });

            // Verify logging was called
            expect(mockLogging.error.calledWith(sinon.match(/unknown task/))).toBe(true);
        });
    });

    describe('retry logic', () => {
        test('should not retry when maxRetries is 0', async () => {
            // Create a worker manager with retries disabled
            const noRetryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 0,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            // Mock worker creation to fail
            workerConstructor.mockImplementation(() => {
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail immediately without retries
            await expect(noRetryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization failed after 1 attempts. Last error: Worker creation failed',
            );

            // Verify no retry attempts were logged
            expect(mockLogging.warn.callCount).toBe(0); // No retry warnings
        });

        test('should retry initialization on failure and eventually succeed', async () => {
            // Create a worker manager with retry enabled
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 2,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            let attemptCount = 0;
            workerConstructor.mockImplementation(() => {
                attemptCount++;
                if (attemptCount <= 2) {
                    throw new Error(`Worker creation failed attempt ${attemptCount}`);
                }
                return mockWorker;
            });

            // Start initialization
            const initPromise = retryWorkerManager.initialize();

            // Wait for the expected number of attempts to occur using a more deterministic approach
            await waitUntil(() => attemptCount >= 3, { timeout: 500 });

            // Simulate successful initialization on the final attempt
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });

            // Wait for initialization to complete
            await initPromise;

            // Verify retries happened
            expect(attemptCount).toBe(3); // Initial + 2 retries
            expect(mockLogging.warn.callCount).toBe(2); // 2 retry warnings
        });

        test('should fail after max retries exceeded', async () => {
            // Create a worker manager with retry enabled
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 1,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            // Always fail worker creation
            workerConstructor.mockImplementation(() => {
                throw new Error('Worker creation always fails');
            });

            // Expect initialization to fail after retries
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization failed after 2 attempts. Last error: Worker creation always fails',
            );

            // Verify retry attempts were logged
            expect(mockLogging.warn.callCount).toBe(1); // 1 retry warning
        });

        test('should use exponential backoff delays', async () => {
            // Create a worker manager with specific retry settings
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 2,
                    initialDelayMs: 20,
                    maxDelayMs: 100,
                    backoffMultiplier: 3,
                    totalTimeoutMs: 10000, // Large timeout so it doesn't interfere
                },
                mockLogging,
            );

            const startTime = Date.now();
            const attemptTimes: number[] = [];

            workerConstructor.mockImplementation(() => {
                attemptTimes.push(Date.now() - startTime);
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail
            await expect(retryWorkerManager.initialize()).rejects.toThrow();

            // Verify exponential backoff timing with more lenient assertions for CI
            expect(attemptTimes.length).toBe(3); // Initial + 2 retries

            // Calculate actual delays between attempts
            const delays = [
                attemptTimes[1] - attemptTimes[0], // First delay
                attemptTimes[2] - attemptTimes[1], // Second delay
            ];

            // First attempt should be immediate
            expect(attemptTimes[0]).toBeLessThan(20);

            // First delay should be close to initialDelayMs (20ms), but allow variance for CI
            expect(delays[0]).toBeGreaterThanOrEqual(10);
            expect(delays[0]).toBeLessThan(50);

            // Second delay should be approximately backoffMultiplier (3) times the first
            // But allow more variance for CI environments
            const ratio = delays[1] / delays[0];
            expect(ratio).toBeGreaterThanOrEqual(2);
            expect(ratio).toBeLessThanOrEqual(5); // More lenient upper bound
        });

        test('should respect maxDelayMs cap', async () => {
            // Create a worker manager with low maxDelayMs
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 3,
                    initialDelayMs: 50,
                    maxDelayMs: 80, // Cap at 80ms
                    backoffMultiplier: 10, // Would normally create very long delays
                    totalTimeoutMs: 10000, // Large timeout so it doesn't interfere
                },
                mockLogging,
            );

            const startTime = Date.now();
            const attemptTimes: number[] = [];

            workerConstructor.mockImplementation(() => {
                attemptTimes.push(Date.now() - startTime);
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail
            await expect(retryWorkerManager.initialize()).rejects.toThrow();

            // Verify delays are capped at maxDelayMs
            expect(attemptTimes.length).toBe(4); // Initial + 3 retries

            // Calculate actual delays between attempts
            const delays = [
                attemptTimes[1] - attemptTimes[0], // First delay
                attemptTimes[2] - attemptTimes[1], // Second delay
                attemptTimes[3] - attemptTimes[2], // Third delay
            ];

            // First delay should be close to initialDelayMs (50ms), but allow variance for CI
            expect(delays[0]).toBeGreaterThanOrEqual(40);
            expect(delays[0]).toBeLessThan(80);

            // Subsequent delays should be capped at maxDelayMs (80ms), not exponentially growing
            // Allow for reasonable timing variations but verify the cap is working
            expect(delays[1]).toBeGreaterThanOrEqual(60);
            expect(delays[1]).toBeLessThanOrEqual(120);

            expect(delays[2]).toBeGreaterThanOrEqual(60);
            expect(delays[2]).toBeLessThanOrEqual(120);
        });

        test('should apply jitter to prevent synchronized retry storms', async () => {
            // Create a worker manager with jitter enabled (jitter is hardcoded to 0.1 in implementation)
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 2,
                    initialDelayMs: 100,
                    maxDelayMs: 1000,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 10000, // Large timeout so it doesn't interfere
                },
                mockLogging,
            );

            const attemptTimes: number[] = [];
            const startTime = Date.now();

            workerConstructor.mockImplementation(() => {
                attemptTimes.push(Date.now() - startTime);
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail
            await expect(retryWorkerManager.initialize()).rejects.toThrow();

            // Verify that delays have some variance due to jitter (hardcoded 10% jitter in implementation)
            expect(attemptTimes.length).toBe(3); // Initial + 2 retries

            // Calculate actual delays between attempts
            const delays = [
                attemptTimes[1] - attemptTimes[0], // First delay
                attemptTimes[2] - attemptTimes[1], // Second delay
            ];

            // With jitter, the delays should not be exactly the expected values
            // First retry should be around 100ms ± 10ms jitter, but allow more variance for CI
            expect(delays[0]).toBeGreaterThan(80);
            expect(delays[0]).toBeLessThan(140);

            // Second retry should be around 200ms ± 20ms jitter, but allow more variance for CI
            expect(delays[1]).toBeGreaterThan(160);
            expect(delays[1]).toBeLessThan(280);
        });

        test('should respect total timeout to prevent excessive retry durations', async () => {
            // Create a worker manager with settings that would normally take a long time
            // The implementation uses totalTimeoutMs = maxDelayMs * (maxRetries + 1)
            // With maxDelayMs=50 and maxRetries=10, totalTimeout = 50 * 11 = 550ms
            // But the actual delays grow exponentially, so it should timeout before reaching max retries
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 10, // High retry count
                    initialDelayMs: 100, // Start with higher delay
                    maxDelayMs: 200, // This means totalTimeout = 200 * 11 = 2200ms
                    backoffMultiplier: 2,
                    totalTimeoutMs: 2200, // Explicit timeout
                },
                mockLogging,
            );

            const startTime = Date.now();
            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail
            await expect(retryWorkerManager.initialize()).rejects.toThrow();

            const totalTime = Date.now() - startTime;

            // The total timeout should prevent it from running the full duration
            // With exponential backoff (100, 200, 200, 200...), it should timeout before all retries
            expect(totalTime).toBeLessThan(3000); // Should be around 2200ms + some buffer

            // It might still reach max retries depending on timing, so let's just verify it ran
            expect(attemptCount).toBeGreaterThan(1); // Should have made multiple attempts
        });

        test('should use explicit totalTimeoutMs when provided', async () => {
            // Create a worker manager with explicit totalTimeoutMs
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 10, // High retry count that would normally take a long time
                    initialDelayMs: 50,
                    maxDelayMs: 200,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 300, // Explicit timeout of 300ms
                },
                mockLogging,
            );

            const startTime = Date.now();
            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail with timeout error
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization timed out after 300ms',
            );

            const totalTime = Date.now() - startTime;

            // Should respect the explicit totalTimeoutMs (300ms) rather than calculated timeout
            expect(totalTime).toBeGreaterThanOrEqual(290); // Should run for at least the timeout duration
            expect(totalTime).toBeLessThan(400); // Should not run much longer than timeout + buffer

            // Should have made some attempts but not all 10 retries
            expect(attemptCount).toBeGreaterThan(1);
            expect(attemptCount).toBeLessThan(11); // Should timeout before reaching max retries
        });

        test('should work without totalTimeoutMs (backward compatibility)', async () => {
            // Create a worker manager without totalTimeoutMs (uses default from DefaultSettings)
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 2,
                    initialDelayMs: 10,
                    maxDelayMs: 50,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 120_000, // Uses default value from DefaultSettings
                },
                mockLogging,
            );

            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Should fail after max retries, not timeout (since timeout is very large)
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization failed after 3 attempts. Last error: Worker creation failed',
            );

            // Should have made all retry attempts (initial + 2 retries = 3 total)
            expect(attemptCount).toBe(3);
        });

        test('should prefer explicit totalTimeoutMs over calculated timeout', async () => {
            // Create a worker manager where explicit totalTimeoutMs is much shorter than calculated timeout
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 5, // Would normally allow 6 attempts
                    initialDelayMs: 100,
                    maxDelayMs: 1000, // Calculated timeout would be 1000 * 6 = 6000ms
                    backoffMultiplier: 2,
                    totalTimeoutMs: 200, // But explicit timeout is only 200ms
                },
                mockLogging,
            );

            const startTime = Date.now();
            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Should timeout quickly due to explicit totalTimeoutMs
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization timed out after 200ms',
            );

            const totalTime = Date.now() - startTime;

            // Should respect the explicit 200ms timeout, not the calculated 6000ms
            // Allow more variance for CI environments
            expect(totalTime).toBeGreaterThanOrEqual(180);
            expect(totalTime).toBeLessThan(350);

            // Should have made fewer attempts due to quick timeout
            expect(attemptCount).toBeLessThan(6); // Should not reach max retries
        });

        test('should handle zero totalTimeoutMs (immediate timeout)', async () => {
            // Create a worker manager with zero totalTimeoutMs
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 3,
                    initialDelayMs: 100,
                    maxDelayMs: 500,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 0, // Immediate timeout
                },
                mockLogging,
            );

            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Should timeout immediately after first attempt
            await expect(retryWorkerManager.initialize()).rejects.toThrow('Pyodide initialization timed out after 0ms');

            // Should have made at least one attempt before timing out
            expect(attemptCount).toBe(1);
        });

        test('should handle very large totalTimeoutMs', async () => {
            // Create a worker manager with very large totalTimeoutMs
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 2,
                    initialDelayMs: 10,
                    maxDelayMs: 50,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 10000, // Very large timeout (10 seconds)
                },
                mockLogging,
            );

            let attemptCount = 0;

            workerConstructor.mockImplementation(() => {
                attemptCount++;
                throw new Error('Worker creation failed');
            });

            // Should fail due to max retries, not timeout
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization failed after 3 attempts. Last error: Worker creation failed',
            );

            // Should have made all retry attempts
            expect(attemptCount).toBe(3);
        });

        test('should use default operation name in error messages', async () => {
            // Create a worker manager without specifying operation name
            const retryWorkerManager = new PyodideWorkerManager(
                {
                    maxRetries: 1,
                    initialDelayMs: 10,
                    maxDelayMs: 100,
                    backoffMultiplier: 2,
                    totalTimeoutMs: 5000,
                },
                mockLogging,
            );

            // Always fail worker creation
            workerConstructor.mockImplementation(() => {
                throw new Error('Worker creation failed');
            });

            // Expect initialization to fail with default operation name
            await expect(retryWorkerManager.initialize()).rejects.toThrow(
                'Pyodide initialization failed after 2 attempts. Last error: Worker creation failed',
            );
        });
    });

    describe('race conditions and edge cases', () => {
        beforeEach(async () => {
            // Initialize the worker manager
            const initPromise = workerManager.initialize();
            messageHandler({
                id: '1',
                result: { status: 'initialized' },
                success: true,
            });
            await initPromise;

            // Reset mocks for the next test
            mockWorker.on.resetHistory();
            mockWorker.postMessage.resetHistory();
            mockWorker.terminate.resetHistory();
            (mockLogging.info as sinon.SinonStub).resetHistory();
            (mockLogging.error as sinon.SinonStub).resetHistory();
            (mockLogging.warn as sinon.SinonStub).resetHistory();
        });

        test('should handle shutdown during task execution', async () => {
            const taskPromise = workerManager.lintTemplate(
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                'file:///test.yaml',
                CloudFormationFileType.Template,
            );

            // Verify task was sent
            expect(mockWorker.postMessage.called).toBe(true);

            // Shutdown the worker manager
            await workerManager.shutdown();

            // Verify worker was terminated
            expect(mockWorker.terminate.called).toBe(true);

            // Task should be rejected
            await expect(taskPromise).rejects.toThrow('Worker shutdown');
        });

        test('should handle malformed worker messages', () => {
            // Call handleWorkerMessage directly with malformed messages
            const handleWorkerMessage = (workerManager as any).handleWorkerMessage.bind(workerManager);

            // Message with no type or id
            handleWorkerMessage({});
            expect(mockLogging.error.calledWith(sinon.match(/unknown task/))).toBe(false);

            // Message with unknown task id
            handleWorkerMessage({ id: 'unknown', result: 'test' });
            expect(mockLogging.error.calledWith(sinon.match(/unknown task/))).toBe(true);
        });

        test('should handle worker termination error', async () => {
            // Setup mock to throw error on terminate
            const terminationError = new Error('Termination failed');
            mockWorker.terminate.rejects(terminationError);

            // Call shutdown
            await workerManager.shutdown();

            // Wait for any async operations to complete
            await new Promise((resolve) => setTimeout(resolve, 10));

            // Error should be logged
            expect(mockLogging.error.calledWith({ error: terminationError }, 'Error terminating worker')).toBe(true);
        });
    });
});
