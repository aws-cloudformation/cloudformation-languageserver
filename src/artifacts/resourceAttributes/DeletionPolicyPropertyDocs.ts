export const deletionPolicyValueDocsMap: ReadonlyMap<string, string> = getDeletionPolicyValueDocsMap();

function getDeletionPolicyValueDocsMap(): Map<string, string> {
    const docsMap = new Map<string, string>();

    docsMap.set(
        'Delete',
        [
            '**Delete**',
            '\n',
            '---',
            'CloudFormation deletes the resource and all its content if applicable during stack deletion. ',
            'You can add this deletion policy to any resource type. ',
            "By default, if you don't specify a `DeletionPolicy`, CloudFormation deletes your resources. ",
            'However, be aware of the following considerations:',
            '\n',
            '- For `AWS::RDS::DBCluster` resources, the default policy is `Snapshot`. ',
            "- For `AWS::RDS::DBInstance` resources that don't specify the DBClusterIdentifier property, the default policy is `Snapshot`.",
            '- For Amazon S3 buckets, you must delete all objects in the bucket for deletion to succeed. ',
            '- The default behavior of CloudFormation is to delete the secret with the ForceDeleteWithoutRecovery flag. ',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)',
        ].join('\n'),
    );

    docsMap.set(
        'Retain',
        [
            '**Retain**',
            '\n',
            '---',
            'CloudFormation keeps the resource without deleting the resource or its contents when its stack is deleted. ',
            'You can add this deletion policy to any resource type. ',
            'When CloudFormation completes the stack deletion, the stack will be in `Delete_Complete` state; however, resources that are retained continue to exist and continue to incur applicable charges until you delete those resources. ',
            '\n',
            'For update operations, the following considerations apply: ',
            '\n',
            "- If a resource is deleted, the `DeletionPolicy` retains the physical resource but ensures that it's deleted from CloudFormation's scope. ",
            "- If a resource is updated such that a new physical resource is created to replace the old resource, then the old resource is completely deleted, including from CloudFormation's scope. ",
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)',
        ].join('\n'),
    );

    docsMap.set(
        'RetainExceptOnCreate',
        [
            '**RetainExceptOnCreate**',
            '\n',
            '---',
            '`RetainExceptOnCreate` behaves like `Retain` for stack operations, except for the stack operation that initially created the resource.',
            'If the stack operation that created the resource is rolled back, CloudFormation deletes the resource. ',
            'For all other stack operations, such as stack deletion, CloudFormation retains the resource and its contents. ',
            'The result is that new, empty, and unused resources are deleted, while in-use resources and their data are retained. ',
            'Refer to the [UpdateStack](https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_UpdateStack.html) API documentation to use this deletion policy as an API parameter without updating your template.',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)',
        ].join('\n'),
    );

    docsMap.set(
        'Snapshot',
        [
            '**Snapshot**',
            '\n',
            '---',
            'For resources that support snapshots, CloudFormation creates a snapshot for the resource before deleting it. ',
            'When CloudFormation completes the stack deletion, the stack will be in the `Delete_Complete` state; however, the snapshots that are created with this policy continue to exist and continue to incur applicable charges until you delete those snapshots. ',
            'Resources that support snapshots include: ',
            '\n',
            '- [AWS::DocDB::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-docdb-dbcluster.html)',
            '- [AWS::EC2::Volume](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-volume.html)',
            '- [AWS::ElastiCache::CacheCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-cachecluster.html)',
            '- [AWS::ElastiCache::ReplicationGroup](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-elasticache-replicationgroup.html)',
            '- [AWS::Neptune::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-neptune-dbcluster.html)',
            '- [AWS::RDS::DBCluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbcluster.html)',
            '- [AWS::RDS::DBInstance](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-rds-dbinstance.html)',
            '- [AWS::Redshift::Cluster](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-redshift-cluster.html)',
            '\n',
            '[Source Documentation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html)',
        ].join('\n'),
    );

    return docsMap;
}

export const SNAPSHOT_SUPPORTED_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::DocDB::DBCluster',
    'AWS::EC2::Volume',
    'AWS::ElastiCache::CacheCluster',
    'AWS::ElastiCache::ReplicationGroup',
    'AWS::Neptune::DBCluster',
    'AWS::RDS::DBCluster',
    'AWS::RDS::DBInstance',
    'AWS::Redshift::Cluster',
];

export const DEFAULT_SNAPSHOT_RESOURCE_TYPES: ReadonlyArray<string> = [
    'AWS::RDS::DBCluster',
    'AWS::RDS::DBInstance', // Only when DBClusterIdentifier is not specified
];

export const DELETION_POLICY_VALUES: ReadonlyArray<string> = ['Delete', 'Retain', 'RetainExceptOnCreate', 'Snapshot'];

export function supportsSnapshot(resourceType: string): boolean {
    return SNAPSHOT_SUPPORTED_RESOURCE_TYPES.includes(resourceType);
}

export function getDefaultDeletionPolicy(resourceType: string): string {
    if (DEFAULT_SNAPSHOT_RESOURCE_TYPES.includes(resourceType)) {
        return 'Snapshot';
    }
    return 'Delete';
}

export function isValidDeletionPolicyValue(value: string): boolean {
    return DELETION_POLICY_VALUES.includes(value);
}
