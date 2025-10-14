/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Attributes } from '@opentelemetry/api';
import { MetricOptions } from '@opentelemetry/api/build/src/metrics/Metric';
import { TelemetryService } from './TelemetryService';

type ScopeDecoratorOptions = {
    scope?: string;
};
type ScopedMetricsDecoratorOptions = {
    name: string;
    options?: MetricOptions;
    attributes?: Attributes;
} & ScopeDecoratorOptions;

type MethodNames = {
    sync: 'trackExecution' | 'measure';
    async: 'trackExecutionAsync' | 'measureAsync';
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction' || Object.prototype.toString.call(fn) === '[object AsyncFunction]';
}

function scopeName(target: any, providedScope?: string): string {
    if (providedScope !== undefined) {
        return providedScope;
    }
    const name = (typeof target === 'function' ? target.name : target?.constructor?.name) ?? '';
    if (name && name !== 'Object') {
        return name;
    }

    throw new Error(`Scope could not be derived from target ${target} and providedScope ${providedScope}`);
}

export function Telemetry(decoratorOptions?: ScopeDecoratorOptions) {
    return function (target: any, propertyKey: string) {
        Object.defineProperty(target, propertyKey, {
            get: () => {
                return TelemetryService.instance.get(scopeName(target, decoratorOptions?.scope));
            },
            enumerable: false,
            configurable: false,
        });
    };
}

function createTelemetryMethodDecorator(methodNames: MethodNames) {
    return function (decoratorOptions: ScopedMetricsDecoratorOptions) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalMethod = descriptor.value;
            const metricName = decoratorOptions.name;

            descriptor.value = function (this: any, ...args: any[]) {
                const telemetry = TelemetryService.instance.get(scopeName(target, decoratorOptions.scope));

                const attributes: Attributes = { ...decoratorOptions?.attributes };

                if (isAsyncFunction(originalMethod)) {
                    const asyncMethod = telemetry[methodNames.async].bind(telemetry);
                    return asyncMethod(
                        metricName,
                        () => originalMethod.apply(this, args),
                        decoratorOptions?.options,
                        attributes,
                    );
                } else {
                    const syncMethod = telemetry[methodNames.sync].bind(telemetry);
                    return syncMethod(
                        metricName,
                        () => originalMethod.apply(this, args),
                        decoratorOptions?.options,
                        attributes,
                    );
                }
            };

            return descriptor;
        };
    };
}

export const Track = createTelemetryMethodDecorator({
    sync: 'trackExecution',
    async: 'trackExecutionAsync',
});

export const Measure = createTelemetryMethodDecorator({
    sync: 'measure',
    async: 'measureAsync',
});
