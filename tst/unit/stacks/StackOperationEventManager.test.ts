import { OperationEvent } from '@aws-sdk/client-cloudformation';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CfnService } from '../../../src/services/CfnService';
import { StackOperationEventManager } from '../../../src/stacks/StackOperationEventManager';

describe('StackOperationEventManager', () => {
    let cfnService: CfnService;
    let manager: StackOperationEventManager;

    beforeEach(() => {
        cfnService = {
            describeEvents: vi.fn(),
        } as unknown as CfnService;
        manager = new StackOperationEventManager(cfnService);
    });

    describe('fetchEvents', () => {
        it('should fetch and group events by operation ID', async () => {
            const events: OperationEvent[] = [
                { EventId: '1', OperationId: 'op1', Timestamp: new Date('2024-01-01') },
                { EventId: '2', OperationId: 'op1', Timestamp: new Date('2024-01-02') },
                { EventId: '3', OperationId: 'op2', Timestamp: new Date('2024-01-03') },
            ];
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: events, $metadata: {} });

            const result = await manager.fetchEvents('test-stack');

            expect(result.operations).toHaveLength(2);
            expect(result.operations[0].operationId).toBe('op1');
            expect(result.operations[0].events).toHaveLength(2);
            expect(result.operations[1].operationId).toBe('op2');
            expect(result.operations[1].events).toHaveLength(1);
        });

        it('should sort events within operation by timestamp descending', async () => {
            const events: OperationEvent[] = [
                { EventId: '1', OperationId: 'op1', Timestamp: new Date('2024-01-01') },
                { EventId: '2', OperationId: 'op1', Timestamp: new Date('2024-01-03') },
                { EventId: '3', OperationId: 'op1', Timestamp: new Date('2024-01-02') },
            ];
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: events, $metadata: {} });

            const result = await manager.fetchEvents('test-stack');

            expect(result.operations[0].events[0].EventId).toBe('2');
            expect(result.operations[0].events[1].EventId).toBe('3');
            expect(result.operations[0].events[2].EventId).toBe('1');
        });

        it('should track most recent event ID on first fetch', async () => {
            const events: OperationEvent[] = [
                { EventId: 'newest', OperationId: 'op1', Timestamp: new Date('2024-01-03') },
                { EventId: 'older', OperationId: 'op1', Timestamp: new Date('2024-01-01') },
            ];
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: events, $metadata: {} });

            await manager.fetchEvents('test-stack');
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: [], $metadata: {} });
            const refreshResult = await manager.refresh('test-stack');

            expect(refreshResult.operations).toHaveLength(0);
            expect(refreshResult.gapDetected).toBe(false);
        });

        it('should clear state when switching stacks', async () => {
            const events1: OperationEvent[] = [{ EventId: '1', OperationId: 'op1' }];
            const events2: OperationEvent[] = [{ EventId: '2', OperationId: 'op2' }];
            vi.mocked(cfnService.describeEvents)
                .mockResolvedValueOnce({ OperationEvents: events1, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: events2, $metadata: {} });

            await manager.fetchEvents('stack1');
            const result = await manager.fetchEvents('stack2');

            expect(result.operations[0].operationId).toBe('op2');
        });

        it('should pass nextToken for pagination', async () => {
            vi.mocked(cfnService.describeEvents).mockResolvedValue({
                OperationEvents: [],
                NextToken: 'token123',
                $metadata: {},
            });

            const result = await manager.fetchEvents('test-stack', 'token123');

            expect(cfnService.describeEvents).toHaveBeenCalledWith({
                StackName: 'test-stack',
                NextToken: 'token123',
            });
            expect(result.nextToken).toBe('token123');
        });

        it('should handle events without operation ID', async () => {
            const events: OperationEvent[] = [{ EventId: '1', OperationId: undefined }, { EventId: '2' }];
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: events, $metadata: {} });

            const result = await manager.fetchEvents('test-stack');

            expect(result.operations).toHaveLength(1);
            expect(result.operations[0].operationId).toBe('unknown');
            expect(result.operations[0].events).toHaveLength(2);
        });
    });

    describe('refresh', () => {
        it('should return new events since last fetch', async () => {
            const initialEvents: OperationEvent[] = [
                { EventId: 'old', OperationId: 'op1', Timestamp: new Date('2024-01-01') },
            ];
            const newEvents: OperationEvent[] = [
                { EventId: 'new', OperationId: 'op1', Timestamp: new Date('2024-01-02') },
                { EventId: 'old', OperationId: 'op1', Timestamp: new Date('2024-01-01') },
            ];
            vi.mocked(cfnService.describeEvents)
                .mockResolvedValueOnce({ OperationEvents: initialEvents, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: newEvents, $metadata: {} });

            await manager.fetchEvents('test-stack');
            const result = await manager.refresh('test-stack');

            expect(result.operations).toHaveLength(1);
            expect(result.operations[0].events).toHaveLength(1);
            expect(result.operations[0].events[0].EventId).toBe('new');
            expect(result.gapDetected).toBe(false);
        });

        it('should detect gap when max pages reached', async () => {
            const initialEvents: OperationEvent[] = [{ EventId: 'old', OperationId: 'op1' }];
            vi.mocked(cfnService.describeEvents).mockResolvedValueOnce({
                OperationEvents: initialEvents,
                $metadata: {},
            });

            for (let i = 0; i < 5; i++) {
                vi.mocked(cfnService.describeEvents).mockResolvedValueOnce({
                    OperationEvents: [{ EventId: `new${i}`, OperationId: 'op1' }],
                    NextToken: 'token',
                    $metadata: {},
                });
            }

            await manager.fetchEvents('test-stack');
            const result = await manager.refresh('test-stack');

            expect(result.gapDetected).toBe(true);
        });

        it('should perform full fetch for new stack', async () => {
            const events: OperationEvent[] = [{ EventId: '1', OperationId: 'op1' }];
            vi.mocked(cfnService.describeEvents).mockResolvedValue({ OperationEvents: events, $metadata: {} });

            const result = await manager.refresh('new-stack');

            expect(result.operations).toHaveLength(1);
            expect(result.gapDetected).toBe(false);
        });

        it('should stop at most recent event ID', async () => {
            const initialEvents: OperationEvent[] = [{ EventId: 'marker', OperationId: 'op1' }];
            const newEvents: OperationEvent[] = [
                { EventId: 'new1', OperationId: 'op1' },
                { EventId: 'new2', OperationId: 'op1' },
                { EventId: 'marker', OperationId: 'op1' },
                { EventId: 'old', OperationId: 'op1' },
            ];
            vi.mocked(cfnService.describeEvents)
                .mockResolvedValueOnce({ OperationEvents: initialEvents, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: newEvents, $metadata: {} });

            await manager.fetchEvents('test-stack');
            const result = await manager.refresh('test-stack');

            expect(result.operations[0].events).toHaveLength(2);
            expect(result.operations[0].events[0].EventId).toBe('new1');
            expect(result.operations[0].events[1].EventId).toBe('new2');
        });

        it('should update most recent event ID after refresh', async () => {
            const initialEvents: OperationEvent[] = [{ EventId: 'old', OperationId: 'op1' }];
            const newEvents: OperationEvent[] = [
                { EventId: 'newest', OperationId: 'op1' },
                { EventId: 'old', OperationId: 'op1' },
            ];
            vi.mocked(cfnService.describeEvents)
                .mockResolvedValueOnce({ OperationEvents: initialEvents, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: newEvents, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: [], $metadata: {} });

            await manager.fetchEvents('test-stack');
            await manager.refresh('test-stack');
            const result = await manager.refresh('test-stack');

            expect(result.operations).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('should reset state', async () => {
            const events: OperationEvent[] = [{ EventId: '1', OperationId: 'op1' }];
            vi.mocked(cfnService.describeEvents)
                .mockResolvedValueOnce({ OperationEvents: events, $metadata: {} })
                .mockResolvedValueOnce({ OperationEvents: [], $metadata: {} });

            await manager.fetchEvents('test-stack');
            manager.clear();
            const result = await manager.refresh('test-stack');

            expect(result.operations).toHaveLength(0);
        });
    });
});
