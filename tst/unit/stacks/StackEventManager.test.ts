import { StackEvent, ResourceStatus } from '@aws-sdk/client-cloudformation';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CfnService } from '../../../src/services/CfnService';
import { StackEventManager } from '../../../src/stacks/StackEventManager';

describe('StackEventManager', () => {
    let manager: StackEventManager;
    let mockCfnService: CfnService;

    const createEvent = (id: string, timestamp: Date, resourceId: string, status: ResourceStatus): StackEvent => ({
        EventId: id,
        StackId: 'stack-123',
        StackName: 'TestStack',
        LogicalResourceId: resourceId,
        PhysicalResourceId: `physical-${resourceId}`,
        ResourceType: 'AWS::S3::Bucket',
        Timestamp: timestamp,
        ResourceStatus: status,
    });

    beforeEach(() => {
        mockCfnService = {
            describeStackEvents: vi.fn(),
        } as any;
        manager = new StackEventManager(mockCfnService);
        vi.clearAllMocks();
    });

    describe('fetchEvents', () => {
        it('fetches initial page of events', async () => {
            const events = [
                createEvent('event-1', new Date('2025-01-01T10:00:00Z'), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-2', new Date('2025-01-01T09:00:00Z'), 'Bucket2', ResourceStatus.CREATE_IN_PROGRESS),
            ];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({
                StackEvents: events,
                NextToken: 'token-1',
            });

            const result = await manager.fetchEvents('TestStack');

            expect(mockCfnService.describeStackEvents).toHaveBeenCalledWith(
                { StackName: 'TestStack' },
                { nextToken: undefined },
            );
            expect(result.events).toHaveLength(2);
            expect(result.nextToken).toBe('token-1');
        });

        it('fetch next page with token', async () => {
            const firstPage = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            const secondPage = [createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE)];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: firstPage, NextToken: 'token-1' })
                .mockResolvedValueOnce({ StackEvents: secondPage, NextToken: undefined });

            await manager.fetchEvents('TestStack');
            const result = await manager.fetchEvents('TestStack', 'token-1');

            expect(mockCfnService.describeStackEvents).toHaveBeenCalledWith(
                { StackName: 'TestStack' },
                { nextToken: 'token-1' },
            );
            expect(result.events).toHaveLength(1);
            expect(result.events[0].EventId).toBe('event-2');
        });

        it('track most recent event ID on initial fetch', async () => {
            const events = [
                createEvent(
                    'event-newest',
                    new Date('2025-01-01T12:00:00Z'),
                    'Bucket1',
                    ResourceStatus.CREATE_COMPLETE,
                ),
                createEvent('event-older', new Date('2025-01-01T11:00:00Z'), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
            ];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });

            await manager.fetchEvents('TestStack');

            // Verify by calling refresh - it should look for event-newest
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({
                StackEvents: [createEvent('event-newest', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)],
            });
            const refreshResult = await manager.refresh('TestStack');
            expect(refreshResult).toHaveLength(0);
        });

        it('clear cache when switching stacks', async () => {
            const stack1Events = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            const stack2Events = [createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE)];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: stack1Events })
                .mockResolvedValueOnce({ StackEvents: stack2Events });

            await manager.fetchEvents('Stack1');
            const result = await manager.fetchEvents('Stack2');

            expect(result.events).toHaveLength(1);
            expect(result.events[0].EventId).toBe('event-2');
        });

        it('handle events without EventId', async () => {
            const events = [
                createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
                { StackName: 'TestStack', Timestamp: new Date() } as StackEvent,
            ];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });

            const result = await manager.fetchEvents('TestStack');

            expect(result.events).toHaveLength(2);
        });
    });

    describe('refresh', () => {
        it('return empty array when no new events', async () => {
            const initialEvents = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: initialEvents });

            await manager.fetchEvents('TestStack');
            const newEvents = await manager.refresh('TestStack');

            expect(newEvents).toHaveLength(0);
        });

        it('fetch new events since last refresh', async () => {
            const initialEvents = [
                createEvent('event-2', new Date('2025-01-01T10:00:00Z'), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-1', new Date('2025-01-01T09:00:00Z'), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];
            const newEvents = [
                createEvent('event-4', new Date('2025-01-01T12:00:00Z'), 'Bucket4', ResourceStatus.UPDATE_COMPLETE),
                createEvent('event-3', new Date('2025-01-01T11:00:00Z'), 'Bucket3', ResourceStatus.UPDATE_IN_PROGRESS),
                createEvent('event-2', new Date('2025-01-01T10:00:00Z'), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: newEvents });

            await manager.fetchEvents('TestStack');
            const result = await manager.refresh('TestStack');

            expect(result).toHaveLength(2);
            expect(result[0].EventId).toBe('event-4');
            expect(result[1].EventId).toBe('event-3');
        });

        it('exhaust up to 5 pages to find last event', async () => {
            const initialEvents = [
                createEvent('event-old', new Date('2025-01-01T09:00:00Z'), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            const page1 = [createEvent('event-5', new Date(), 'Bucket5', ResourceStatus.CREATE_COMPLETE)];
            const page2 = [createEvent('event-4', new Date(), 'Bucket4', ResourceStatus.CREATE_COMPLETE)];
            const page3 = [createEvent('event-3', new Date(), 'Bucket3', ResourceStatus.CREATE_COMPLETE)];
            const page4 = [createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE)];
            const page5 = [
                createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-old', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: page1, NextToken: 'token-1' })
                .mockResolvedValueOnce({ StackEvents: page2, NextToken: 'token-2' })
                .mockResolvedValueOnce({ StackEvents: page3, NextToken: 'token-3' })
                .mockResolvedValueOnce({ StackEvents: page4, NextToken: 'token-4' })
                .mockResolvedValueOnce({ StackEvents: page5 });

            await manager.fetchEvents('TestStack');
            const result = await manager.refresh('TestStack');

            expect(mockCfnService.describeStackEvents).toHaveBeenCalledTimes(6);
            expect(result).toHaveLength(5);
            expect(result[0].EventId).toBe('event-5');
            expect(result[4].EventId).toBe('event-1');
        });

        it('stop after 5 pages even if last event not found', async () => {
            const initialEvents = [createEvent('event-old', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({
                    StackEvents: [createEvent('event-5', new Date(), 'Bucket5', ResourceStatus.CREATE_COMPLETE)],
                    NextToken: 'token-1',
                })
                .mockResolvedValueOnce({
                    StackEvents: [createEvent('event-4', new Date(), 'Bucket4', ResourceStatus.CREATE_COMPLETE)],
                    NextToken: 'token-2',
                })
                .mockResolvedValueOnce({
                    StackEvents: [createEvent('event-3', new Date(), 'Bucket3', ResourceStatus.CREATE_COMPLETE)],
                    NextToken: 'token-3',
                })
                .mockResolvedValueOnce({
                    StackEvents: [createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE)],
                    NextToken: 'token-4',
                })
                .mockResolvedValueOnce({
                    StackEvents: [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)],
                    NextToken: 'token-5',
                });

            await manager.fetchEvents('TestStack');
            const result = await manager.refresh('TestStack');

            expect(mockCfnService.describeStackEvents).toHaveBeenCalledTimes(6);
            expect(result).toHaveLength(5);
        });

        it('stop when no more pages available', async () => {
            const initialEvents = [createEvent('event-old', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            const newEvents = [
                createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: newEvents, NextToken: undefined });

            await manager.fetchEvents('TestStack');
            const result = await manager.refresh('TestStack');

            expect(mockCfnService.describeStackEvents).toHaveBeenCalledTimes(2);
            expect(result).toHaveLength(2);
        });

        it('update most recent event ID after refresh', async () => {
            const initialEvents = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            const refreshEvents = [
                createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: refreshEvents })
                .mockResolvedValueOnce({ StackEvents: refreshEvents });

            await manager.fetchEvents('TestStack');
            await manager.refresh('TestStack');
            const secondRefresh = await manager.refresh('TestStack');

            expect(secondRefresh).toHaveLength(0);
        });

        it('fetch initial events if stack name changes', async () => {
            const stack1Events = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            const stack2Events = [createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE)];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: stack1Events })
                .mockResolvedValueOnce({ StackEvents: stack2Events });

            await manager.fetchEvents('Stack1');
            const result = await manager.refresh('Stack2');

            expect(result).toHaveLength(1);
            expect(result[0].EventId).toBe('event-2');
        });
    });

    describe('clear', () => {
        it('clear all cached data', async () => {
            const events = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });

            await manager.fetchEvents('TestStack');
            manager.clear();

            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });
            const result = await manager.fetchEvents('TestStack');

            expect(result.events).toHaveLength(1);
        });

        it('allow fetching events after clear', async () => {
            const events = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });

            await manager.fetchEvents('TestStack');
            manager.clear();

            const result = await manager.fetchEvents('TestStack');
            expect(result.events).toHaveLength(1);
        });
    });

    describe('real-world scenarios', () => {
        it('handle stack deployment lifecycle', async () => {
            // Initial state: stack creating
            const initialEvents = [
                createEvent(
                    'event-2',
                    new Date('2025-01-01T10:01:00Z'),
                    'TestStack',
                    ResourceStatus.CREATE_IN_PROGRESS,
                ),
                createEvent('event-1', new Date('2025-01-01T10:00:00Z'), 'Bucket1', ResourceStatus.CREATE_IN_PROGRESS),
            ];

            // After refresh: bucket created
            const refresh1Events = [
                createEvent('event-3', new Date('2025-01-01T10:02:00Z'), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
                createEvent(
                    'event-2',
                    new Date('2025-01-01T10:01:00Z'),
                    'TestStack',
                    ResourceStatus.CREATE_IN_PROGRESS,
                ),
            ];

            // After second refresh: stack complete
            const refresh2Events = [
                createEvent('event-4', new Date('2025-01-01T10:03:00Z'), 'TestStack', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-3', new Date('2025-01-01T10:02:00Z'), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: refresh1Events })
                .mockResolvedValueOnce({ StackEvents: refresh2Events });

            await manager.fetchEvents('TestStack');
            const newEvents1 = await manager.refresh('TestStack');
            expect(newEvents1).toHaveLength(1);
            expect(newEvents1[0].ResourceStatus).toBe(ResourceStatus.CREATE_COMPLETE);

            const newEvents2 = await manager.refresh('TestStack');
            expect(newEvents2).toHaveLength(1);
            expect(newEvents2[0].ResourceStatus).toBe(ResourceStatus.CREATE_COMPLETE);
            expect(newEvents2[0].LogicalResourceId).toBe('TestStack');
        });

        it('handle pagination during active deployment', async () => {
            const initialEvents = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];

            // Many new events across multiple pages
            const page1 = Array.from({ length: 50 }, (_, i) =>
                createEvent(`event-${100 - i}`, new Date(), `Resource${100 - i}`, ResourceStatus.CREATE_COMPLETE),
            );
            const page2 = [
                createEvent('event-2', new Date(), 'Bucket2', ResourceStatus.CREATE_COMPLETE),
                createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE),
            ];

            mockCfnService.describeStackEvents = vi
                .fn()
                .mockResolvedValueOnce({ StackEvents: initialEvents })
                .mockResolvedValueOnce({ StackEvents: page1, NextToken: 'token-1' })
                .mockResolvedValueOnce({ StackEvents: page2 });

            await manager.fetchEvents('TestStack');
            const newEvents = await manager.refresh('TestStack');

            expect(newEvents).toHaveLength(51);
            expect(newEvents[0].EventId).toBe('event-100');
            expect(newEvents[50].EventId).toBe('event-2');
        });

        it('handle view close and reopen', async () => {
            const events = [createEvent('event-1', new Date(), 'Bucket1', ResourceStatus.CREATE_COMPLETE)];
            mockCfnService.describeStackEvents = vi.fn().mockResolvedValue({ StackEvents: events });

            // First view session
            await manager.fetchEvents('TestStack');

            // View closed
            manager.clear();

            // View reopened
            const result = await manager.fetchEvents('TestStack');
            expect(result.events).toHaveLength(1);
        });
    });
});
