import { stringToBoolean } from '../../utils/String';
import { toNumber } from '../../utils/TypeConverters';
import { coerceParameterToTypedValues, ParameterType, ParameterValueType } from './parameter/ParameterType';
import { CfnIntrinsicFunction, CfnValue, EntityType, MappingValueType } from './SemanticTypes';

export abstract class Entity {
    private _keys!: ReadonlyArray<string>;
    readonly [key: string]: unknown;

    protected constructor(public readonly entityType: EntityType) {}

    get keys() {
        if (this._keys) {
            return this._keys;
        }
        this._keys = Object.getOwnPropertyNames(this).filter(
            (key) => key !== 'entityType' && key !== 'name' && key !== 'value' && typeof this[key] !== 'function',
        );
        return this._keys;
    }

    record() {
        const record: Record<string, unknown> = {};
        for (const key of this.keys) {
            record[key] = this[key as keyof this];
        }

        return record;
    }
}

export class Metadata extends Entity {
    constructor(
        public readonly name: string,
        public readonly value: Record<string, unknown> = {},
    ) {
        super(EntityType.Metadata);
    }
}

export class Output extends Entity {
    constructor(
        public readonly name: string,
        public readonly Value?: CfnValue,
        public readonly Description?: string,
        public readonly Export?: { Name: CfnValue },
        public readonly Condition?: string,
    ) {
        super(EntityType.Output);
    }
}

export class Resource extends Entity {
    constructor(
        public readonly name: string,
        public readonly Type?: string,
        public readonly Properties?: Record<string, CfnValue>,
        public readonly DependsOn?: string | string[],
        public readonly Condition?: string,
        public readonly Metadata?: Record<string, unknown>,
        public readonly CreationPolicy?: Record<string, unknown>,
        public readonly DeletionPolicy?: string,
        public readonly UpdatePolicy?: Record<string, unknown>,
        public readonly UpdateReplacePolicy?: string,
    ) {
        super(EntityType.Resource);
    }
}

export class Transform extends Entity {
    constructor(public readonly value: string | string[]) {
        super(EntityType.Transform);
    }
}

export class Rule extends Entity {
    constructor(
        public readonly name: string,
        public readonly RuleCondition?: CfnIntrinsicFunction,
        public readonly Assertions?: { Assert: CfnIntrinsicFunction; AssertDescription: string }[],
    ) {
        super(EntityType.Rule);
    }
}

export class Parameter extends Entity {
    constructor(
        public readonly name: string,
        public readonly Type?: ParameterType,
        public readonly Default?: ParameterValueType,
        public readonly AllowedPattern?: string,
        public readonly AllowedValues?: ParameterValueType[],
        public readonly ConstraintDescription?: string,
        public readonly Description?: string,
        public readonly MaxLength?: number,
        public readonly MaxValue?: number,
        public readonly MinLength?: number,
        public readonly MinValue?: number,
        public readonly NoEcho?: boolean,
    ) {
        super(EntityType.Parameter);
    }

    static from(
        logicalId: string,
        object: Record<string, string | number | boolean | ParameterType | undefined | unknown[]> | null | undefined,
    ) {
        if (!object) {
            return new Parameter(logicalId);
        }

        const { Default, AllowedValues } = coerceParameterToTypedValues(object);

        return new Parameter(
            logicalId,
            object['Type'] as ParameterType | undefined,
            Default,
            object['AllowedPattern'] as string | undefined,
            AllowedValues,
            object['ConstraintDescription'] as string | undefined,
            object['Description'] as string | undefined,
            object['MaxLength'] === undefined ? undefined : toNumber(object['MaxLength']),
            object['MaxValue'] === undefined ? undefined : toNumber(object['MaxValue']),
            object['MinLength'] === undefined ? undefined : toNumber(object['MinLength']),
            object['MinValue'] === undefined ? undefined : toNumber(object['MinValue']),
            object['NoEcho'] === undefined ? undefined : stringToBoolean(String(object['NoEcho'])),
        );
    }
}

export class Mapping extends Entity {
    constructor(
        public readonly name: string,
        public readonly value: Record<string, Record<string, MappingValueType>> = {},
    ) {
        super(EntityType.Mapping);
    }

    public getTopLevelKeys(): string[] {
        return Object.keys(this.value);
    }

    public getSecondLevelKeys(topLevelKey?: string): string[] {
        if (topLevelKey === undefined) {
            const allKeys = new Set<string>();
            const topLevelKeys = this.getTopLevelKeys();

            for (const tlKey of topLevelKeys) {
                const keys = this.getSecondLevelKeys(tlKey);
                for (const key of keys) allKeys.add(key);
            }
            return [...allKeys];
        } else {
            if (this.value[topLevelKey]) {
                return Object.keys(this.value[topLevelKey]);
            }
        }
        return [];
    }

    public getValue(topLevelKey: string, secondLevelKey: string): MappingValueType | undefined {
        return this.value[topLevelKey]?.[secondLevelKey];
    }
}

export class Condition extends Entity {
    constructor(
        public readonly name: string,
        public readonly value: CfnIntrinsicFunction,
    ) {
        super(EntityType.Condition);
    }
}

export class Unknown extends Entity {
    constructor(public readonly value?: unknown) {
        super(EntityType.Unknown);
    }
}

export class ForEachResource extends Entity {
    constructor(
        public readonly name: string,
        public readonly identifier: string,
        public readonly collection: CfnValue,
        public readonly resource: Resource,
    ) {
        super(EntityType.ForEachResource);
    }
}
