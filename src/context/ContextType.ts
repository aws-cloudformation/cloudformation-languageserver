export enum TopLevelSection {
    Resources = 'Resources',
    Parameters = 'Parameters',
    Outputs = 'Outputs',
    Mappings = 'Mappings',
    Metadata = 'Metadata',
    Rules = 'Rules',
    Conditions = 'Conditions',
    Transform = 'Transform',
    AWSTemplateFormatVersion = 'AWSTemplateFormatVersion',
    Description = 'Description',
}

export enum IntrinsicFunction {
    Base64 = 'Fn::Base64',
    Cidr = 'Fn::Cidr',
    FindInMap = 'Fn::FindInMap',
    ForEach = 'Fn::ForEach',
    GetAtt = 'Fn::GetAtt',
    GetAZs = 'Fn::GetAZs',
    ImportValue = 'Fn::ImportValue',
    Join = 'Fn::Join',
    Length = 'Fn::Length',
    Select = 'Fn::Select',
    Split = 'Fn::Split',
    Sub = 'Fn::Sub',
    ToJsonString = 'Fn::ToJsonString',
    Transform = 'Fn::Transform',
    Ref = 'Ref',
    And = 'Fn::And',
    Equals = 'Fn::Equals',
    If = 'Fn::If',
    Not = 'Fn::Not',
    Or = 'Fn::Or',
    Contains = 'Fn::Contains',
    EachMemberEquals = 'Fn::EachMemberEquals',
    EachMemberIn = 'Fn::EachMemberIn',
    RefAll = 'Fn::RefAll',
    ValueOf = 'Fn::ValueOf',
    ValueOfAll = 'Fn::ValueOfAll',
    Implies = 'Fn::Implies',
}

export const IntrinsicsUsingConditionKeyword: ReadonlyArray<IntrinsicFunction> = [
    IntrinsicFunction.And,
    IntrinsicFunction.Or,
    IntrinsicFunction.Not,
    IntrinsicFunction.Equals,
];

export enum PseudoParameter {
    AWSAccountId = 'AWS::AccountId',
    AWSRegion = 'AWS::Region',
    AWSStackId = 'AWS::StackId',
    AWSStackName = 'AWS::StackName',
    AWSNotificationARNs = 'AWS::NotificationARNs',
    AWSNoValue = 'AWS::NoValue',
    AWSPartition = 'AWS::Partition',
    AWSURLSuffix = 'AWS::URLSuffix',
}

export enum ResourceAttribute {
    CreationPolicy = 'CreationPolicy',
    DeletionPolicy = 'DeletionPolicy',
    UpdatePolicy = 'UpdatePolicy',
    UpdateReplacePolicy = 'UpdateReplacePolicy',
    Condition = 'Condition',
    DependsOn = 'DependsOn',
    Metadata = 'Metadata',
}

export enum CreationPolicyProperty {
    ResourceSignal = 'ResourceSignal',
    AutoScalingCreationPolicy = 'AutoScalingCreationPolicy',
    StartFleet = 'StartFleet',
}

export enum ResourceSignalProperty {
    Count = 'Count',
    Timeout = 'Timeout',
}

export enum AutoScalingCreationPolicyProperty {
    MinSuccessfulInstancesPercent = 'MinSuccessfulInstancesPercent',
}

export const Intrinsics: ReadonlyArray<string> = Object.values(IntrinsicFunction);
export const PseudoParameters: ReadonlyArray<string> = Object.values(PseudoParameter);
export const TopLevelSections: ReadonlyArray<string> = Object.values(TopLevelSection);
export const ResourceAttributes: ReadonlyArray<string> = Object.values(ResourceAttribute);
export const TopLevelSectionsWithLogicalIds: ReadonlyArray<string> = [
    TopLevelSection.Resources,
    TopLevelSection.Parameters,
    TopLevelSection.Outputs,
    TopLevelSection.Mappings,
    TopLevelSection.Metadata,
    TopLevelSection.Rules,
    TopLevelSection.Conditions,
];

export const IntrinsicsSet: ReadonlySet<string> = new Set(Intrinsics);
export const PseudoParametersSet: ReadonlySet<string> = new Set(PseudoParameters);
export const TopLevelSectionsSet: ReadonlySet<string> = new Set(TopLevelSections);
export const ResourceAttributesSet: ReadonlySet<string> = new Set(ResourceAttributes);
export const TopLevelSectionsWithLogicalIdsSet: ReadonlySet<string> = new Set(TopLevelSectionsWithLogicalIds);
