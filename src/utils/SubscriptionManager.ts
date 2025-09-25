import { diff } from 'deep-object-diff';
import { LoggerFactory } from '../telemetry/LoggerFactory';

export interface PartialDataObserver<T> {
    (newValue: T): unknown;
}

interface SubscriptionEntry<Data> {
    id: string;
    type: 'partial';
    path: keyof Data;
    observer: PartialDataObserver<Data[keyof Data]>;
    isActive: boolean;
}

export interface Subscription {
    unsubscribe(): void;

    isActive(): boolean;
}

export class SubscriptionManager<Data> {
    private readonly subscriptions = new Map<string, SubscriptionEntry<Data>>();
    private nextId = 0;
    private readonly log = LoggerFactory.getLogger(SubscriptionManager);

    /**
     * Add a subscription for changes to a specific settings path
     * Optionally notify immediately with current value
     */
    addPartialSubscription<K extends keyof Data>(
        path: K,
        observer: PartialDataObserver<Data[K]>,
        currentValue?: Data,
    ): Subscription {
        const id = this.generateId();
        const entry: SubscriptionEntry<Data> = {
            id,
            type: 'partial',
            path,
            observer: observer as PartialDataObserver<Data[keyof Data]>,
            isActive: true,
        };

        this.subscriptions.set(id, entry);

        if (currentValue) {
            this.safeNotify(() => observer(currentValue[path]), id);
        }

        return this.createSubscriptionHandle(id);
    }

    /**
     * Remove a subscription by ID
     */
    remove(id: string): void {
        const entry = this.subscriptions.get(id);
        if (entry) {
            entry.isActive = false;
            this.subscriptions.delete(id);
        }
    }

    /**
     * Notify all subscribers of settings changes immediately
     */
    notify(newData: Data, oldData: Data): void {
        this.notifySubscribers(newData, oldData);
    }

    /**
     * Clear all subscriptions
     */
    clear(): void {
        for (const entry of this.subscriptions.values()) {
            entry.isActive = false;
        }
        this.subscriptions.clear();
    }

    /**
     * Generate a unique subscription ID
     */
    private generateId(): string {
        return `sub_${++this.nextId}`;
    }

    /**
     * Create a subscription handle for managing the subscription
     */
    private createSubscriptionHandle(id: string): Subscription {
        return {
            unsubscribe: () => this.remove(id),
            isActive: () => {
                const entry = this.subscriptions.get(id);
                return entry?.isActive ?? false;
            },
        };
    }

    /**
     * Notify all subscribers immediately
     */
    private notifySubscribers(newData: Data, oldData: Data): void {
        for (const entry of this.subscriptions.values()) {
            if (entry.isActive) {
                const newValue = newData[entry.path];
                const oldValue = oldData[entry.path];

                if (this.hasValueChanged(newValue, oldValue)) {
                    this.safeNotify(() => entry.observer(newValue), entry.id);
                }
            }
        }
    }

    /**
     * Safely notify an observer, catching and logging any errors
     */
    private safeNotify(notifyFn: () => void, subscriptionId: string): void {
        try {
            notifyFn();
        } catch (error) {
            this.log.error({ error }, `Error in settings observer (subscription ${subscriptionId})`);
        }
    }

    /**
     * Check if a value has changed using deep comparison for objects
     */
    private hasValueChanged(newValue: unknown, oldValue: unknown): boolean {
        // For primitive values, use strict equality
        if (newValue === oldValue) {
            return false;
        }

        // For objects, use deep comparison
        if (newValue && oldValue && typeof newValue === 'object' && typeof oldValue === 'object') {
            return Object.keys(diff(oldValue, newValue)).length > 0;
        }

        // Different primitive values or one is object and other is not
        return true;
    }
}
