export interface DependentExcluded {
    [property: string]: string[];
}

export const dependentExcludedMap: ReadonlyMap<string, DependentExcluded> = new Map<string, DependentExcluded>([
    [
        'AWS::CloudFront::Distribution',
        {
            CustomOriginConfig: ['S3OriginConfig'],
            S3OriginConfig: ['CustomOriginConfig'],
            RedirectAllRequestsTo: ['ErrorDocument', 'IndexDocument', 'RoutingRules'],
            ObjectSizeLessThan: ['AbortIncompleteMultipartUpload'],
            ObjectSizeGreaterThan: ['AbortIncompleteMultipartUpload'],
        },
    ],
    [
        'AWS::CloudWatch::Alarm',
        {
            Metrics: ['MetricName', 'Dimensions', 'Period', 'Namespace', 'Statistic', 'ExtendedStatistic', 'Unit'],
            Statistic: ['ExtendedStatistic'],
            ExtendedStatistic: ['Statistic'],
            Threshold: ['ThresholdMetricId'],
            ThresholdMetricId: ['Threshold'],
        },
    ],
    [
        'AWS::EC2::Instance',
        {
            NetworkInterfaces: ['SubnetId'],
            SubnetId: ['NetworkInterfaces'],
            AssociateCarrierIpAddress: ['NetworkInterfaceId'],
            AssociatePublicIpAddress: ['NetworkInterfaceId'],
            NetworkInterfaceId: ['AssociateCarrierIpAddress', 'AssociatePublicIpAddress'],
        },
    ],
    [
        'AWS::EC2::LaunchTemplate',
        {
            AssociateCarrierIpAddress: ['NetworkInterfaceId'],
            AssociatePublicIpAddress: ['NetworkInterfaceId'],
            NetworkInterfaceId: ['AssociateCarrierIpAddress', 'AssociatePublicIpAddress'],
        },
    ],
    [
        'AWS::EC2::NetworkInterface',
        {
            Ipv6AddressCount: ['Ipv6Addresses'],
            Ipv6Addresses: ['Ipv6AddressCount'],
        },
    ],
    [
        'AWS::EC2::Subnet',
        {
            AvailabilityZone: ['AvailabilityZoneId'],
            AvailabilityZoneId: ['AvailabilityZone'],
            CidrBlock: ['Ipv4IpamPoolId'],
            Ipv4IpamPoolId: ['CidrBlock'],
            Ipv6CidrBlock: ['Ipv6IpamPoolId'],
            Ipv6IpamPoolId: ['Ipv6CidrBlock'],
        },
    ],
    [
        'AWS::RDS::DBInstance',
        {
            SourceDBInstanceIdentifier: [
                'CharacterSetName',
                'MasterUserPassword',
                'MasterUsername',
                'StorageEncrypted',
            ],
        },
    ],
    [
        'AWS::S3::Bucket',
        {
            RedirectAllRequestsTo: ['ErrorDocument', 'IndexDocument', 'RoutingRules'],
            ObjectSizeLessThan: ['AbortIncompleteMultipartUpload'],
            ObjectSizeGreaterThan: ['AbortIncompleteMultipartUpload'],
        },
    ],
    [
        'AWS::ServiceDiscovery::Service',
        {
            HealthCheckConfig: ['HealthCheckCustomConfig'],
            HealthCheckCustomConfig: ['HealthCheckConfig'],
        },
    ],
    [
        'AWS::WAFv2::WebACL',
        {
            SearchString: ['SearchStringBase64'],
            SearchStringBase64: ['SearchString'],
        },
    ],
]);

export type RequiredXor = string[];
export const requiredXorMap: ReadonlyMap<string, RequiredXor[]> = new Map<string, RequiredXor[]>([
    ['AWS::ApplicationAutoScaling::ScalingPolicy', [['ScalingTargetId', 'ResourceId']]],
    [
        'AWS::AutoScaling::AutoScalingGroup',
        [
            ['InstanceId', 'LaunchConfigurationName', 'LaunchTemplate', 'MixedInstancesPolicy'],
            ['LaunchTemplateId', 'LaunchTemplateName'], // path: /definitions/LaunchTemplateSpecification
        ],
    ],
    [
        'AWS::AutoScaling::LaunchConfiguration',
        [
            ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
        ],
    ],
    [
        'AWS::CloudFront::Distribution',
        [
            ['AcmCertificateArn', 'CloudFrontDefaultCertificate', 'IamCertificateId'], // path: /definitions/ViewerCertificate
        ],
    ],
    ['AWS::CloudWatch::Alarm', [['Metrics', 'MetricName']]],
    ['AWS::CodePipeline::Pipeline', [['ArtifactStore', 'ArtifactStores']]],
    [
        'AWS::EC2::Instance',
        [
            ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
        ],
    ],
    [
        'AWS::EC2::LaunchTemplate',
        [
            ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
        ],
    ],
    ['AWS::EC2::NetworkAclEntry', [['Ipv6CidrBlock', 'CidrBlock']]],
    [
        'AWS::EC2::SecurityGroup',
        [
            ['CidrIp', 'CidrIpv6', 'DestinationSecurityGroupId', 'DestinationPrefixListId'], // path: /definitions/Egress
            ['CidrIp', 'CidrIpv6', 'SourcePrefixListId', 'SourceSecurityGroupId', 'SourceSecurityGroupName'], // path: /definitions/Ingress
        ],
    ],
    [
        'AWS::EC2::SecurityGroupEgress',
        [['CidrIp', 'CidrIpv6', 'DestinationPrefixListId', 'DestinationSecurityGroupId']],
    ],
    [
        'AWS::EC2::SecurityGroupIngress',
        [['CidrIp', 'CidrIpv6', 'SourcePrefixListId', 'SourceSecurityGroupId', 'SourceSecurityGroupName']],
    ],
    [
        'AWS::EC2::SpotFleet',
        [
            ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
            ['LaunchSpecifications', 'LaunchTemplateConfigs'], // path: /definitions/SpotFleetRequestConfigData
        ],
    ],
    ['AWS::EC2::VPC', [['CidrBlock', 'Ipv4IpamPoolId']]],
    ['AWS::ElasticLoadBalancingV2::LoadBalancer', [['Subnets', 'SubnetMappings']]],
    [
        'AWS::OpsWorks::Instance',
        [
            ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
        ],
    ],
    ['AWS::Route53::RecordSet', [['HostedZoneId', 'HostedZoneName']]],
    ['AWS::Route53::RecordSetGroup', [['HostedZoneId', 'HostedZoneName']]],
]);
