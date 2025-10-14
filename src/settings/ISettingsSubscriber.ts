import { Configurable } from '../utils/Configurable';
import { PartialDataObserver, Subscription } from '../utils/SubscriptionManager';
import { Settings } from './Settings';

export type SettingsPathKey = keyof Settings;
export type SettingsSubscription = Subscription<void>;
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface SettingsConfigurable extends Configurable<ISettingsSubscriber> {}

export interface ISettingsSubscriber {
    subscribe<K extends SettingsPathKey>(path: K, observer: PartialDataObserver<Settings[K]>): SettingsSubscription;

    getCurrentSettings(): Settings;
}
