import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager } from '../../../src/utils/SubscriptionManager';

interface TestData {
    setting1: string;
    setting2: number;
    nested: {
        value: boolean;
    };
}

describe('SubscriptionManager', () => {
    let manager: SubscriptionManager<TestData>;

    beforeEach(() => {
        manager = new SubscriptionManager<TestData>();
    });

    describe('addPartialSubscription', () => {
        it('should create subscription and return handle', () => {
            const observer = vi.fn();
            const subscription = manager.addPartialSubscription('setting1', observer);

            expect(subscription).toBeDefined();
            expect(subscription.isActive()).toBe(true);
            expect(typeof subscription.unsubscribe).toBe('function');
        });

        it('should notify immediately with current value when provided', () => {
            const observer = vi.fn();
            const currentValue: TestData = {
                setting1: 'test',
                setting2: 42,
                nested: { value: true },
            };

            manager.addPartialSubscription('setting1', observer, currentValue);

            expect(observer).toHaveBeenCalledWith('test');
        });

        it('should not notify immediately when no current value provided', () => {
            const observer = vi.fn();
            manager.addPartialSubscription('setting1', observer);

            expect(observer).not.toHaveBeenCalled();
        });
    });

    describe('notify', () => {
        it('should notify subscribers when value changes', () => {
            const observer = vi.fn();
            manager.addPartialSubscription('setting1', observer);

            const oldData: TestData = {
                setting1: 'old',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new',
                setting2: 1,
                nested: { value: false },
            };

            manager.notify(newData, oldData);

            expect(observer).toHaveBeenCalledWith('new');
        });

        it('should not notify when value unchanged', () => {
            const observer = vi.fn();
            manager.addPartialSubscription('setting1', observer);

            const data: TestData = {
                setting1: 'same',
                setting2: 1,
                nested: { value: false },
            };

            manager.notify(data, data);

            expect(observer).not.toHaveBeenCalled();
        });

        it('should notify multiple subscribers', () => {
            const observer1 = vi.fn();
            const observer2 = vi.fn();
            manager.addPartialSubscription('setting1', observer1);
            manager.addPartialSubscription('setting1', observer2);

            const oldData: TestData = {
                setting1: 'old',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new',
                setting2: 1,
                nested: { value: false },
            };

            manager.notify(newData, oldData);

            expect(observer1).toHaveBeenCalledWith('new');
            expect(observer2).toHaveBeenCalledWith('new');
        });

        it('should handle observer errors gracefully', () => {
            const errorObserver = vi.fn(() => {
                throw new Error('Observer error');
            });
            const normalObserver = vi.fn();

            manager.addPartialSubscription('setting1', errorObserver);
            manager.addPartialSubscription('setting1', normalObserver);

            const oldData: TestData = {
                setting1: 'old',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new',
                setting2: 1,
                nested: { value: false },
            };

            expect(() => manager.notify(newData, oldData)).not.toThrow();
            expect(normalObserver).toHaveBeenCalledWith('new');
        });

        it('should detect object changes using deep comparison', () => {
            const observer = vi.fn();
            manager.addPartialSubscription('nested', observer);

            const oldData: TestData = {
                setting1: 'same',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'same',
                setting2: 1,
                nested: { value: true },
            };

            manager.notify(newData, oldData);

            expect(observer).toHaveBeenCalledWith({ value: true });
        });
    });

    describe('subscription handle', () => {
        it('should unsubscribe correctly', () => {
            const observer = vi.fn();
            const subscription = manager.addPartialSubscription('setting1', observer);

            subscription.unsubscribe();

            expect(subscription.isActive()).toBe(false);

            const oldData: TestData = {
                setting1: 'old',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new',
                setting2: 1,
                nested: { value: false },
            };

            manager.notify(newData, oldData);

            expect(observer).not.toHaveBeenCalled();
        });
    });

    describe('subscription lifecycle', () => {
        it('should handle multiple subscriptions independently', () => {
            const observer1 = vi.fn();
            const observer2 = vi.fn();
            const sub1 = manager.addPartialSubscription('setting1', observer1);
            const sub2 = manager.addPartialSubscription('setting2', observer2);

            sub1.unsubscribe();

            expect(sub1.isActive()).toBe(false);
            expect(sub2.isActive()).toBe(true);

            const oldData: TestData = {
                setting1: 'old1',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new1',
                setting2: 2,
                nested: { value: false },
            };

            manager.notify(newData, oldData);

            expect(observer1).not.toHaveBeenCalled();
            expect(observer2).toHaveBeenCalledWith(2);
        });
    });

    describe('clear', () => {
        it('should clear all subscriptions', () => {
            const observer1 = vi.fn();
            const observer2 = vi.fn();
            const sub1 = manager.addPartialSubscription('setting1', observer1);
            const sub2 = manager.addPartialSubscription('setting2', observer2);

            manager.clear();

            expect(sub1.isActive()).toBe(false);
            expect(sub2.isActive()).toBe(false);

            const oldData: TestData = {
                setting1: 'old',
                setting2: 1,
                nested: { value: false },
            };
            const newData: TestData = {
                setting1: 'new',
                setting2: 2,
                nested: { value: false },
            };

            manager.notify(newData, oldData);

            expect(observer1).not.toHaveBeenCalled();
            expect(observer2).not.toHaveBeenCalled();
        });
    });
});
