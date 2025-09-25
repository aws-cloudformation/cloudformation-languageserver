/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { Attributes } from '@opentelemetry/api';
import { MetricOptions } from '@opentelemetry/api/build/src/metrics/Metric';
import { TelemetryService } from './TelemetryService';

type TelemetryDecoratorOptions = {
    name?: string;
    options?: MetricOptions;
    attributes?: Attributes;
    recordArgs?: boolean;
};

type MethodNames = {
    sync: 'time' | 'trackExecution';
    async: 'timeAsync' | 'trackExecutionAsync';
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
function isAsyncFunction(fn: Function): boolean {
    return fn.constructor.name === 'AsyncFunction' || Object.prototype.toString.call(fn) === '[object AsyncFunction]';
}

function scopeName(target: any): string {
    const name = (typeof target === 'function' ? target.name : target?.constructor?.name) ?? '';
    return name && name !== 'Object' ? name : 'Unknown';
}

function isPrimitive(value: any): boolean {
    const type = typeof value;
    return type === 'string' || type === 'number' || type === 'boolean' || value === null;
}

function getTypeName(value: any): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
}

function sanitizeArgument(baseKey: string, value: any): Attributes {
    if (isPrimitive(value)) {
        return { [baseKey]: value };
    }

    if (Array.isArray(value)) {
        let isAllPrimitive = true;
        const types: string[] = [];

        for (const item of value) {
            types.push(getTypeName(item));
            if (!isPrimitive(item)) {
                isAllPrimitive = false;
            }
        }

        if (isAllPrimitive) {
            return { [baseKey]: value };
        } else {
            return {
                [`${baseKey}_length`]: value.length,
                [`${baseKey}_types`]: types.join(','),
            };
        }
    }

    return { [baseKey]: `[${getTypeName(value)}]` };
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

            descriptor.value = function (this: any, ...args: any[]) {
                const telemetry = TelemetryService.instance.get(scopeName(target));

                const attributes: Attributes = { ...decoratorOptions?.attributes };
                if (decoratorOptions?.recordArgs) {
                    for (const [index, arg] of args.entries()) {
                        const baseKey = `arg_${index}`;
                        const argumentAttributes = sanitizeArgument(baseKey, arg);
                        Object.assign(attributes, argumentAttributes);
                    }
                }

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

export const MeasureLatency = createTelemetryMethodDecorator({
    sync: 'time',
    async: 'timeAsync',
});

export const TrackExecution = createTelemetryMethodDecorator({
    sync: 'trackExecution',
    async: 'trackExecutionAsync',
});
