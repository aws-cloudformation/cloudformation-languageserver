export interface DependentExcluded {
    [property: string]: string[];
}

export const dependentExcludedMap = getDependentExcludedMap();

function getDependentExcludedMap() {
    const dependentExcludedMap = new Map<string, DependentExcluded>();

    dependentExcludedMap.set('AWS::CloudFront::Distribution', {
        CustomOriginConfig: ['S3OriginConfig'],
        S3OriginConfig: ['CustomOriginConfig'],
        RedirectAllRequestsTo: ['ErrorDocument', 'IndexDocument', 'RoutingRules'],
        ObjectSizeLessThan: ['AbortIncompleteMultipartUpload'],
        ObjectSizeGreaterThan: ['AbortIncompleteMultipartUpload'],
    });

    dependentExcludedMap.set('AWS::CloudWatch::Alarm', {
        Metrics: ['MetricName', 'Dimensions', 'Period', 'Namespace', 'Statistic', 'ExtendedStatistic', 'Unit'],
        Statistic: ['ExtendedStatistic'],
        ExtendedStatistic: ['Statistic'],
        Threshold: ['ThresholdMetricId'],
        ThresholdMetricId: ['Threshold'],
    });

    dependentExcludedMap.set('AWS::EC2::Instance', {
        NetworkInterfaces: ['SubnetId'],
        SubnetId: ['NetworkInterfaces'],
        AssociateCarrierIpAddress: ['NetworkInterfaceId'],
        AssociatePublicIpAddress: ['NetworkInterfaceId'],
        NetworkInterfaceId: ['AssociateCarrierIpAddress', 'AssociatePublicIpAddress'],
    });

    dependentExcludedMap.set('AWS::EC2::LaunchTemplate', {
        AssociateCarrierIpAddress: ['NetworkInterfaceId'],
        AssociatePublicIpAddress: ['NetworkInterfaceId'],
        NetworkInterfaceId: ['AssociateCarrierIpAddress', 'AssociatePublicIpAddress'],
    });

    dependentExcludedMap.set('AWS::EC2::NetworkInterface', {
        Ipv6AddressCount: ['Ipv6Addresses'],
        Ipv6Addresses: ['Ipv6AddressCount'],
    });

    dependentExcludedMap.set('AWS::EC2::Subnet', {
        AvailabilityZone: ['AvailabilityZoneId'],
        AvailabilityZoneId: ['AvailabilityZone'],
        CidrBlock: ['Ipv4IpamPoolId'],
        Ipv4IpamPoolId: ['CidrBlock'],
        Ipv6CidrBlock: ['Ipv6IpamPoolId'],
        Ipv6IpamPoolId: ['Ipv6CidrBlock'],
    });

    dependentExcludedMap.set('AWS::RDS::DBInstance', {
        SourceDBInstanceIdentifier: ['CharacterSetName', 'MasterUserPassword', 'MasterUsername', 'StorageEncrypted'],
    });

    dependentExcludedMap.set('AWS::S3::Bucket', {
        RedirectAllRequestsTo: ['ErrorDocument', 'IndexDocument', 'RoutingRules'],
        ObjectSizeLessThan: ['AbortIncompleteMultipartUpload'],
        ObjectSizeGreaterThan: ['AbortIncompleteMultipartUpload'],
    });

    dependentExcludedMap.set('AWS::ServiceDiscovery::Service', {
        HealthCheckConfig: ['HealthCheckCustomConfig'],
        HealthCheckCustomConfig: ['HealthCheckConfig'],
    });

    dependentExcludedMap.set('AWS::WAFv2::WebACL', {
        SearchString: ['SearchStringBase64'],
        SearchStringBase64: ['SearchString'],
    });

    return dependentExcludedMap as ReadonlyMap<string, DependentExcluded>;
}

export type RequiredXor = string[];
export const requiredXorMap = getRequiredXorMap();

function getRequiredXorMap() {
    const requiredXorMap = new Map<string, RequiredXor[]>();

    requiredXorMap.set('AWS::ApplicationAutoScaling::ScalingPolicy', [['ScalingTargetId', 'ResourceId']]);

    requiredXorMap.set('AWS::AutoScaling::AutoScalingGroup', [
        ['InstanceId', 'LaunchConfigurationName', 'LaunchTemplate', 'MixedInstancesPolicy'],
        ['LaunchTemplateId', 'LaunchTemplateName'], // path: /definitions/LaunchTemplateSpecification
    ]);

    requiredXorMap.set('AWS::AutoScaling::LaunchConfiguration', [
        ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
    ]);

    requiredXorMap.set('AWS::CloudFront::Distribution', [
        ['AcmCertificateArn', 'CloudFrontDefaultCertificate', 'IamCertificateId'], // path: /definitions/ViewerCertificate
    ]);

    requiredXorMap.set('AWS::CloudWatch::Alarm', [['Metrics', 'MetricName']]);

    requiredXorMap.set('AWS::CodePipeline::Pipeline', [['ArtifactStore', 'ArtifactStores']]);

    requiredXorMap.set('AWS::EC2::Instance', [
        ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
    ]);

    requiredXorMap.set('AWS::EC2::LaunchTemplate', [
        ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
    ]);

    requiredXorMap.set('AWS::EC2::NetworkAclEntry', [['Ipv6CidrBlock', 'CidrBlock']]);

    requiredXorMap.set('AWS::EC2::SecurityGroup', [
        ['CidrIp', 'CidrIpv6', 'DestinationSecurityGroupId', 'DestinationPrefixListId'], // path: /definitions/Egress
        ['CidrIp', 'CidrIpv6', 'SourcePrefixListId', 'SourceSecurityGroupId', 'SourceSecurityGroupName'], // path: /definitions/Ingress
    ]);

    requiredXorMap.set('AWS::EC2::SecurityGroupEgress', [
        ['CidrIp', 'CidrIpv6', 'DestinationPrefixListId', 'DestinationSecurityGroupId'],
    ]);

    requiredXorMap.set('AWS::EC2::SecurityGroupIngress', [
        ['CidrIp', 'CidrIpv6', 'SourcePrefixListId', 'SourceSecurityGroupId', 'SourceSecurityGroupName'],
    ]);

    requiredXorMap.set('AWS::EC2::SpotFleet', [
        ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
        ['LaunchSpecifications', 'LaunchTemplateConfigs'], // path: /definitions/SpotFleetRequestConfigData
    ]);

    requiredXorMap.set('AWS::EC2::VPC', [['CidrBlock', 'Ipv4IpamPoolId']]);

    requiredXorMap.set('AWS::ElasticLoadBalancingV2::LoadBalancer', [['Subnets', 'SubnetMappings']]);

    requiredXorMap.set('AWS::OpsWorks::Instance', [
        ['VirtualName', 'Ebs', 'NoDevice'], // path: /definitions/BlockDeviceMapping
    ]);

    requiredXorMap.set('AWS::Route53::RecordSet', [['HostedZoneId', 'HostedZoneName']]);

    requiredXorMap.set('AWS::Route53::RecordSetGroup', [['HostedZoneId', 'HostedZoneName']]);

    return requiredXorMap as ReadonlyMap<string, RequiredXor[]>;
}
