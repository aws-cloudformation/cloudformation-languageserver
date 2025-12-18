import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { GotoExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Goto/Definition Features', () => {
    describe('YAML', () => {
        it('Comprehensive Goto/Definition while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Goto parameter definition',
                steps: [
                    {
                        action: 'initialize',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Template for testing goto/definition with references'

Parameters:
  EnvironmentName:
    Type: String
    Default: "production"

  VpcCidr:
    Type: String
    Default: "10.0.0.0/16"

  SubnetCidrs:
    Type: CommaDelimitedList
    Default: "10.0.1.0/24,10.0.2.0/24"

  InstanceCount:
    Type: Number
    Default: 2

  AvailabilityZones:
    Type: List<AWS::EC2::AvailabilityZone::Name>
  
  environmentname:  
    Type: String
    Default: "test"

Mappings:
  RegionMap:
    us-east-1:
      AMI: "ami-0abcdef1234567890"
      InstanceType: "t3.micro"
    us-west-2:
      AMI: "ami-0fedcba0987654321"
      InstanceType: "t3.small"

  EnvironmentMap:
    development:
      DatabaseSize: "db.t3.micro"
    production:
      DatabaseSize: "db.t3.large"

Conditions:
  IsProduction: !Equals [!Ref EnvironmentName, "production"]
  IsNotProduction: !Not [!Condition IsProduction]
  IsProductionOrStaging: !Or
    - !Condition IsProduction
    - !Equals [!Ref EnvironmentName, "staging"]`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on EnvironmentName in !Ref',
                        verification: {
                            position: { line: 43, character: 34 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  
  ComplexCondition: !And
    - !Condition IsProduction  
    - !Not [!Condition IsNotProduction]  
Metadata: 
  MyMetadata:
    EnvironmentRef: !Ref EnvironmentName  
    VpcRef: !Ref VpcCidr`,
                        position: { line: 47, character: 47 },
                        description: 'Click on IsNotProduction in !And !Ref',
                        verification: {
                            position: { line: 51, character: 28 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsNotProduction')
                                .expectDefinitionPosition({ line: 44, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on VpcCidr in long format Ref',
                        verification: {
                            position: { line: 55, character: 21 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VpcCidr')
                                .expectDefinitionPosition({ line: 8, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: !Ref VpcCidr
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-vpc"`,
                        position: { line: 56, character: 24 },
                        description: 'Test goto within Sub formatted reference',
                        verification: {
                            position: { line: 65, character: 32 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .todo('No logic for goto in formatted string')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - Key: Environment
          Value: !Ref EnvironmentName`,
                        position: { line: 65, character: 46 },
                        description: 'Click on EnvironmentName in !Ref',
                        verification: {
                            position: { line: 66, character: 28 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - Key: CaseSensitive
          Value: !Ref environmentname`,
                        position: { line: 66, character: 37 },
                        description: 'Click on environmentname in !Ref to test case sensitivity',
                        verification: {
                            position: { line: 68, character: 28 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('environmentname')
                                .expectDefinitionPosition({ line: 23, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  PublicSubnet:
    Type: AWS::EC2::Subnet
    DependsOn: VPC`,
                        position: { line: 68, character: 37 },
                        description: 'Click on VPC in DependsOn',
                        verification: {
                            position: { line: 72, character: 17 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VPC')
                                .expectDefinitionPosition({ line: 58, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      VpcId: !Ref VPC`,
                        position: { line: 72, character: 18 },
                        description: 'Click on VPC in !Ref',
                        verification: {
                            position: { line: 74, character: 19 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VPC')
                                .expectDefinitionPosition({ line: 58, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      CidrBlock: !Select [0, !Ref SubnetCidrs]`,
                        position: { line: 74, character: 21 },
                        description: 'Click on SubnetCidrs in !Ref',
                        verification: {
                            position: { line: 75, character: 37 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('SubnetCidrs')
                                .expectDefinitionPosition({ line: 12, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      AvailabilityZone: !Select [0, !Ref AvailabilityZones]`,
                        position: { line: 75, character: 46 },
                        description: 'Click on AvailabilityZones in !Ref',
                        verification: {
                            position: { line: 76, character: 48 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('AvailabilityZones')
                                .expectDefinitionPosition({ line: 20, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      Tags:
        - Key: Name
          Value: !Sub
            - "\${EnvName}"
            - EnvName: !Ref EnvironmentName
              AZ: !Select [0, !Ref AvailabilityZones]
    Condition: IsProductionOrStaging

  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          SourceSecurityGroupId: !Ref BastionSecurityGroup
      Tags:
        - Key: Name
          Value: !Ref EnvironmentName

  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !Ref VPC`,
                        position: { line: 76, character: 59 },
                        description: 'Test goto on logical id defined after Ref',
                        verification: {
                            position: { line: 93, character: 46 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('BastionSecurityGroup')
                                .expectDefinitionPosition({ line: 98, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateName: !Sub "\${EnvironmentName}-template"
      LaunchTemplateData:
        ImageId: !FindInMap [RegionMap, !Ref AWS::Region, AMI]`,
                        position: { line: 101, character: 21 },
                        description: 'Click on AvailabilityZones in !Ref',
                        verification: {
                            position: { line: 108, character: 33 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('RegionMap')
                                .expectDefinitionPosition({ line: 28, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        InstanceType: !FindInMap [RegionMap, !Ref AWS::Region, InstanceType]
        SecurityGroupIds:
          - !Ref WebSecurityGroup`,
                        position: { line: 108, character: 62 },
                        description: 'Click on WebSecurityGroup in !Ref',
                        verification: {
                            position: { line: 111, character: 26 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('WebSecurityGroup')
                                .expectDefinitionPosition({ line: 85, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on AMI in FindInMap second level key',
                        verification: {
                            position: { line: 108, character: 60 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('AMI')
                                .todo('No go to logic for second level keys')
                                .expectDefinitionPosition({ line: 30, character: 6 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on InstanceType in FindInMap second level key',
                        verification: {
                            position: { line: 109, character: 68 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('InstanceType')
                                .todo('No go to logic for second level keys')
                                .expectDefinitionPosition({ line: 31, character: 6 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt LaunchTemplate.LatestVersionNumber
      DesiredCapacity: !Ref InstanceCount
      VPCZoneIdentifier:
        - !Ref PublicSubnet
    CreationPolicy:  
      ResourceSignal:
        Count: !Ref InstanceCount  
        Timeout: PT15M`,
                        position: { line: 111, character: 33 },
                        description: 'Click on InstanceCount in CreationPolicy Ref',
                        verification: {
                            position: { line: 124, character: 30 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('InstanceCount')
                                .expectDefinitionPosition({ line: 16, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceClass: !FindInMap [EnvironmentMap, !Ref EnvironmentName, DatabaseSize]
      AllocatedStorage: !If [IsProduction, 100, 20]
      MultiAZ: !Condition IsProduction
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          SourceSecurityGroupId: !Ref WebSecurityGroup

  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub "\${EnvironmentName}-function"
      Role:
        Fn::GetAtt:
          - LambdaRole  
          - Arn
      Environment:
        Variables:
          ENVIRONMENT: !Ref EnvironmentName
          DATABASE_ENDPOINT: !GetAtt Database.Endpoint.Address
          VPC_ID: !Ref VPC
      VpcConfig:
        SecurityGroupIds:
          - !Ref WebSecurityGroup
        SubnetIds:
          - !Ref PublicSubnet
    Condition: IsProductionOrStaging

  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      AssumeRolePolicyDocument:
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: DatabaseAccess
          PolicyDocument:
            Statement:
              - Effect: Allow
                Action: rds:DescribeDBInstances
                Resource: !Sub "arn:aws:rds:\${AWS::Region}:\${AWS::AccountId}:db:\${Database}"

  DatabaseAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      Dimensions:
        - Name: DBInstanceIdentifier
          Value: !Ref Database
      AlarmActions:
        - !Ref SNSTopic
    Condition: IsProduction

  SNSTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "\${EnvironmentName}-alerts"
  
  SelfReferencingResource:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref SelfReferencingResource`,
                        position: { line: 125, character: 22 },
                        description: 'Click on LambdaRole in long-form GetAtt syntax',
                        verification: {
                            position: { line: 152, character: 17 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('LambdaRole')
                                .expectDefinitionPosition({ line: 166, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProductionOrStaging in Condition',
                        verification: {
                            position: { line: 164, character: 24 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProductionOrStaging')
                                .expectDefinitionPosition({ line: 45, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on SelfReferencingResource CF will reject',
                        verification: {
                            position: { line: 201, character: 38 },
                            expectation: GotoExpectationBuilder.create().expectDefinition('').build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  NestedStack: 
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: "https://s3.amazonaws.com/bucket/template.yaml"
      Parameters:
        EnvParam: !Ref EnvironmentName 
        VpcParam:
          Ref: VpcCidr`,
                        position: { line: 201, character: 46 },
                        description: 'Click on VpcCidr long form ref in nested stack',
                        verification: {
                            position: { line: 210, character: 18 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VpcCidr')
                                .expectDefinitionPosition({ line: 8, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on EnvironmentName in !Sub formatted string',
                        verification: {
                            position: { line: 196, character: 35 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .todo('No logic for goto in formatted string')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in Condition',
                        verification: {
                            position: { line: 191, character: 20 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 43, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

Outputs:
  VPCId:
    Value: !Ref VPC
    Export:
      Name: !Sub "\${EnvironmentName}-VPC-ID"

  VPCCidr:
    Value: !GetAtt VPC.CidrBlock

  DatabaseEndpoint:
    Value: !GetAtt Database.Endpoint.Address`,
                        position: { line: 210, character: 22 },
                        description: 'Click on Address in !GetAtt attribute',
                        verification: {
                            position: { line: 222, character: 42 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('Database')
                                .expectDefinitionPosition({ line: 127, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Condition: IsProductionOrStaging`,
                        position: { line: 222, character: 44 },
                        description: 'Click on IsProductionOrStaging in Condition',
                        verification: {
                            position: { line: 223, character: 24 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProductionOrStaging')
                                .expectDefinitionPosition({ line: 45, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  ComplexOutput:
    Value: !Sub
      - "VPC: \${VpcId} (\${VpcCidr}), DB: \${DbEndpoint}:\${DbPort}"
      - VpcId: !Ref VPC
        VpcCidr: !GetAtt VPC.CidrBlock
        DbEndpoint: !GetAtt Database.Endpoint.Address
        DbPort: !GetAtt Database.Endpoint.Port

  ConditionalOutput:
    Value: !If
      - IsProduction
      - !Sub "Production in \${AWS::Region} with \${InstanceCount} instances"
      - !Ref AWS::NoValue
    Condition: IsProduction`,
                        position: { line: 223, character: 36 },
                        description: 'Click on VpcId in Value !Sub array',
                        verification: {
                            position: { line: 227, character: 19 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VpcId')
                                .todo('No goto for sub formatted strings')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in Condition',
                        verification: {
                            position: { line: 235, character: 15 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 43, character: 2 })
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });

    describe('JSON', () => {
        it('Comprehensive Goto/Definition while authoring', async () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Goto parameter definition',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Template for testing goto/definition with references",
  "Parameters": {
    "EnvironmentName": {
      "Type": "String",
      "Default": "production"
    },
    "VpcCidr": {
      "Type": "String",
      "Default": "10.0.0.0/16"
    },
    "SubnetCidrs": {
      "Type": "CommaDelimitedList",
      "Default": "10.0.1.0/24,10.0.2.0/24"
    },
    "InstanceCount": {
      "Type": "Number",
      "Default": 2
    },
    "AvailabilityZones": {
      "Type": "List<AWS::EC2::AvailabilityZone::Name>"
    },
    "environmentname": {
      "Type": "String",
      "Default": "test"
    }
  },
  "Mappings": {
    "RegionMap": {
      "us-east-1": {
        "AMI": "ami-0abcdef1234567890",
        "InstanceType": "t3.micro"
      },
      "us-west-2": {
        "AMI": "ami-0fedcba0987654321",
        "InstanceType": "t3.small"
      }
    },
    "EnvironmentMap": {
      "development": {
        "DatabaseSize": "db.t3.micro"
      },
      "production": {
        "DatabaseSize": "db.t3.large"
      }
    }
  },
  "Conditions": {
    "IsProduction": {
      "Fn::Equals": [
        { "Ref": "EnvironmentName" },
        "production"
      ]
    },
    "IsNotProduction": {
      "Fn::Not": [
        { "Condition": "IsProduction" }
      ]
    },
    "IsProductionOrStaging": {
      "Fn::Or": [
        { "Condition": "IsProduction" },
        {
          "Fn::Equals": [
            { "Ref": "EnvironmentName" },
            "staging"
          ]
        }
      ]
    },
    "ComplexCondition": {
      "Fn::And": [
        { "Condition": "IsProduction" },
        {
          "Fn::Not": [
            { "Condition": "IsNotProduction" }
          ]
        }
      ]
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on EnvironmentName in Ref',
                        verification: {
                            position: { line: 51, character: 27 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .expectDefinitionPosition({ line: 4, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in Condition',
                        verification: {
                            position: { line: 57, character: 30 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 49, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in Conditiion nested in Or',
                        verification: {
                            position: { line: 62, character: 30 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 49, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on IsNotProduction in Conditiion nested in And Not',
                        verification: {
                            position: { line: 76, character: 35 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsNotProduction')
                                .expectDefinitionPosition({ line: 55, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
  "Metadata": {
    "MyMetadata": {
      "EnvironmentRef": { "Ref": "EnvironmentName" },
      "VpcRef": { "Ref": "VpcCidr" }
    }
  }`,
                        position: { line: 81, character: 3 },
                        description: 'Click on VpcCidr in Metadata Ref',
                        verification: {
                            position: { line: 85, character: 30 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VpcCidr')
                                .expectDefinitionPosition({ line: 8, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
   "Resources": {
    "VPC": {
      "Type": "AWS::EC2::VPC",
      "Properties": {
        "CidrBlock": { "Ref": "VpcCidr" },
        "Tags": [
          {
            "Key": "Name",
            "Value": { "Fn::Sub": "\${EnvironmentName}-vpc" }
          },
          {
            "Key": "Environment",
            "Value": { "Ref": "EnvironmentName" }
          },
          {
            "Key": "CaseSensitive",
            "Value": { "Ref": "environmentname" }
          }
        ]
      }
    }
  }`,
                        position: { line: 87, character: 3 },
                        description: 'Test goto within Sub formatted reference',
                        verification: {
                            position: { line: 96, character: 46 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .todo('No logic for goto in formatted string')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 0, character: 0 },
                        description: 'Click on environmentname to test case sensitivity',
                        verification: {
                            position: { line: 104, character: 37 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('environmentname')
                                .expectDefinitionPosition({ line: 23, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "PublicSubnet": {
      "Type": "AWS::EC2::Subnet",
      "DependsOn": "VPC",
      "Condition": "IsProductionOrStaging",
      "Properties": {
        "VpcId": { "Ref": "VPC" },
        "CidrBlock": {
          "Fn::Select": [
            0,
            { "Ref": "SubnetCidrs" }
          ]
        },
        "AvailabilityZone": {
          "Fn::Select": [
            0,
            { "Ref": "AvailabilityZones" }
          ]
        },
        "Tags": [
          {
            "Key": "Name",
            "Value": {
              "Fn::Sub": [
                "\${EnvName}",
                {
                  "EnvName": { "Ref": "EnvironmentName" },
                  "AZ": {
                    "Fn::Select": [
                      0,
                      { "Ref": "AvailabilityZones" }
                    ]
                  }
                }
              ]
            }
          }
        ]
      }
    }`,
                        position: { line: 108, character: 5 },
                        description: 'Click on VPC in Depends on',
                        verification: {
                            position: { line: 111, character: 22 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VPC')
                                .expectDefinitionPosition({ line: 89, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on SubnetCidrs in !Ref',
                        verification: {
                            position: { line: 118, character: 27 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('SubnetCidrs')
                                .expectDefinitionPosition({ line: 12, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on AvailabilityZones in !Ref deeply nested in Tags array',
                        verification: {
                            position: { line: 138, character: 40 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('AvailabilityZones')
                                .expectDefinitionPosition({ line: 20, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "WebSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "VpcId": { "Ref": "VPC" },
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 22,
            "ToPort": 22,
            "SourceSecurityGroupId": { "Ref": "BastionSecurityGroup" }
          }
        ],
        "Tags": [
          {
            "Key": "Name",
            "Value": { "Ref": "EnvironmentName" }
          }
        ]
      }
    },
    "BastionSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "VpcId": { "Ref": "VPC" }
      }
    }`,
                        position: { line: 147, character: 5 },
                        description: 'Test goto on logical id defined after Ref',
                        verification: {
                            position: { line: 157, character: 54 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('BastionSecurityGroup')
                                .expectDefinitionPosition({ line: 168, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "LaunchTemplate": {
      "Type": "AWS::EC2::LaunchTemplate",
      "Properties": {
        "LaunchTemplateName": { "Fn::Sub": "\${EnvironmentName}-template" },
        "LaunchTemplateData": {
          "ImageId": { "Fn::FindInMap": ["RegionMap", { "Ref": "AWS::Region" }, "AMI"] }
        }
      }
    }`,
                        position: { line: 173, character: 5 },
                        description: 'Click on RegionMap in FindInMap',
                        verification: {
                            position: { line: 179, character: 47 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('RegionMap')
                                .expectDefinitionPosition({ line: 29, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
          "InstanceType": { "Fn::FindInMap": ["RegionMap", { "Ref": "AWS::Region" }, "InstanceType"] },
          "SecurityGroupIds": [{ "Ref": "WebSecurityGroup" }]`,
                        position: { line: 179, character: 88 },
                        description: 'Click on WebSecurityGroup in !Ref',
                        verification: {
                            position: { line: 181, character: 47 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('WebSecurityGroup')
                                .expectDefinitionPosition({ line: 148, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "AutoScalingGroup": {
      "Type": "AWS::AutoScaling::AutoScalingGroup",
      "Properties": {
        "LaunchTemplate": {
          "LaunchTemplateId": { "Ref": "LaunchTemplate" },
          "Version": { "Fn::GetAtt": ["LaunchTemplate", "LatestVersionNumber"] }
        },
        "DesiredCapacity": { "Ref": "InstanceCount" },
        "VPCZoneIdentifier": [
          { "Ref": "PublicSubnet" }
        ]
      },
      "CreationPolicy": {
        "ResourceSignal": {
          "Count": { "Ref": "InstanceCount" },
          "Timeout": "PT15M"
        }
      }
    },
    "Database": {
      "Type": "AWS::RDS::DBInstance",
      "Properties": {
        "DBInstanceClass": {
          "Fn::FindInMap": [
            "EnvironmentMap",
            { "Ref": "EnvironmentName" },
            "DatabaseSize"
          ]
        },
        "AllocatedStorage": {
          "Fn::If": [
            "IsProduction",
            100,
            20
          ]
        },
        "MultiAZ": { "Condition": "IsProduction" },
        "VPCSecurityGroups": [
          { "Ref": "DatabaseSecurityGroup" }
        ]
      }
    },
    "DatabaseSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "VpcId": { "Ref": "VPC" },
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 3306,
            "ToPort": 3306,
            "SourceSecurityGroupId": { "Ref": "WebSecurityGroup" }
          }
        ]
      }
    }`,
                        position: { line: 184, character: 5 },
                        description: 'Click on DatabaseSecurityGroup in Ref',
                        verification: {
                            position: { line: 223, character: 30 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('DatabaseSecurityGroup')
                                .expectDefinitionPosition({ line: 227, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "LambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Condition": "IsProductionOrStaging",
      "Properties": {
        "FunctionName": { "Fn::Sub": "\${EnvironmentName}-function" },
        "Role": {
          "Fn::GetAtt": [
            "LambdaRole",
            "Arn"
          ]
        },
        "Environment": {
          "Variables": {
            "ENVIRONMENT": { "Ref": "EnvironmentName" },
            "DATABASE_ENDPOINT": {
              "Fn::GetAtt": ["Database", "Endpoint.Address"]
            },
            "VPC_ID": { "Ref": "VPC" }
          }
        },
        "VpcConfig": {
          "SecurityGroupIds": [
            { "Ref": "WebSecurityGroup" }
          ],
          "SubnetIds": [
            { "Ref": "PublicSubnet" }
          ]
        }
      }
    },
    "LambdaRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Effect": "Allow",
              "Principal": {
                "Service": "lambda.amazonaws.com"
              },
              "Action": "sts:AssumeRole"
            }
          ]
        },
        "Policies": [
          {
            "PolicyName": "DatabaseAccess",
            "PolicyDocument": {
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": "rds:DescribeDBInstances",
                  "Resource": {
                    "Fn::Sub": "arn:aws:rds:\${AWS::Region}:\${AWS::AccountId}:db:\${Database}"
                  }
                }
              ]
            }
          }
        ]
      }
    }`,
                        position: { line: 240, character: 5 },
                        description: 'Click on LambdaRole in !GetAtt',
                        verification: {
                            position: { line: 248, character: 19 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('LambdaRole')
                                .expectDefinitionPosition({ line: 271, character: 4 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on Address in GetAtt attribute',
                        verification: {
                            position: { line: 256, character: 55 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('Database')
                                .todo('Goto on GetAtt attributes not supported in JSON')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "DatabaseAlarm": {
      "Type": "AWS::CloudWatch::Alarm",
      "Condition": "IsProduction",
      "Properties": {
        "Dimensions": [
          {
            "Name": "DBInstanceIdentifier",
            "Value": { "Ref": "Database" }
          }
        ],
        "AlarmActions": [{ "Ref": "SNSTopic" }]
      }
    },
    "SNSTopic": {
      "Type": "AWS::SNS::Topic",
      "Properties": {
        "TopicName": { "Fn::Sub": "\${EnvironmentName}-alerts" }
      }
    }`,
                        position: { line: 302, character: 5 },
                        description: 'Click on Database in !Ref',
                        verification: {
                            position: { line: 310, character: 35 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('Database')
                                .expectDefinitionPosition({ line: 204, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on SNSTopic in Ref',
                        verification: {
                            position: { line: 313, character: 40 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('SNSTopic')
                                .expectDefinitionPosition({ line: 316, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on EnvironmentName in !Sub formatted string',
                        verification: {
                            position: { line: 319, character: 46 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .todo('No logic for goto in formatted string')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in Condition',
                        verification: {
                            position: { line: 305, character: 25 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 49, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "SelfReferencingResource": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Ref": "SelfReferencingResource" }
      }
    }`,
                        position: { line: 321, character: 5 },
                        description: 'Click on SelfReferencingResource Cf will not allow',
                        verification: {
                            position: { line: 325, character: 45 },
                            expectation: GotoExpectationBuilder.create().expectDefinition('').build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "NestedStack": {
      "Type": "AWS::CloudFormation::Stack",
      "Properties": {
        "TemplateURL": "https://s3.amazonaws.com/bucket/template.yaml",
        "Parameters": {
          "EnvParam": { "Ref": "EnvironmentName" },
          "VpcParam": { "Ref": "VpcCidr" }
        }
      }
    }`,
                        position: { line: 327, character: 5 },
                        description: 'Click on EnvironmentName in nested stack',
                        verification: {
                            position: { line: 333, character: 38 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('EnvironmentName')
                                .expectDefinitionPosition({ line: 4, character: 2 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
  "Outputs": {
    "VPCId": {
      "Value": { "Ref": "VPC" },
      "Export": {
        "Name": { "Fn::Sub": "\${EnvironmentName}-VPC-ID" }
      }
    },
    "VPCCidr": {
      "Value": { "Fn::GetAtt": ["VPC", "CidrBlock"] }
    },
    "DatabaseEndpoint": {
      "Condition": "IsProductionOrStaging",
      "Value": { "Fn::GetAtt": ["Database", "Endpoint.Address"] }
    }
  }`,
                        position: { line: 338, character: 3 },
                        description: 'Click on VPC in Output value',
                        verification: {
                            position: { line: 341, character: 27 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VPC')
                                .expectDefinitionPosition({ line: 89, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProductionOrStaging in Condition',
                        verification: {
                            position: { line: 350, character: 26 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProductionOrStaging')
                                .expectDefinitionPosition({ line: 60, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "ComplexOutput": {
      "Value": {
        "Fn::Sub": [
          "VPC: \${VpcId} (\${VpcCidr}), DB: \${DbEndpoint}:\${DbPort}",
          {
            "VpcId": { "Ref": "VPC" },
            "VpcCidr": { "Fn::GetAtt": ["VPC", "CidrBlock"] },
            "DbEndpoint": { "Fn::GetAtt": ["Database", "Endpoint.Address"] },
            "DbPort": { "Fn::GetAtt": ["Database", "Endpoint.Port"] }
          }
        ]
      }
    },
    "ConditionalOutput": {
      "Condition": "IsProduction",
      "Value": {
        "Fn::If": [
          "IsProduction",
          { "Fn::Sub": "Production in \${AWS::Region} with \${InstanceCount} instances" },
          { "Ref": "AWS::NoValue" }
        ]
      }
    }`,
                        position: { line: 352, character: 5 },
                        description: 'Click on VpcId in Value Sub array',
                        verification: {
                            position: { line: 356, character: 20 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('VpcId')
                                .todo('No handling for refs in formatted Sub strings')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on IsProduction in If block',
                        verification: {
                            position: { line: 370, character: 16 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('IsProduction')
                                .expectDefinitionPosition({ line: 49, character: 5 })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 0, character: 0 },
                        description: 'Click on InstanceCount in Sub formatting',
                        verification: {
                            position: { line: 371, character: 67 },
                            expectation: GotoExpectationBuilder.create()
                                .expectDefinition('InstanceCount')
                                .todo('No handling for refs in formatted Sub strings')
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });
});
