import { DateTime } from 'luxon';
import { ResourceState } from '../../../src/resourceState/ResourceStateManager';

const baseTimestamp = DateTime.now();

export const MockResourceStates = {
    'AWS::S3::Bucket': {
        typeName: 'AWS::S3::Bucket',
        identifier: 'my-test-bucket',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            BucketName: 'my-test-bucket',
            VersioningConfiguration: {
                Status: 'Enabled',
            },
            PublicAccessBlockConfiguration: {
                BlockPublicAcls: true,
                BlockPublicPolicy: true,
            },
        }),
    } as ResourceState,

    'AWS::EC2::Instance': {
        typeName: 'AWS::EC2::Instance',
        identifier: 'i-1234567890abcdef0',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            ImageId: 'ami-12345678',
            InstanceType: 't2.micro',
            KeyName: 'my-key-pair',
            SecurityGroups: ['sg-12345678'],
        }),
    } as ResourceState,

    'AWS::IAM::Role': {
        typeName: 'AWS::IAM::Role',
        identifier: 'MyTestRole',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            RoleName: 'MyTestRole',
            AssumeRolePolicyDocument: {
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Principal: { Service: 'lambda.amazonaws.com' },
                        Action: 'sts:AssumeRole',
                    },
                ],
            },
            Description: 'Test role for Lambda',
        }),
    } as ResourceState,

    'AWS::Lambda::Function': {
        typeName: 'AWS::Lambda::Function',
        identifier: 'MyTestFunction',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            FunctionName: 'MyTestFunction',
            Runtime: 'nodejs18.x',
            Code: {
                ZipFile: 'exports.handler = async (event) => { return "Hello World"; };',
            },
            Handler: 'index.handler',
            Role: 'arn:aws:iam::123456789012:role/lambda-role',
        }),
    } as ResourceState,

    'AWS::EC2::VPC': {
        typeName: 'AWS::EC2::VPC',
        identifier: 'vpc-12345678',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            CidrBlock: '10.0.0.0/16',
            EnableDnsHostnames: true,
            EnableDnsSupport: true,
            Tags: [{ Key: 'Name', Value: 'MyVPC' }],
        }),
    } as ResourceState,

    'AWS::EC2::Subnet': {
        typeName: 'AWS::EC2::Subnet',
        identifier: 'subnet-12345678',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            VpcId: 'vpc-12345678',
            CidrBlock: '10.0.1.0/24',
            MapPublicIpOnLaunch: true,
        }),
    } as ResourceState,

    'AWS::EC2::SecurityGroup': {
        typeName: 'AWS::EC2::SecurityGroup',
        identifier: 'sg-12345678',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            GroupDescription: 'Test security group',
            VpcId: 'vpc-12345678',
            SecurityGroupIngress: [
                {
                    IpProtocol: 'tcp',
                    FromPort: 80,
                    ToPort: 80,
                    CidrIp: '0.0.0.0/0',
                },
            ],
        }),
    } as ResourceState,

    'AWS::EC2::LaunchTemplate': {
        typeName: 'AWS::EC2::LaunchTemplate',
        identifier: 'lt-12345678',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            LaunchTemplateName: 'MyLaunchTemplate',
            LaunchTemplateData: {
                ImageId: 'ami-12345678',
                InstanceType: 't2.micro',
                KeyName: 'my-key-pair',
            },
        }),
    } as ResourceState,

    'AWS::AutoScaling::AutoScalingGroup': {
        typeName: 'AWS::AutoScaling::AutoScalingGroup',
        identifier: 'MyAutoScalingGroup',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            AutoScalingGroupName: 'MyAutoScalingGroup',
            MinSize: 1,
            MaxSize: 3,
            DesiredCapacity: 2,
            LaunchTemplate: {
                LaunchTemplateId: 'lt-12345678',
                Version: '$Latest',
            },
            VPCZoneIdentifier: ['subnet-12345678'],
        }),
    } as ResourceState,

    'AWS::RDS::DBInstance': {
        typeName: 'AWS::RDS::DBInstance',
        identifier: 'mydbinstance',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            DBInstanceIdentifier: 'mydbinstance',
            DBInstanceClass: 'db.t3.micro',
            Engine: 'mysql',
            MasterUsername: 'admin',
            AllocatedStorage: '20',
            VPCSecurityGroups: ['sg-12345678'],
        }),
    } as ResourceState,

    'AWS::CloudWatch::Alarm': {
        typeName: 'AWS::CloudWatch::Alarm',
        identifier: 'MyTestAlarm',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            AlarmName: 'MyTestAlarm',
            AlarmDescription: 'Test alarm for CPU utilization',
            ComparisonOperator: 'GreaterThanThreshold',
            EvaluationPeriods: 2,
            MetricName: 'CPUUtilization',
            Namespace: 'AWS/EC2',
            Period: 300,
            Statistic: 'Average',
        }),
    } as ResourceState,

    'AWS::SNS::Topic': {
        typeName: 'AWS::SNS::Topic',
        identifier: 'arn:aws:sns:us-east-1:123456789012:MyTestTopic',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            TopicName: 'MyTestTopic',
            DisplayName: 'My Test Topic',
            Subscription: [
                {
                    Protocol: 'email',
                    Endpoint: 'test@example.com',
                },
            ],
        }),
    } as ResourceState,

    'AWS::SSM::Parameter': {
        typeName: 'AWS::SSM::Parameter',
        identifier: '/myapp/config/database-url',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            Name: '/myapp/config/database-url',
            Type: 'String',
            Value: 'mysql://localhost:3306/myapp',
            Description: 'Database connection URL',
        }),
    } as ResourceState,

    'AWS::Synthetics::Canary': {
        typeName: 'AWS::Synthetics::Canary',
        identifier: 'my-test-canary',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            Name: 'my-test-canary',
            Code: {
                Handler: 'index.handler',
                Script: 'exports.handler = async () => {};',
            },
            ArtifactS3Location: 's3://my-bucket/canary-artifacts',
            ExecutionRoleArn: 'arn:aws:iam::123456789012:role/canary-role',
            Schedule: {
                Expression: 'rate(5 minutes)',
            },
            RuntimeVersion: 'syn-nodejs-puppeteer-3.9',
        }),
    } as ResourceState,

    'AWS::SecurityLake::SubscriberNotification': {
        typeName: 'AWS::SecurityLake::SubscriberNotification',
        identifier: 'arn:aws:securitylake:us-east-1:123456789012:subscriber/test-subscriber',
        createdTimestamp: baseTimestamp,
        properties: JSON.stringify({
            SubscriberArn: 'arn:aws:securitylake:us-east-1:123456789012:subscriber/test-subscriber',
            NotificationConfiguration: {
                HttpsNotificationConfiguration: {
                    TargetRoleArn: 'arn:aws:iam::123456789012:role/notification-role',
                    Endpoint: 'https://example.com/webhook',
                },
            },
        }),
    } as ResourceState,
};

export function createMockResourceState(resourceType: string): ResourceState {
    const mockState = MockResourceStates[resourceType as keyof typeof MockResourceStates];
    if (!mockState) {
        throw new Error(`No mock resource state defined for ${resourceType}`);
    }
    return structuredClone(mockState);
}

// Helper function to get parsed properties for testing
export function getMockResourceProperties(resourceType: string): any {
    const mockState = MockResourceStates[resourceType as keyof typeof MockResourceStates];
    if (!mockState) {
        throw new Error(`No mock resource state defined for ${resourceType}`);
    }
    return JSON.parse(mockState.properties);
}
