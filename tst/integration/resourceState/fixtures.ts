import { DateTime } from 'luxon';

// Mock Resource States
export const mockS3BucketState = {
    typeName: 'AWS::S3::Bucket',
    identifier: 'test-bucket-12345',
    createdTimestamp: DateTime.now(),
    properties: JSON.stringify({
        BucketName: 'test-bucket-12345',
        PublicAccessBlockConfiguration: {
            RestrictPublicBuckets: true,
            BlockPublicPolicy: true,
            BlockPublicAcls: true,
            IgnorePublicAcls: true,
        },
        BucketEncryption: {
            ServerSideEncryptionConfiguration: [
                {
                    ServerSideEncryptionByDefault: {
                        SSEAlgorithm: 'AES256',
                    },
                    BucketKeyEnabled: true,
                },
            ],
        },
        VersioningConfiguration: {
            Status: 'Enabled',
        },
    }),
};

export const mockIAMRoleState = {
    typeName: 'AWS::IAM::Role',
    identifier: 'test-role',
    createdTimestamp: DateTime.now(),
    properties: JSON.stringify({
        RoleName: 'test-role',
        Path: '/',
        AssumeRolePolicyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Principal: {
                        Service: 's3.amazonaws.com',
                    },
                    Action: 'sts:AssumeRole',
                },
            ],
        },
        ManagedPolicyArns: ['arn:aws:iam::aws:policy/ReadOnlyAccess'],
        MaxSessionDuration: 3600,
    }),
};

// Template Fixtures
export const templates = {
    yaml: {
        empty: 'AWSTemplateFormatVersion: "2010-09-09"\n',
        withParameters: `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template

Parameters:
  AppName:
    Type: String

Outputs:
  BucketName:
    Value: !Ref MyBucket`,
        withResources: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ExistingBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: existing-bucket

Outputs:
  BucketName:
    Value: !Ref ExistingBucket`,
        withMultipleResources: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  FirstBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: first-bucket

  SecondBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: second-bucket`,
        partialResource: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test-bucket-12345`,
        partialRole: `Resources:
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: test-role`,
    },
    json: {
        empty: '{"AWSTemplateFormatVersion": "2010-09-09"}',
        withParameters: JSON.stringify(
            {
                AWSTemplateFormatVersion: '2010-09-09',
                Description: 'Test template',
                Parameters: {
                    AppName: {
                        Type: 'String',
                    },
                },
            },
            null,
            2,
        ),
        withResources: JSON.stringify(
            {
                AWSTemplateFormatVersion: '2010-09-09',
                Resources: {
                    ExistingBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'existing-bucket',
                        },
                    },
                },
            },
            null,
            2,
        ),
        withMultipleResources: JSON.stringify(
            {
                Resources: {
                    FirstBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'first-bucket',
                        },
                    },
                    SecondBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'second-bucket',
                        },
                    },
                },
            },
            null,
            2,
        ),
        partialResource: JSON.stringify(
            {
                AWSTemplateFormatVersion: '2010-09-09',
                Resources: {
                    MyBucket: {
                        Type: 'AWS::S3::Bucket',
                        Properties: {
                            BucketName: 'test-bucket-12345',
                        },
                    },
                },
            },
            null,
            2,
        ),
        partialRole: JSON.stringify(
            {
                Resources: {
                    LambdaRole: {
                        Type: 'AWS::IAM::Role',
                        Properties: {
                            RoleName: 'test-role',
                        },
                    },
                },
            },
            null,
            2,
        ),
    },
};

// Mock Factory
export function createMockResourceStateManager(additionalMocks: Record<string, any> = {}) {
    return {
        getResource: (resourceType: string, identifier: string) => {
            if (resourceType === 'AWS::S3::Bucket' && identifier === 'test-bucket-12345') {
                return Promise.resolve(mockS3BucketState);
            }
            if (resourceType === 'AWS::IAM::Role' && identifier === 'test-role') {
                return Promise.resolve(mockIAMRoleState);
            }
            if (additionalMocks[`${resourceType}:${identifier}`]) {
                return Promise.resolve(additionalMocks[`${resourceType}:${identifier}`]);
            }
            return Promise.resolve(undefined);
        },
        close: () => Promise.resolve(),
        listen: () => {},
    } as any;
}

export function createMockStackManagementInfoProvider(managedByStack = false) {
    return {
        getResourceManagementState: () =>
            Promise.resolve({
                managedByStack,
                physicalResourceId: 'test-bucket-12345',
                ...(managedByStack && {
                    stackName: 'test-stack',
                    stackId: 'arn:aws:cloudformation:us-east-1:123456789012:stack/test-stack/guid',
                }),
            }),
    } as any;
}
