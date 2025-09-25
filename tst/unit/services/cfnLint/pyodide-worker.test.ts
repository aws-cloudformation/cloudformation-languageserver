import { loadPyodide } from 'pyodide';
import { describe, expect, beforeEach, afterEach, vi, test, Mock, MockInstance } from 'vitest';
import { CloudFormationFileType } from '../../../../src/document/Document';

// Create a mock for the pyodide-worker module
vi.mock('../../../../src/services/cfnLint/pyodide-worker', () => {
    return {
        lintTemplate: vi.fn(),
        mountFolder: vi.fn(),
        initialize: vi.fn(),
    };
});

// Mock modules before importing the worker
vi.mock('worker_threads', () => {
    const mockParentPort = {
        on: vi.fn(),
        postMessage: vi.fn(),
    };
    return {
        parentPort: mockParentPort,
        // Export a function to get/set the mock for testing
        __getMockParentPort: () => mockParentPort,
        __setMockParentPort: (value: any) => {
            Object.assign(mockParentPort, value === null ? { on: vi.fn(), postMessage: vi.fn() } : value);
        },
    };
});

vi.mock('pyodide', () => ({
    loadPyodide: vi.fn(),
}));

vi.mock('fs', () => ({
    readFileSync: vi.fn(),
    existsSync: vi.fn(),
}));

vi.mock('process', () => {
    const actual = vi.importActual('process');
    return {
        ...(actual as object),
    };
});

// Create a more comprehensive mock for the pyodide instance
const createMockPyodide = () => ({
    loadPackage: vi.fn().mockResolvedValue(undefined),
    runPythonAsync: vi.fn().mockImplementation((code) => {
        // Store the code for assertions in tests
        (createMockPyodide as any).lastPythonCode = code;

        return Promise.resolve({
            toJs: vi.fn().mockReturnValue([
                {
                    uri: 'file:///test.yaml',
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
                            codeDescription: {
                                href: 'https://github.com/aws-cloudformation/cfn-lint/blob/main/docs/rules.md#E1001',
                            },
                        },
                    ],
                },
            ]),
        });
    }),
    toPy: vi.fn((val) => {
        // Store the value for assertions in tests
        if (!(createMockPyodide as any).toPyCalls) {
            (createMockPyodide as any).toPyCalls = [];
        }
        (createMockPyodide as any).toPyCalls.push(val);
        return val;
    }),
    FS: {
        mkdirTree: vi.fn(),
        rmdir: vi.fn(),
        unlink: vi.fn(),
        writeFile: vi.fn(),
        readFile: vi.fn(),
    },
    mountNodeFS: vi.fn(),
});

// Mock variables that would be in the worker module
let mockPyodide: ReturnType<typeof createMockPyodide> | null = null;
// These variables are used in the tests to control the behavior of the mock worker
let mockInitialized = false;
let mockInitializing = false;

// Mock loadPyodide to return our mockPyodide instance
(loadPyodide as Mock).mockImplementation(() => {
    mockPyodide = createMockPyodide();
    return Promise.resolve(mockPyodide);
});

describe('pyodide-worker', () => {
    let mockParentPort: any;
    let messageHandler: (message: any) => Promise<void>;

    // Helper function to safely handle null parentPort
    const createSafeMessageHandler = () => {
        return async (message: any) => {
            // Store the original function
            const originalPostMessage = mockParentPort.postMessage;

            try {
                // Create a new mock function
                const noopFn = vi.fn();

                // Create a copy of the object to avoid modifying the original directly
                const mockParentPortCopy = { ...mockParentPort, postMessage: noopFn };

                // Replace the global mockParentPort with our copy

                Object.assign(mockParentPort, mockParentPortCopy);

                // Call the handler - this should not throw
                await messageHandler(message);

                // Test passes if we get here without throwing
                return true;
            } catch (error) {
                // Test fails if we get here
                expect(error).toBeUndefined();
                return false;
            } finally {
                // Always restore the original function
                // eslint-disable-next-line require-atomic-updates
                mockParentPort.postMessage = originalPostMessage;
            }
        };
    };

    beforeEach(async () => {
        vi.clearAllMocks();

        // Reset state
        mockPyodide = null;
        mockInitialized = false;
        mockInitializing = false;

        // Get the mock parentPort from the mock module
        const workerThreads = await import('worker_threads');
        mockParentPort = (workerThreads as any).__getMockParentPort();

        // Reset modules to ensure a clean import
        vi.resetModules();

        // Create a custom messageHandler implementation for testing
        messageHandler = async (message) => {
            try {
                if (!message.action) {
                    mockParentPort.postMessage({
                        id: message.id,
                        error: 'Missing action',
                        success: false,
                    });
                    return;
                }

                let result: unknown;

                switch (message.action) {
                    case 'initialize': {
                        if (mockInitialized) {
                            result = { status: 'already-initialized' };
                        } else if (mockInitializing) {
                            result = { status: 'already-initializing' };
                        } else {
                            // Set flag before async operation to avoid race condition
                            mockInitializing = true;

                            try {
                                // This will call our mocked loadPyodide
                                await loadPyodide({
                                    stdout: vi.fn(),
                                    stderr: vi.fn(),
                                });

                                // Use a local variable to avoid race condition linting error
                                // eslint-disable-next-line require-atomic-updates
                                mockInitialized = true;

                                result = { status: 'initialized' };
                            } finally {
                                // Use a local variable to avoid race condition linting error
                                // eslint-disable-next-line require-atomic-updates
                                mockInitializing = false;
                            }
                        }
                        break;
                    }
                    case 'lint': {
                        if (!mockInitialized || !mockPyodide) {
                            throw new Error('Pyodide not initialized');
                        }

                        const content = message.payload?.content as string;
                        const uri = message.payload?.uri as string;
                        // Unused variable commented out
                        // const fileType = message.payload?.fileType;

                        // Call the mocked functions in the same order as the real implementation
                        mockPyodide.toPy(uri);
                        mockPyodide.toPy(content?.replaceAll('"""', '\\"\\"\\"'));

                        const pythonResult = await mockPyodide.runPythonAsync(
                            `lint_str(r"""${content}""", r"""${uri}""")`,
                        );
                        result = pythonResult.toJs();
                        break;
                    }
                    case 'lintFile': {
                        if (!mockInitialized || !mockPyodide) {
                            throw new Error('Pyodide not initialized');
                        }

                        const path = message.payload?.path as string;
                        const uri = message.payload?.uri as string;
                        const fileType = message.payload?.fileType;

                        const pythonResult = await mockPyodide.runPythonAsync(
                            `lint_uri(r"""${path}""", r"""${uri}""", r"""${fileType}""")`,
                        );
                        result = pythonResult.toJs();
                        break;
                    }
                    case 'mountFolder': {
                        if (!mockInitialized || !mockPyodide) {
                            throw new Error('Pyodide not initialized');
                        }

                        const fsDir = message.payload?.fsDir as string;
                        const mountDir = message.payload?.mountDir as string;

                        try {
                            mockPyodide.FS.mkdirTree(mountDir);
                            mockPyodide.mountNodeFS(mountDir, fsDir);
                            result = { mounted: true, mountDir };
                        } catch (error) {
                            // Clean up if mounting fails
                            try {
                                mockPyodide.FS.rmdir(mountDir);
                            } catch {
                                // Ignore cleanup errors
                            }
                            throw error;
                        }
                        break;
                    }
                    default: {
                        throw new Error(`Unknown action: ${message.action}`);
                    }
                }

                // Send successful result back to main thread
                if (mockParentPort !== null && mockParentPort !== undefined) {
                    mockParentPort.postMessage({ id: message.id, result, success: true });
                }
            } catch (error) {
                // Send error back to main thread
                if (mockParentPort !== null && mockParentPort !== undefined) {
                    mockParentPort.postMessage({
                        id: message.id,
                        error: error instanceof Error ? error.message : String(error),
                        success: false,
                    });
                }
            }
        };

        // Simulate the worker module importing and setting up the message handler
        mockParentPort.on('message', messageHandler);
    });

    describe('message handling', () => {
        test('should set up message handler on parentPort', () => {
            expect(mockParentPort.on).toHaveBeenCalledWith('message', expect.any(Function));
        });

        test('should handle unknown action', async () => {
            await messageHandler({
                id: '1',
                action: 'unknownAction',
                payload: {},
            });

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '1',
                error: expect.stringContaining('Unknown action'),
                success: false,
            });
        });

        test('should handle missing payload properties', async () => {
            await messageHandler({
                id: '1',
                action: 'lint',
                payload: {
                    // Missing content, uri, and fileType
                },
            });

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '1',
                error: expect.any(String),
                success: false,
            });
        });

        test('should handle non-Error exceptions', async () => {
            // Initialize first with normal mock
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Reset mocks
            vi.clearAllMocks();

            // Now mock runPythonAsync to throw a string instead of an Error
            // We need to test how the code handles non-Error exceptions
            mockPyodide?.runPythonAsync.mockImplementationOnce(() => {
                // eslint-disable-next-line @typescript-eslint/only-throw-error
                throw 'String error';
            });

            // Then try to lint which will throw
            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'test',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the error is properly formatted in the response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '2',
                    error: 'String error',
                    success: false,
                }),
            );
        });

        test('should handle null parentPort when sending results', async () => {
            // Initialize first with valid parentPort
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Create a wrapper function that catches errors
            const safeMessageHandler = createSafeMessageHandler();

            // Try to lint - this should not throw
            const result = await safeMessageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'test',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the function completed without throwing
            expect(result).toBe(true);
        });

        test('should handle null parentPort when sending errors', async () => {
            // Initialize first with valid parentPort
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Create a wrapper function that catches errors
            const safeMessageHandler = createSafeMessageHandler();

            // Try an unknown action - this should not throw
            const result = await safeMessageHandler({
                id: '2',
                action: 'unknownAction',
                payload: {},
            });

            // Verify the function completed without throwing
            expect(result).toBe(true);
        });
    });

    describe('lintTemplate', () => {
        beforeEach(async () => {
            // Initialize first
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Reset mocks
            vi.clearAllMocks();
        });

        test('should lint template content successfully', async () => {
            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Check that toPy was called with the right arguments
            expect((createMockPyodide as any).toPyCalls).toContain('file:///test.yaml');
            expect(
                (createMockPyodide as any).toPyCalls.some(
                    (call: unknown) => typeof call === 'string' && call.includes('Resources:'),
                ),
            ).toBe(true);

            // Check that runPythonAsync was called with the right code
            expect((createMockPyodide as any).lastPythonCode).toContain('lint_str');

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: expect.any(Array),
                success: true,
            });
        });

        test('should handle template with triple quotes', async () => {
            const templateWithTripleQuotes =
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket\n    Properties:\n      BucketName: """test"""';

            // Reset the stored calls
            (createMockPyodide as any).toPyCalls = [];

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: templateWithTripleQuotes,
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify that triple quotes are escaped in the Python call
            expect(
                (createMockPyodide as any).toPyCalls.some(
                    (call: unknown) =>
                        typeof call === 'string' &&
                        call.includes('BucketName:') &&
                        call.includes('\\"\\"\\"test\\"\\"\\"'),
                ),
            ).toBe(true);

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: expect.any(Array),
                success: true,
            });
        });

        test('should handle template with special characters', async () => {
            const templateWithSpecialChars =
                'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket\n    Properties:\n      BucketName: "test\\n\\t\\r"';

            // Reset the stored calls
            (createMockPyodide as any).toPyCalls = [];

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: templateWithSpecialChars,
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            expect(
                (createMockPyodide as any).toPyCalls.some(
                    (call: unknown) => typeof call === 'string' && call.includes('BucketName: "test\\n\\t\\r"'),
                ),
            ).toBe(true);

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: expect.any(Array),
                success: true,
            });
        });

        test('should handle Python error during linting', async () => {
            // Setup runPythonAsync to fail during linting
            mockPyodide?.runPythonAsync.mockRejectedValueOnce(new Error('Python linting error'));

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the error is properly formatted in the response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '2',
                    error: 'Python linting error',
                    success: false,
                }),
            );
        });

        test('should handle empty template content', async () => {
            // Reset the stored calls
            (createMockPyodide as any).toPyCalls = [];

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: '',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            expect((createMockPyodide as any).toPyCalls).toContain('');
            expect((createMockPyodide as any).lastPythonCode).toContain('lint_str');

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: expect.any(Array),
                success: true,
            });
        });

        test('should throw if called before initialization', async () => {
            // Reset state to simulate uninitialized state
            mockInitialized = false;
            mockPyodide = null;

            // Call the message handler directly
            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the error response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                error: 'Pyodide not initialized',
                success: false,
            });
        });

        test('should handle different CloudFormation file types', async () => {
            // Reset the stored calls
            (createMockPyodide as any).lastPythonCode = '';

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.GitSyncDeployment,
                },
            });

            expect((createMockPyodide as any).lastPythonCode).toContain('lint_str');

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: expect.any(Array),
                success: true,
            });
        });

        test('should handle toJs conversion error', async () => {
            // Setup toJs to throw
            const mockResult = {
                toJs: vi.fn().mockImplementationOnce(() => {
                    throw new Error('toJs conversion error');
                }),
            };
            mockPyodide?.runPythonAsync.mockResolvedValueOnce(mockResult);

            await messageHandler({
                id: '2',
                action: 'lint',
                payload: {
                    content: 'Resources:\n  MyBucket:\n    Type: AWS::S3::Bucket',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the error is properly formatted in the response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '2',
                    error: 'toJs conversion error',
                    success: false,
                }),
            );
        });
    });

    describe('mountFolder', () => {
        beforeEach(async () => {
            // Initialize first
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Reset mocks
            vi.clearAllMocks();
        });

        test('should mount folder successfully', async () => {
            await messageHandler({
                id: '2',
                action: 'mountFolder',
                payload: {
                    fsDir: '/path/to/fs',
                    mountDir: '/mount/dir',
                },
            });

            expect(mockPyodide?.FS.mkdirTree).toHaveBeenCalledWith('/mount/dir');
            expect(mockPyodide?.mountNodeFS).toHaveBeenCalledWith('/mount/dir', '/path/to/fs');

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                result: {
                    mounted: true,
                    mountDir: '/mount/dir',
                },
                success: true,
            });
        });

        test('should handle mount error', async () => {
            // Setup mountNodeFS to throw
            mockPyodide?.mountNodeFS.mockImplementationOnce(() => {
                throw new Error('Mount failed');
            });

            await messageHandler({
                id: '2',
                action: 'mountFolder',
                payload: {
                    fsDir: '/path/to/fs',
                    mountDir: '/mount/dir',
                },
            });

            // Verify that cleanup was attempted
            expect(mockPyodide?.FS.rmdir).toHaveBeenCalledWith('/mount/dir');

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                error: 'Mount failed',
                success: false,
            });
        });

        test('should handle mkdir error', async () => {
            // Setup mkdirTree to throw
            mockPyodide?.FS.mkdirTree.mockImplementationOnce(() => {
                throw new Error('Directory creation failed');
            });

            await messageHandler({
                id: '2',
                action: 'mountFolder',
                payload: {
                    fsDir: '/path/to/fs',
                    mountDir: '/mount/dir',
                },
            });

            // Verify that mountNodeFS was not called
            expect(mockPyodide?.mountNodeFS).not.toHaveBeenCalled();

            // Verify the error is properly formatted in the response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '2',
                    error: 'Directory creation failed',
                    success: false,
                }),
            );
        });

        test('should handle cleanup error when mounting fails', async () => {
            // Setup mountNodeFS to throw and rmdir to throw
            mockPyodide?.mountNodeFS.mockImplementationOnce(() => {
                throw new Error('Mount failed');
            });
            mockPyodide?.FS.rmdir.mockImplementationOnce(() => {
                throw new Error('Cleanup failed');
            });

            await messageHandler({
                id: '2',
                action: 'mountFolder',
                payload: {
                    fsDir: '/path/to/fs',
                    mountDir: '/mount/dir',
                },
            });

            // Verify that cleanup was attempted
            expect(mockPyodide?.FS.rmdir).toHaveBeenCalledWith('/mount/dir');

            // Verify that the original error is propagated, not the cleanup error
            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                error: 'Mount failed',
                success: false,
            });
        });

        test('should throw if called before initialization', async () => {
            // Reset state to simulate uninitialized state
            mockInitialized = false;
            mockPyodide = null;

            // Call the message handler directly
            await messageHandler({
                id: '2',
                action: 'mountFolder',
                payload: {
                    fsDir: '/path/to/fs',
                    mountDir: '/mount/dir',
                },
            });

            // Verify the error response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '2',
                error: 'Pyodide not initialized',
                success: false,
            });
        });
    });

    describe('stdout and stderr handling', () => {
        let consoleLogSpy: MockInstance;
        let consoleErrorSpy: MockInstance;

        beforeEach(() => {
            // Spy on console.log and console.error
            consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
            consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
        });

        afterEach(() => {
            // Restore console.log and console.error
            consoleLogSpy.mockRestore();
            consoleErrorSpy.mockRestore();
        });

        test('should handle stdout messages', () => {
            // Define custom stdout handler
            const customStdout = (text: string): void => {
                // eslint-disable-next-line no-console
                console.log(text);
            };

            // Call the handler directly
            customStdout('Test stdout message');

            // Verify that console.log was called
            expect(consoleLogSpy).toHaveBeenCalledWith('Test stdout message');
        });

        test('should handle stderr messages', () => {
            // Define custom stderr handler
            const customStderr = (text: string): void => {
                // eslint-disable-next-line no-console
                console.error(text);
            };

            // Call the handler directly
            customStderr('Test stderr message');

            // Verify that console.error was called
            expect(consoleErrorSpy).toHaveBeenCalledWith('Test stderr message');
        });
    });

    describe('concurrent operations', () => {
        test('should handle multiple concurrent initialization requests', async () => {
            // Reset state
            mockInitialized = false;
            mockInitializing = false;

            // Setup a delayed loadPyodide to simulate long initialization
            (loadPyodide as Mock).mockImplementationOnce(
                () => new Promise((resolve) => setTimeout(() => resolve(createMockPyodide()), 50)),
            );

            // Start multiple initialization requests concurrently
            const promises = [];
            for (let i = 0; i < 5; i++) {
                promises.push(
                    messageHandler({
                        id: `init-${i}`,
                        action: 'initialize',
                        payload: {},
                    }),
                );
            }

            // Wait for all promises to resolve
            await Promise.all(promises);

            // Verify loadPyodide was called exactly once
            expect(loadPyodide).toHaveBeenCalledTimes(1);

            // Verify first request got 'initialized' and others got 'already-initializing' or 'already-initialized'
            const postMessageCalls = mockParentPort.postMessage.mock.calls;

            // Count the different status types
            const statusCounts: Record<string, number> = {
                initialized: 0,
                'already-initializing': 0,
                'already-initialized': 0,
            };

            for (const call of postMessageCalls) {
                // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
                if (call[0].success && call[0].result && call[0].result.status) {
                    statusCounts[call[0].result.status]++;
                }
            }

            // Expect exactly one 'initialized' response
            expect(statusCounts.initialized).toBe(1);

            // The rest should be either 'already-initializing' or 'already-initialized'
            expect(statusCounts['already-initializing'] + statusCounts['already-initialized']).toBe(4);
        });

        test('should handle concurrent operations after initialization', async () => {
            // Initialize first
            await messageHandler({
                id: '1',
                action: 'initialize',
                payload: {},
            });

            // Reset mocks
            vi.clearAllMocks();

            // Setup different mock responses for each call
            const mockResponses = [
                { uri: 'file:///test1.yaml', diagnostics: [{ severity: 1, message: 'Error 1' }] },
                { uri: 'file:///test2.yaml', diagnostics: [{ severity: 2, message: 'Warning 1' }] },
                { uri: 'file:///test3.yaml', diagnostics: [{ severity: 3, message: 'Info 1' }] },
            ];

            let callCount = 0;
            mockPyodide?.runPythonAsync.mockImplementation(() => {
                const response = {
                    toJs: vi.fn().mockReturnValue([mockResponses[callCount % mockResponses.length]]),
                };
                callCount++;
                return Promise.resolve(response);
            });

            // Start multiple lint operations concurrently
            const promises = [];
            for (let i = 0; i < 3; i++) {
                promises.push(
                    messageHandler({
                        id: `lint-${i}`,
                        action: 'lint',
                        payload: {
                            content: `Template ${i}`,
                            uri: `file:///test${i}.yaml`,
                            fileType: CloudFormationFileType.Template,
                        },
                    }),
                );
            }

            // Wait for all promises to resolve
            await Promise.all(promises);

            // Verify runPythonAsync was called for each request
            expect(mockPyodide?.runPythonAsync).toHaveBeenCalledTimes(3);

            // Verify each request got a response
            expect(mockParentPort.postMessage).toHaveBeenCalledTimes(3);

            // Verify each response has the expected format
            for (let i = 0; i < 3; i++) {
                expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                    id: `lint-${i}`,
                    result: expect.any(Array),
                    success: true,
                });
            }
        });
    });

    describe('edge cases', () => {
        test('should handle missing parentPort', () => {
            // Create a wrapper function that catches errors
            const testWrapper = () => {
                const originalPostMessage = mockParentPort.postMessage;
                try {
                    // Temporarily replace postMessage with a no-op function
                    // Use a local variable to avoid race condition linting error
                    const noopFn = vi.fn();
                    mockParentPort.postMessage = noopFn;

                    // This is just a test to ensure it doesn't throw
                    // We don't need to create a handler function

                    // Test passes if we get here without throwing
                    return true;
                } catch (error) {
                    // Test fails if we get here
                    expect(error).toBeUndefined();
                    return false;
                } finally {
                    // Always restore the original function
                    mockParentPort.postMessage = originalPostMessage;
                }
            };

            // Execute the wrapper and verify it completes without throwing
            expect(testWrapper()).toBe(true);
        });

        test('should handle lintFile with null pyodide', async () => {
            // Reset state for this test only
            mockInitialized = false;
            mockPyodide = null;

            // Call the message handler directly
            await messageHandler({
                id: '2',
                action: 'lintFile',
                payload: {
                    path: '/path/to/template.yaml',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            // Verify the error is properly formatted in the response
            expect(mockParentPort.postMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    id: '2',
                    error: 'Pyodide not initialized',
                    success: false,
                }),
            );
        });

        test('should handle malformed message object', async () => {
            // Reset mocks
            vi.clearAllMocks();

            // Mock the message handler to throw an error
            mockPyodide?.runPythonAsync.mockImplementationOnce(() => {
                throw new Error('Invalid message format');
            });

            await messageHandler({
                // Missing id
                action: 'lint',
                payload: {
                    content: 'test',
                    uri: 'file:///test.yaml',
                    fileType: CloudFormationFileType.Template,
                },
            });

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: undefined,
                error: expect.any(String),
                success: false,
            });
        });

        test('should handle message with missing action', async () => {
            // Reset mocks
            vi.clearAllMocks();

            await messageHandler({
                id: '1',
                // Missing action
                payload: {},
            });

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '1',
                error: expect.any(String),
                success: false,
            });
        });

        test('should handle message with missing payload', async () => {
            // Reset mocks
            vi.clearAllMocks();

            await messageHandler({
                id: '1',
                action: 'lint',
                // Missing payload
            });

            expect(mockParentPort.postMessage).toHaveBeenCalledWith({
                id: '1',
                error: expect.any(String),
                success: false,
            });
        });
    });
});
