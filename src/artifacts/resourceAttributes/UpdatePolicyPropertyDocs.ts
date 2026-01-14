import {
    ResourceAttribute,
    UpdatePolicyProperty,
    AutoScalingRollingUpdateProperty,
    AutoScalingReplacingUpdateProperty,
    AutoScalingScheduledActionProperty,
    CodeDeployLambdaAliasUpdateProperty,
} from '../../context/CloudFormationEnums';

export const updatePolicyPropertyDocsMap: ReadonlyMap<string, string> = getUpdatePolicyPropertyDocsMap();

function getUpdatePolicyPropertyDocsMap(): Map<string, string> {
    const docsMap = new Map<string, string>();

    // AutoScalingRollingUpdate policy and properties
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}`,
        [
            '**AutoScalingRollingUpdate**',
            '\n',
            '---',
            'To perform a rolling update of the instances in an Auto Scaling group rather than wait for scaling activities to gradually replace older instances with newer instances, use the `AutoScalingRollingUpdate` policy. ',
            'This policy provides you the flexibility to specify whether CloudFormation replaces instances that are in an Auto Scaling group in batches or all at once without replacing the entire resource. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MaxBatchSize}`,
        [
            '**MaxBatchSize**',
            '\n',
            '---',
            'Specifies the maximum number of instances that can be replaced simultaneously.',
            '\n',
            '*Default*: 1',
            '\n',
            '*Maximum*: 100',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MinActiveInstancesPercent}`,
        [
            '**MinActiveInstancesPercent**',
            '\n',
            '---',
            "Specifies the percentage of instances in an Auto Scaling group that must be in the `InService` state relative to that group's desired capacity during a rolling update for an update to succeed.",
            'You can specify a value from 0 to 100. ',
            'CloudFormation rounds to the nearest tenth of a percent. ',
            'For example, if you update five instances with a minimum `InService` percentage of 50, at least three instances must be in the `InService` state.',
            "If an instance doesn't transition to the `InService` state within a fixed time of 1 hour, CloudFormation assumes that the instance wasn't updated. ",
            '\n',
            'Setting `MinActiveInstancesPercent` in your `UpdatePolicy` will also affect instances launched when the `DesiredCapacity` property of the `AWS::AutoScaling::AutoScalingGroup` resource is set higher than the current desired capacity of that Auto Scaling group. ',
            '\n',
            '*Default*: 100',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MinInstancesInService}`,
        [
            '**MinInstancesInService**',
            '\n',
            '---',
            'Specifies the minimum number of instances that must be in service within the Auto Scaling group while CloudFormation updates old instances. ',
            'This value must be less than the [MaxSize](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-autoscalinggroup.html#cfn-autoscaling-autoscalinggroup-maxsize) of the Auto Scaling group. ',
            '\n',
            '*Default*: 0',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.MinSuccessfulInstancesPercent}`,
        [
            '**MinSuccessfulInstancesPercent**',
            '\n',
            '---',
            'Specifies the percentage of instances in an Auto Scaling rolling update that must signal success for an update to succeed. ',
            'You can specify a value from 0 to 100. CloudFormation rounds to the nearest tenth of a percent. ',
            "For example, if you update five instances with a minimum successful percentage of 50, three instances must signal success. If an instance doesn't send a signal within the time specified in the `PauseTime` property, CloudFormation assumes that the instance wasn't updated. ",
            '\n',
            'We recommend that you set the value of the `MinSuccessfulInstancesPercent` property to a value greater than 0. ',
            'When the `MinSuccessfulInstancesPercent` property is set to 0, CloudFormation waits for 0% of the capacity instances to be in an `InService` state. ',
            '`MinSuccessfulInstancesPercent` returns immediately and before considering the Auto Scaling group status as `UPDATE_COMPLETE` to move on to the subsequent resources defined in the stack template. ',
            'If other Auto Scaling groups are defined in your CloudFormation template, they will update simultaneously. ',
            'When all Auto Scaling groups are deployed at once with 0% of the capacity instances in an `InService` state, then you will experience availability issues, due to 0 instances serving customer traffic. ',
            '\n',
            '*Default*: 100',
            '\n',
            '*Type*: Integer',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.PauseTime}`,
        [
            '**PauseTime**',
            '\n',
            '---',
            'The amount of time that CloudFormation pauses after making a change to a batch of instances to give those instances time to start software applications. ',
            '\n',
            'Specify PauseTime in the [ISO8601 duration format](https://en.wikipedia.org/wiki/ISO_8601#Durations) (in the format PT#H#M#S, where each # is the number of hours, minutes, and seconds, respectively).',
            'The maximum PauseTime is one hour (PT1H). ',
            '\n',
            '*Default*: PT5M (5 minutes) when the `WaitOnResourceSignals` property is set to true. Otherwise, no default value is set. ',
            '\n',
            '*Type*: String ',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.SuspendProcesses}`,
        [
            '**SuspendProcesses**',
            '\n',
            '---',
            'Specifies the Auto Scaling processes to suspend during a stack update. Suspending processes prevents Auto Scaling from interfering with a stack update. ',
            "For example, you can suspend alarming so that Amazon EC2 Auto Scaling doesn't initiate scaling policies associated with an alarm. ",
            'For valid values, see [Types of processes](https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-suspend-resume-processes.html#process-types) in the *Amazon EC2 Auto Scaling User Guide*. ',
            '\n',
            '*Default*: Not specified',
            '\n',
            '*Type*: List of Auto Scaling processes',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingRollingUpdate}.${AutoScalingRollingUpdateProperty.WaitOnResourceSignals}`,
        [
            '**WaitOnResourceSignals**',
            '\n',
            '---',
            'Specifies whether CloudFormation waits for success signals from new instances before continuing the update. ',
            'CloudFormation waits for the specified `PauseTime` duration for success signals. ',
            '\n',
            'To signal the Auto Scaling group, use the [cfn-signal](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-signal.html) helper script. ',
            'For Auto Scaling groups associated with Elastic Load Balancing, consider adding a health check to ensure that instances are healthy before signaling success by using the [cfn-init](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-init.html) helper script. ',
            'For an example, see the `verify_instance_health` command in the sample templates for Amazon EC2 Auto Scaling rolling updates in our [GitHub repository](https://github.com/aws-cloudformation/aws-cloudformation-templates/tree/main/AutoScaling).',
            '\n',
            '*Default*: false',
            '\n',
            '*Type*: Boolean',
            '\n',
            '*Required*: Conditional. If you specify the `MinSuccessfulInstancesPercent` property, the `WaitOnResourceSignals` property must be set to true.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-rollingupdate)',
        ].join('\n'),
    );

    // AutoScalingReplacingUpdate policy and properties
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingReplacingUpdate}`,
        [
            '**AutoScalingReplacingUpdate**',
            '\n',
            '---',
            'To replace the Auto Scaling group and the instances it contains, use the `AutoScalingReplacingUpdate` policy. ',
            '\n',
            'Before attempting an update, ensure that you have sufficient Amazon EC2 capacity for both your old and new Auto Scaling groups. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-replacingupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingReplacingUpdate}.${AutoScalingReplacingUpdateProperty.WillReplace}`,
        [
            '**WillReplace**',
            '\n',
            '---',
            'Specifies whether an Auto Scaling group and the instances it contains are replaced during an update.',
            'During replacement, CloudFormation retains the old group until it finishes creating the new one. ',
            'If the update fails, CloudFormation can roll back to the old Auto Scaling group and delete the new Auto Scaling group. ',
            '\n',
            "While CloudFormation creates the new group, it doesn't detach or attach any instances. ",
            'After successfully creating the new Auto Scaling group, CloudFormation deletes the old Auto Scaling group during the cleanup process. ',
            '\n',
            'When you set the `WillReplace` parameter, remember to specify a matching [CreationPolicy attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html). ',
            "If the minimum number of instances (specified by the `MinSuccessfulInstancesPercent` property) don't signal success within the `Timeout` period (specified in the `CreationPolicy` attribute), the replacement update fails and CloudFormation rolls back to the old Auto Scaling group. ",
            '\n',
            '*Type*: Boolean',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-replacingupdate)',
        ].join('\n'),
    );

    // AutoScalingScheduledAction policy and properties
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingScheduledAction}`,
        [
            '**AutoScalingScheduledAction**',
            '\n',
            '---',
            'To specify how CloudFormation handles updates for the `MinSize`, `MaxSize`, and `DesiredCapacity` properties when the `AWS::AutoScaling::AutoScalingGroup` resource has an associated scheduled action, use the `AutoScalingScheduledAction` policy. ',
            '\n',
            'With scheduled actions, the group size properties of an Auto Scaling group can change at any time. ',
            'When you update a stack with an Auto Scaling group and scheduled action, CloudFormation always sets the group size property values of your Auto Scaling group to the values that are defined in the `AWS::AutoScaling::AutoScalingGroup` resource of your template, even if a scheduled action is in effect. ',
            '\n',
            "If you don't want CloudFormation to change any of the group size property values when you have a scheduled action in effect, use the `AutoScalingScheduledAction` update policy and set `IgnoreUnmodifiedGroupSizeProperties` to `true` to prevent CloudFormation from changing the `MinSize`, `MaxSize`, or `DesiredCapacity` properties unless you have modified these values in your template. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-scheduledactions)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.AutoScalingScheduledAction}.${AutoScalingScheduledActionProperty.IgnoreUnmodifiedGroupSizeProperties}`,
        [
            '**IgnoreUnmodifiedGroupSizeProperties**',
            '\n',
            '---',
            'If `true`, CloudFormation ignores differences in group size properties between your current Auto Scaling group and the Auto Scaling group described in the `AWS::AutoScaling::AutoScalingGroup` resource of your template during a stack update. ',
            'If you modify any of the group size property values in your template, CloudFormation uses the modified values and updates your Auto Scaling group. ',
            '\n',
            '*Default*: false',
            '\n',
            '*Type*: Boolean',
            '\n',
            '*Required*: No',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-scheduledactions)',
        ].join('\n'),
    );

    // UseOnlineResharding policy (ElastiCache)
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.UseOnlineResharding}`,
        [
            '**UseOnlineResharding**',
            '\n',
            '---',
            "To modify a replication group's shards by adding or removing shards, rather than replacing the entire [AWS::ElastiCache::ReplicationGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-replicationgroup.html) resource, use the `UseOnlineResharding` update policy. ",
            '\n',
            'If `UseOnlineResharding` is set to `true`, you can update the `NumNodeGroups` and `NodeGroupConfiguration` properties of the `AWS::ElastiCache::ReplicationGroup` resource, and CloudFormation will update those properties without interruption. ',
            'When `UseOnlineResharding` is set to false, or not specified, updating the `NumNodeGroups` and `NodeGroupConfiguration` properties results in CloudFormation replacing the entire `AWS::ElastiCache::ReplicationGroup` resource. ',
            '\n',
            'The UseOnlineResharding update policy has no properties. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-useonlineresharding)',
        ].join('\n'),
    );

    // EnableVersionUpgrade policy (OpenSearch/Elasticsearch)
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.EnableVersionUpgrade}`,
        [
            '**EnableVersionUpgrade**',
            '\n',
            '---',
            'To upgrade an OpenSearch Service domain to a new version of OpenSearch or Elasticsearch rather than replacing the entire [AWS::OpenSearchService::Domain](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-opensearchservice-domain.html) or [AWS::Elasticsearch::Domain](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticsearch-domain.html) resource, use the `EnableVersionUpgrade` update policy. ',
            '\n',
            'If `EnableVersionUpgrade` is set to `true`, you can update the `EngineVersion` property of the `AWS::OpenSearchService::Domain` resource (or the `ElasticsearchVersion` property of the legacy `AWS::Elasticsearch::Domain` resource), and CloudFormation will update that property without interruption. ',
            'When `EnableVersionUpgrade` is set to `false`, or not specified, updating the `EngineVersion` or `ElasticsearchVersion` property results in CloudFormation replacing the entire `AWS::OpenSearchService::Domain`/`AWS::Elasticsearch::Domain` resource. ',
            '\n',
            'The `EnableVersionUpgrade` update policy has no properties. ',
            '\n',
            'For more information, see [Upgrading OpenSearch Service domains](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/version-migration.html) in the Amazon OpenSearch Service Developer Guide. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-upgradeopensearchdomain)',
        ].join('\n'),
    );

    // CodeDeployLambdaAliasUpdate policy and properties
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}`,
        [
            '**CodeDeployLambdaAliasUpdate**',
            '\n',
            '---',
            'To perform an CodeDeploy deployment when the version changes on an `AWS::Lambda::Alias` resource, use the `CodeDeployLambdaAliasUpdate` update policy. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-codedeploylambdaaliasupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.ApplicationName}`,
        [
            '**ApplicationName**',
            '\n',
            '---',
            'The name of the CodeDeploy application. ',
            '\n',
            '*Required*: Yes',
            '\n',
            '*Type*: String',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-codedeploylambdaaliasupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.DeploymentGroupName}`,
        [
            '**DeploymentGroupName**',
            '\n',
            '---',
            'The name of the CodeDeploy deployment group. ',
            'This is where the traffic-shifting policy is set. ',
            '\n',
            '*Required*: Yes',
            '\n',
            '*Type*: String',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-codedeploylambdaaliasupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.BeforeAllowTrafficHook}`,
        [
            '**BeforeAllowTrafficHook**',
            '\n',
            '---',
            'The name of the Lambda function to run before traffic routing starts. ',
            '\n',
            '*Required*: No',
            '\n',
            '*Type*: String',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-codedeploylambdaaliasupdate)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.CodeDeployLambdaAliasUpdate}.${CodeDeployLambdaAliasUpdateProperty.AfterAllowTrafficHook}`,
        [
            '**AfterAllowTrafficHook**',
            '\n',
            '---',
            'The name of the Lambda function to run after traffic routing completes. ',
            '\n',
            '*Required*: No',
            '\n',
            '*Type*: String',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-codedeploylambdaaliasupdate)',
        ].join('\n'),
    );

    // AppStream 2.0 Update Policies
    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.StopBeforeUpdate}`,
        [
            '**StopBeforeUpdate**',
            '\n',
            '---',
            'Stops the specified fleet before the update. ',
            '\n',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-appstream)',
        ].join('\n'),
    );

    docsMap.set(
        `${ResourceAttribute.UpdatePolicy}.${UpdatePolicyProperty.StartAfterUpdate}`,
        [
            '**StartAfterUpdate**',
            '\n',
            '---',
            'Starts the specified fleet after the update. ',
            '*Required*: No ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatepolicy.html#cfn-attributes-updatepolicy-appstream)',
        ].join('\n'),
    );

    return docsMap;
}

export const UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::AutoScaling::AutoScalingGroup',
    'AWS::ElastiCache::ReplicationGroup',
    'AWS::OpenSearchService::Domain',
    'AWS::Elasticsearch::Domain',
    'AWS::Lambda::Alias',
    'AWS::AppStream::Fleet',
];

export const AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::AutoScaling::AutoScalingGroup',
];

export const ELASTICACHE_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::ElastiCache::ReplicationGroup',
];

export const OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::OpenSearchService::Domain',
    'AWS::Elasticsearch::Domain',
];

export const LAMBDA_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = ['AWS::Lambda::Alias'];

export const APPSTREAM_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = ['AWS::AppStream::Fleet'];

export function supportsUpdatePolicy(resourceType: string): boolean {
    return UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsAutoScalingUpdatePolicy(resourceType: string): boolean {
    return AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsElastiCacheUpdatePolicy(resourceType: string): boolean {
    return ELASTICACHE_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsOpenSearchUpdatePolicy(resourceType: string): boolean {
    return OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsLambdaUpdatePolicy(resourceType: string): boolean {
    return LAMBDA_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function supportsAppStreamUpdatePolicy(resourceType: string): boolean {
    return APPSTREAM_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export interface UpdatePolicyPropertySchema {
    type: 'object' | 'simple';
    supportedResourceTypes?: ReadonlyArray<string>;
    properties?: Record<string, UpdatePolicyPropertySchema>;
}

export const UPDATE_POLICY_SCHEMA: Record<string, UpdatePolicyPropertySchema> = {
    [UpdatePolicyProperty.AutoScalingRollingUpdate]: {
        type: 'object',
        supportedResourceTypes: AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
        properties: {
            [AutoScalingRollingUpdateProperty.MaxBatchSize]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.MinActiveInstancesPercent]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.MinInstancesInService]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.MinSuccessfulInstancesPercent]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.PauseTime]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.SuspendProcesses]: { type: 'simple' },
            [AutoScalingRollingUpdateProperty.WaitOnResourceSignals]: { type: 'simple' },
        },
    },
    [UpdatePolicyProperty.AutoScalingReplacingUpdate]: {
        type: 'object',
        supportedResourceTypes: AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
        properties: {
            [AutoScalingReplacingUpdateProperty.WillReplace]: { type: 'simple' },
        },
    },
    [UpdatePolicyProperty.AutoScalingScheduledAction]: {
        type: 'object',
        supportedResourceTypes: AUTO_SCALING_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
        properties: {
            [AutoScalingScheduledActionProperty.IgnoreUnmodifiedGroupSizeProperties]: { type: 'simple' },
        },
    },
    [UpdatePolicyProperty.UseOnlineResharding]: {
        type: 'simple',
        supportedResourceTypes: ELASTICACHE_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    },
    [UpdatePolicyProperty.EnableVersionUpgrade]: {
        type: 'simple',
        supportedResourceTypes: OPENSEARCH_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    },
    [UpdatePolicyProperty.CodeDeployLambdaAliasUpdate]: {
        type: 'object',
        supportedResourceTypes: LAMBDA_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
        properties: {
            [CodeDeployLambdaAliasUpdateProperty.ApplicationName]: { type: 'simple' },
            [CodeDeployLambdaAliasUpdateProperty.DeploymentGroupName]: { type: 'simple' },
            [CodeDeployLambdaAliasUpdateProperty.BeforeAllowTrafficHook]: { type: 'simple' },
            [CodeDeployLambdaAliasUpdateProperty.AfterAllowTrafficHook]: { type: 'simple' },
        },
    },
    [UpdatePolicyProperty.StopBeforeUpdate]: {
        type: 'simple',
        supportedResourceTypes: APPSTREAM_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    },
    [UpdatePolicyProperty.StartAfterUpdate]: {
        type: 'simple',
        supportedResourceTypes: APPSTREAM_UPDATE_POLICY_SUPPORTED_RESOURCE_TYPES,
    },
};
