import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Track, Measure, Telemetry } from '../../../src/telemetry/TelemetryDecorator';
import { TelemetryService } from '../../../src/telemetry/TelemetryService';

describe('TelemetryDecorator', () => {
    let mockTelemetry: any;
    let mockGet: any;

    beforeEach(() => {
        mockTelemetry = {
            trackExecution: vi.fn((name, fn) => fn()),
            trackExecutionAsync: vi.fn(async (name, fn) => await fn()),
            measure: vi.fn((name, fn) => fn()),
            measureAsync: vi.fn(async (name, fn) => await fn()),
        };

        mockGet = vi.fn(() => mockTelemetry);
        vi.spyOn(TelemetryService, 'instance', 'get').mockReturnValue({ get: mockGet } as any);
    });

    describe('Telemetry property decorator', () => {
        it('should inject telemetry instance with class name as scope', () => {
            class TestService {
                @Telemetry()
                telemetry: any;
            }

            const instance = new TestService();

            expect(instance.telemetry).toBe(mockTelemetry);
            expect(mockGet).toHaveBeenCalledWith('TestService');
        });

        it('should be non-enumerable and non-configurable', () => {
            class TestService {
                @Telemetry()
                telemetry: any;
            }

            const instance = new TestService();
            const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(instance), 'telemetry');

            expect(descriptor?.enumerable).toBe(false);
            expect(descriptor?.configurable).toBe(false);
        });
    });

    describe('Track decorator', () => {
        it('should call trackExecution for sync method', () => {
            class TestClass {
                @Track({ name: 'syncMethod' })
                syncMethod() {
                    return 'result';
                }
            }

            const instance = new TestClass();
            const result = instance.syncMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.trackExecution).toHaveBeenCalledWith(
                'syncMethod',
                expect.any(Function),
                undefined,
                {},
            );
            expect(mockTelemetry.trackExecutionAsync).not.toHaveBeenCalled();
        });

        it('should call trackExecutionAsync for async method', async () => {
            class TestClass {
                @Track({ name: 'asyncMethod' })
                async asyncMethod() {
                    await Promise.resolve();
                    return 'result';
                }
            }

            const instance = new TestClass();
            const result = await instance.asyncMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.trackExecutionAsync).toHaveBeenCalledWith(
                'asyncMethod',
                expect.any(Function),
                undefined,
                {},
            );
            expect(mockTelemetry.trackExecution).not.toHaveBeenCalled();
        });

        it('should call trackExecutionAsync for method returning promise', async () => {
            class TestClass {
                @Track({ name: 'promiseMethod' })
                promiseMethod() {
                    return Promise.resolve('result');
                }
            }

            const instance = new TestClass();
            const result = await instance.promiseMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.trackExecution).toHaveBeenCalled();
            expect(mockTelemetry.trackExecutionAsync).not.toHaveBeenCalled();
        });

        it('should call trackExecution for non-async function returning promise', async () => {
            class TestClass {
                @Track({ name: 'promiseReturningMethod' })
                promiseReturningMethod() {
                    return new Promise((resolve) => resolve('result'));
                }
            }

            const instance = new TestClass();
            const result = await instance.promiseReturningMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.trackExecution).toHaveBeenCalled();
            expect(mockTelemetry.trackExecutionAsync).not.toHaveBeenCalled();
        });

        it('should use class name as scope', () => {
            class MyService {
                @Track({ name: 'method' })
                method() {}
            }

            new MyService().method();

            expect(mockGet).toHaveBeenCalledWith('MyService');
        });

        it('should use custom metric name', () => {
            class TestClass {
                @Track({ name: 'customName' })
                method() {}
            }

            new TestClass().method();

            expect(mockTelemetry.trackExecution).toHaveBeenCalledWith(
                'customName',
                expect.any(Function),
                undefined,
                {},
            );
        });

        it('should pass custom attributes', () => {
            class TestClass {
                @Track({ name: 'method', attributes: { key: 'value' } })
                method() {}
            }

            new TestClass().method();

            expect(mockTelemetry.trackExecution).toHaveBeenCalledWith('method', expect.any(Function), undefined, {
                key: 'value',
            });
        });
    });

    describe('Measure decorator', () => {
        it('should call measure for sync method', () => {
            class TestClass {
                @Measure({ name: 'syncMethod' })
                syncMethod() {
                    return 'result';
                }
            }

            const instance = new TestClass();
            const result = instance.syncMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.measure).toHaveBeenCalledWith('syncMethod', expect.any(Function), undefined, {});
            expect(mockTelemetry.measureAsync).not.toHaveBeenCalled();
        });

        it('should call measureAsync for async method', async () => {
            class TestClass {
                @Measure({ name: 'asyncMethod' })
                async asyncMethod() {
                    await Promise.resolve();
                    return 'result';
                }
            }

            const instance = new TestClass();
            const result = await instance.asyncMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.measureAsync).toHaveBeenCalledWith('asyncMethod', expect.any(Function), undefined, {});
            expect(mockTelemetry.measure).not.toHaveBeenCalled();
        });

        it('should call measure for non-async function returning promise', async () => {
            class TestClass {
                @Measure({ name: 'promiseReturningMethod' })
                promiseReturningMethod() {
                    return new Promise((resolve) => resolve('result'));
                }
            }

            const instance = new TestClass();
            const result = await instance.promiseReturningMethod();

            expect(result).toBe('result');
            expect(mockTelemetry.measure).toHaveBeenCalled();
            expect(mockTelemetry.measureAsync).not.toHaveBeenCalled();
        });

        it('should use class name as scope', () => {
            class MyService {
                @Measure({ name: 'method' })
                method() {}
            }

            new MyService().method();

            expect(mockGet).toHaveBeenCalledWith('MyService');
        });

        it('should use custom metric name', () => {
            class TestClass {
                @Measure({ name: 'customName' })
                method() {}
            }

            new TestClass().method();

            expect(mockTelemetry.measure).toHaveBeenCalledWith('customName', expect.any(Function), undefined, {});
        });

        it('should pass metric options', () => {
            const options = { unit: 'ms' };

            class TestClass {
                @Measure({ name: 'method', options })
                method() {}
            }

            new TestClass().method();

            expect(mockTelemetry.measure).toHaveBeenCalledWith('method', expect.any(Function), options, {});
        });
    });
});
