import {
    ResourceAttribute,
    CreationPolicyProperty,
    ResourceSignalProperty,
    AutoScalingCreationPolicyProperty,
} from '../../context/CloudFormationEnums';

export const creationPolicyPropertyDocsMap: ReadonlyMap<string, string> = getCreationPolicyPropertyDocsMap();

function getCreationPolicyPropertyDocsMap(): Map<string, string> {
    const docsMap = new Map<string, string>();

    // ResourceSignal properties (universal - all 4 resource types)
    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}`,
        [
            '**ResourceSignal**',
            '\n',
            '---',
            'When CloudFormation creates the associated resource, configures the number of required success signals and the length of time that CloudFormation waits for those signals.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html#aws-attribute-creationpolicy-resourcesignal)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Count}`,
        [
            '**Count**',
            '\n',
            '---',
            'The number of success signals CloudFormation must receive before it sets the resource status as CREATE_COMPLETE.',
            "If the resource receives a failure signal or doesn't receive the specified number of signals before the timeout period expires, the resource creation fails and CloudFormation rolls the stack back.",
            '\n',
            '*Default*: 1',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html#aws-attribute-creationpolicy-resourcesignal)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.ResourceSignal}.${ResourceSignalProperty.Timeout}`,
        [
            '**Timeout**',
            '\n',
            '---',
            'The length of time that CloudFormation waits for the number of signals that was specified in the Count property.',
            'The timeout period starts after CloudFormation stabilizes the resource, and the timeout expires no sooner than the time you specify but can occur shortly thereafter.',
            'The maximum time that you can specify is 12 hours.',
            '\n',
            '*Default*: PT5M (5 minutes)',
            '\n',
            '*Type*: String',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html#aws-attribute-creationpolicy-resourcesignal)',
        ].join('\n'),
    );

    // AutoScalingCreationPolicy properties (AutoScaling Groups and EC2 Instances only)
    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.AutoScalingCreationPolicy}`,
        [
            '**AutoScalingCreationPolicy**',
            '\n',
            '---',
            "For a new Amazon EC2 Auto Scaling group, specifies the number of instances that must signal success before setting the group's status to CREATE_COMPLETE.",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html#aws-attribute-creationpolicy-autoscalingcreationpolicy)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.AutoScalingCreationPolicy}.${AutoScalingCreationPolicyProperty.MinSuccessfulInstancesPercent}`,
        [
            '**MinSuccessfulInstancesPercent**',
            '\n',
            '---',
            "Specifies the percentage of instances in an Amazon EC2 Auto Scaling group that must signal success before setting the group's status to CREATE_COMPLETE.",
            'You can specify a value from 0 to 100.',
            'CloudFormation rounds to the nearest tenth of a percent.',
            'For example, if you create five instances with a minimum successful percentage of 50, three instances must signal success.',
            "If an instance doesn't send a signal within the time specified by the Timeout property, CloudFormation assumes that the instance wasn't created.",
            '\n',
            '*Default*: 100',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html#aws-attribute-creationpolicy-autoscalingcreationpolicy)',
        ].join('\n'),
    );

    // AppStream Fleet properties (AWS::AppStream::Fleet only)
    docsMap.set(
        `${ResourceAttribute.CreationPolicy}.${CreationPolicyProperty.StartFleet}`,
        [
            '**StartFleet**',
            '\n',
            '---',
            'Starts the specified fleet. ',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html)',
        ].join('\n'),
    );

    return docsMap;
}

export const CREATION_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::AutoScaling::AutoScalingGroup',
    'AWS::EC2::Instance',
    'AWS::CloudFormation::WaitCondition',
    'AWS::AppStream::Fleet',
];

export const AUTO_SCALING_CREATION_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::AutoScaling::AutoScalingGroup',
    'AWS::EC2::Instance',
];

export const START_FLEET_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = ['AWS::AppStream::Fleet'];

export function supportsCreationPolicy(resourceType: string): boolean {
    return CREATION_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsAutoScalingCreationPolicy(resourceType: string): boolean {
    return AUTO_SCALING_CREATION_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsStartFleet(resourceType: string): boolean {
    return START_FLEET_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export interface CreationPolicyPropertySchema {
    type: 'object' | 'simple';
    supportedResourceTypes?: ReadonlyArray<string>;
    properties?: Record<string, CreationPolicyPropertySchema>;
}

export const CREATION_POLICY_SCHEMA: Record<string, CreationPolicyPropertySchema> = {
    [CreationPolicyProperty.ResourceSignal]: {
        type: 'object',
        properties: {
            [ResourceSignalProperty.Count]: { type: 'simple' },
            [ResourceSignalProperty.Timeout]: { type: 'simple' },
        },
    },
    [CreationPolicyProperty.AutoScalingCreationPolicy]: {
        type: 'object',
        supportedResourceTypes: AUTO_SCALING_CREATION_POLICY_SUPPORTED_RESOURCE_TYPES,
        properties: {
            [AutoScalingCreationPolicyProperty.MinSuccessfulInstancesPercent]: { type: 'simple' },
        },
    },
    [CreationPolicyProperty.StartFleet]: {
        type: 'simple',
        supportedResourceTypes: START_FLEET_SUPPORTED_RESOURCE_TYPES,
    },
};
