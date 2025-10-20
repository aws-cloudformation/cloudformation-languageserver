export const updateReplacePolicyValueDocsMap: ReadonlyMap<string, string> = getUpdateReplacePolicyValueDocsMap();

function getUpdateReplacePolicyValueDocsMap(): Map<string, string> {
    const docsMap = new Map<string, string>();

    docsMap.set(
        'Delete',
        [
            '**Delete**',
            '\n',
            '---',
            'CloudFormation deletes the resource and all its content if applicable during resource replacement. ',
            'You can add this policy to any resource type. ',
            "By default, if you don't specify an `UpdateReplacePolicy`, CloudFormation deletes your resources during replacement. ",
            'However, be aware of the following consideration:',
            '\n',
            'For Amazon S3 buckets, you must delete all objects in the bucket for deletion to succeed.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)',
        ].join('\n'),
    );

    docsMap.set(
        'Retain',
        [
            '**Retain**',
            '\n',
            '---',
            'CloudFormation keeps the resource without deleting the resource or its contents when the resource is replaced. ',
            'You can add this policy to any resource type. ',
            'Resources that are retained continue to exist and continue to incur applicable charges until you delete those resources. ',
            '\n',
            "If a resource is replaced, the `UpdateReplacePolicy` retains the old physical resource but removes it from CloudFormation's scope. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)',
        ].join('\n'),
    );

    docsMap.set(
        'Snapshot',
        [
            '**Snapshot**',
            '\n',
            '---',
            'For resources that support snapshots, CloudFormation creates a snapshot for the resource before deleting it. ',
            'Snapshots that are created with this policy continue to exist and continue to incur applicable charges until you delete those snapshots. ',
            '\n',
            "**Note:** If you specify the `Snapshot` option for a resource that doesn't support snapshots, CloudFormation reverts to the default option, which is `Delete`.",
            '\n',
            'Resources that support snapshots include:',
            '\n',
            '- [AWS::EC2::Volume](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-volume.html)',
            '- [AWS::ElastiCache::CacheCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-cachecluster.html)',
            '- [AWS::ElastiCache::ReplicationGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-replicationgroup.html)',
            '- [AWS::Neptune::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-neptune-dbcluster.html)',
            '- [AWS::RDS::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbcluster.html)',
            '- [AWS::RDS::DBInstance](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html)',
            '- [AWS::Redshift::Cluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-redshift-cluster.html)',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-updatereplacepolicy.html)',
        ].join('\n'),
    );

    return docsMap;
}

export const UPDATE_REPLACE_POLICY_SNAPSHOT_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::EC2::Volume',
    'AWS::ElastiCache::CacheCluster',
    'AWS::ElastiCache::ReplicationGroup',
    'AWS::Neptune::DBCluster',
    'AWS::RDS::DBCluster',
    'AWS::RDS::DBInstance',
    'AWS::Redshift::Cluster',
];

export const UPDATE_REPLACE_POLICY_VALUES: ReadonlyArray<string> = ['Delete', 'Retain', 'Snapshot'];

export function supportsSnapshotOnReplace(resourceType: string): boolean {
    return UPDATE_REPLACE_POLICY_SNAPSHOT_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function isValidUpdateReplacePolicyValue(value: string): boolean {
    return UPDATE_REPLACE_POLICY_VALUES.includes(value);
}
