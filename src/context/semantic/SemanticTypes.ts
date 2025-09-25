import { Condition } from './Entity';

export enum EntityType {
    Metadata = 'Metadata',
    Output = 'Output',
    Resource = 'Resource',
    Transform = 'Transform',
    Rule = 'Rule',
    Condition = 'Condition',
    Mapping = 'Mapping',
    Parameter = 'Parameter',
    Unknown = 'Unknown',
}

type Ref = { Ref: string };
type FnBase64 = { 'Fn::Base64': CfnValue };
type FnCidr = { 'Fn::Cidr': [CfnValue<string>, CfnValue<number>, CfnValue<string>] };
type FnFindInMap = { 'Fn::FindInMap': [CfnValue<string>, CfnValue<string>, CfnValue<string>] };
type FnForEach = { 'Fn::ForEach': [string, CfnValue<string[]>, string] };
type FnGetAtt = { 'Fn::GetAtt': [string, string] };
type FnGetAZs = { 'Fn::GetAZs': CfnValue<string> };
type FnImportValue = { 'Fn::ImportValue': CfnValue };
type FnJoin = { 'Fn::Join': [string, CfnValue<unknown[]>] };
type FnLength = { 'Fn::Length': CfnValue<unknown[]> };
type FnSelect = { 'Fn::Select': [CfnValue<string | number>, CfnValue<unknown[]>] };
type FnSplit = { 'Fn::Split': [string, CfnValue<string>] };
type FnSub = { 'Fn::Sub': string | [string, Record<string, CfnValue>] };
type FnToJsonString = { 'Fn::ToJsonString': Record<string, unknown> | CfnValue<unknown[]> };
type FnTransform = { 'Fn::Transform': { Name: string; Parameters: Record<string, CfnValue> } };
type FnAnd = { 'Fn::And': (Condition | CfnIntrinsicFunction)[] };
type FnEquals = { 'Fn::Equals': [CfnValue, CfnValue] };
type FnIf = { 'Fn::If': [string, CfnValue, CfnValue] };
type FnNot = { 'Fn::Not': [Condition | CfnIntrinsicFunction] };
type FnOr = { 'Fn::Or': (Condition | CfnIntrinsicFunction)[] };

export type CfnIntrinsicFunction =
    | Ref
    | FnBase64
    | FnCidr
    | FnFindInMap
    | FnForEach
    | FnGetAtt
    | FnGetAZs
    | FnImportValue
    | FnJoin
    | FnLength
    | FnSelect
    | FnSplit
    | FnSub
    | FnToJsonString
    | FnTransform
    | FnAnd
    | FnEquals
    | FnIf
    | FnNot
    | FnOr;

export type CfnValue<T = string | number | boolean> = T | CfnIntrinsicFunction;
export type MappingValueType = string | number | string[];
