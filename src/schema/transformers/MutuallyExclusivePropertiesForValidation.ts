export interface DependentExcluded {
    [property: string]: string[];
}

export const dependentExcludedMap = getDependentExcludedMap();

function getDependentExcludedMap(): Map<string, DependentExcluded> {
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

    return dependentExcludedMap;
}
