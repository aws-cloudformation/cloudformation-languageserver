import { beforeEach, describe, expect, test } from 'vitest';
import { EventType, UsageTracker } from '../../../src/usageTracker/UsageTracker';

describe('UsageTracker', () => {
    let tracker: UsageTracker;

    beforeEach(() => {
        tracker = new UsageTracker();
    });

    describe('track', () => {
        test('tracks single event', () => {
            tracker.track(EventType.DidDeployment);
            expect(tracker.allUsed(EventType.DidDeployment)).toBe(true);
        });

        test('tracks multiple events', () => {
            tracker.track(EventType.DidDeployment);
            tracker.track(EventType.DidValidation);
            tracker.track(EventType.DidGetResourceTypes);
            expect(
                tracker.allUsed(EventType.DidDeployment, EventType.DidValidation, EventType.DidGetResourceTypes),
            ).toBe(true);
        });

        test('does not duplicate events', () => {
            tracker.track(EventType.DidDeployment);
            tracker.track(EventType.DidDeployment);
            expect(tracker.allUsed(EventType.DidDeployment)).toBe(true);
        });
    });

    describe('allUsed', () => {
        test('returns true when all events tracked', () => {
            tracker.track(EventType.DidDeployment);
            tracker.track(EventType.DidValidation);
            expect(tracker.allUsed(EventType.DidDeployment, EventType.DidValidation)).toBe(true);
        });

        test('returns false when some events not tracked', () => {
            tracker.track(EventType.DidDeployment);
            expect(tracker.allUsed(EventType.DidDeployment, EventType.DidValidation)).toBe(false);
        });

        test('returns false when no events tracked', () => {
            expect(tracker.allUsed(EventType.DidDeployment)).toBe(false);
        });

        test('returns true for empty list', () => {
            expect(tracker.allUsed()).toBe(true);
        });
    });

    describe('someUsed', () => {
        test('returns true when at least one event tracked', () => {
            tracker.track(EventType.DidDeployment);
            expect(
                tracker.someUsed(EventType.DidDeployment, EventType.DidValidation, EventType.DidGetResourceTypes),
            ).toBe(true);
        });

        test('returns false when no events tracked', () => {
            expect(tracker.someUsed(EventType.DidDeployment, EventType.DidValidation)).toBe(false);
        });

        test('returns true when all events tracked', () => {
            tracker.track(EventType.DidDeployment);
            tracker.track(EventType.DidValidation);
            tracker.track(EventType.DidGetResourceTypes);
            expect(
                tracker.someUsed(EventType.DidDeployment, EventType.DidValidation, EventType.DidGetResourceTypes),
            ).toBe(true);
        });

        test('returns false for empty list', () => {
            expect(tracker.someUsed()).toBe(false);
        });
    });
});
