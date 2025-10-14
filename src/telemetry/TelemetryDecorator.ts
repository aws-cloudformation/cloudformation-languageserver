/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Attributes } from '@opentelemetry/api';
import { MetricOptions } from '@opentelemetry/api/build/src/metrics/Metric';
import { TelemetryService } from './TelemetryService';

type TelemetryDecoratorOptions = {
    name?: string;
    scope?: string;
    options?: MetricOptions;
    attributes?: Attributes;
};

type MethodNames = {
    sync: 'trackExecution' | 'measure';
    async: 'trackExecutionAsync' | 'measureAsync';
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction' || Object.prototype.toString.call(fn) === '[object AsyncFunction]';
}

function scopeName(target: any): string {
    const name = (typeof target === 'function' ? target.name : target?.constructor?.name) ?? '';
    return name && name !== 'Object' ? name : 'Unknown';
}

export function Telemetry(target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
        get: () => {
            return TelemetryService.instance.get(scopeName(target));
        },
        enumerable: false,
        configurable: false,
    });
}

function createTelemetryMethodDecorator(methodNames: MethodNames) {
    return function (decoratorOptions?: TelemetryDecoratorOptions) {
        return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
            const originalMethod = descriptor.value;
            const metricName = decoratorOptions?.name ?? propertyKey;
            const scope = scopeName(target);

            if (scope === 'Unknown' && !decoratorOptions?.scope) {
                throw new Error(
                    `@${methodNames.sync}() decorator on standalone function '${propertyKey}' requires explicit scope. ` +
                        `Use: @${methodNames.sync}({ scope: 'YourScopeName' })`,
                );
            }

            descriptor.value = function (this: any, ...args: any[]) {
                const telemetry = TelemetryService.instance.get(decoratorOptions?.scope ?? scope);

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
