import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Autocomplete Features', () => {
    describe('YAML', () => {
        it('test Completion while authoring', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Comprehensive template',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
a`,
                        position: { line: 0, character: 0 },
                        description: 'Suggest top level section',
                        verification: {
                            position: { line: 1, character: 1 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Parameters', 'Mappings', 'Transform', 'Metadata'])
                                .expectExcludesItems(['AWSTemplateFormatVersion'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Des`,
                        range: { start: { line: 1, character: 0 }, end: { line: 1, character: 1 } },
                        description: 'Suggest top level sections',
                        verification: {
                            position: { line: 1, character: 3 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Description', 'Resources', 'Rules', 'Resources'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `cription: 'Comprehensive CloudFormation template showcasing ALL complex syntax - GOOD STATE'

# Test Transform with multiple values
Transform:
  - 'AWS::Serverless-2016-10-31'
  - 'AWS::Include'

# Test complex metadata structures
Me`,
                        position: { line: 1, character: 3 },
                        description: 'Suggest top level section, only the ones that have not been already authored',
                        verification: {
                            position: { line: 9, character: 2 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems([
                                    'Metadata',
                                    'Parameters',
                                    'Resources',
                                    'Mappings',
                                    'Resources',
                                    'Parameters',
                                ])
                                .expectExcludesItems(['Transform', 'Description', 'AWSTemplateFormatVersion'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tadata:
  AWS::CloudFormation::Interface:
    ParameterGroups:
      - Label:
          default: "Network Configuration"
        Parameters:
          - VpcCidr
          - EnvironmentName
    ParameterLabels:
      VpcCidr:
        default: "VPC CIDR Block"
  CustomMetadata:
    Version: "1.0.0"
    ComplexObject:
      NestedArray:
        - Item1
        - SubObject:
            Key1: Value1
            Key2: Value2

# Test ALL parameter types and constraints
P`,
                        position: { line: 9, character: 2 },
                        verification: {
                            position: { line: 30, character: 1 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Parameters'])
                                .expectExcludesItems(['Description', 'Metadata', 'Transform'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `arameters:
  EnvironmentName:
    Type: S`,
                        position: { line: 30, character: 1 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 32, character: 11 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['String', 'List<String>'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tring
    Default: "production"
    AllowedValues: ["development", "staging", "production"]
    ConstraintDescription: "Must be development, staging, or production"

  VpcCidr:
    Type: String
    Default: "10.0.0.0/16"
    AllowedPattern: "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\\\\/(1[6-9]|2[0-8]))$"

  SubnetCidrs:
    Type: C`,
                        position: { line: 32, character: 11 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 43, character: 11 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CommaDelimitedList'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ommaDelimitedList
    D`,
                        position: { line: 43, character: 11 },
                        description: 'Parameter fields',
                        verification: {
                            position: { line: 44, character: 5 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['Type'])
                                .expectContainsItems(['Default'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `efault: "10.0.1.0/24,10.0.2.0/24"

  DatabasePassword:
    Type: String
    NoEcho: true
    MinLength: 8
    M`,
                        position: { line: 44, character: 5 },
                        description: 'Parameter fields',
                        verification: {
                            position: { line: 50, character: 5 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['Type', 'NoEcho', 'MinLength'])
                                .expectContainsItems(['MaxLength'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `axLength: 128

  InstanceCount:
    Type: Number
    Default: 2
    MinValue: 1
    MaxValue: 10

  AvailabilityZones:
    Type: List<AWS::EC2::A`,
                        position: { line: 50, character: 5 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 59, character: 26 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'List<AWS::EC2::AvailabilityZone::Name>',
                                    'List<AWS::EC2::Image::Id>',
                                    'List<AWS::EC2::Instance::Id>',
                                    'List<AWS::EC2::SecurityGroup::GroupName>',
                                    'List<AWS::EC2::SecurityGroup::Id>',
                                    'List<AWS::EC2::Subnet::Id>',
                                    'List<AWS::EC2::VPC::Id>',
                                    'List<AWS::EC2::Volume::Id>',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `vailabilityZone::Name>
    Description: "List of AZs"

  SSMParameter:
    Type: AWS::SSM::Parameter::Value<String>
    Default: "/myapp/config/database-url"

  BooleanParameter:
    Type: String
    Default: "true"
    AllowedValues: ["true", "false"]

# Test complex nested mappings
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
      LogLevel: "DEBUG"
    production:
      DatabaseSize: "db.t3.large"
      LogLevel: "WARN"

# Test ALL condition functions and complex nesting
Conditions:
  IsProduction: !E`,
                        position: { line: 59, character: 26 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 91, character: 18 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['!Equals', '!EachMemberEquals', '!EachMemberIn'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `quals [!Ref E]`,
                        position: { line: 91, character: 18 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 91, character: 31 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                // should not include resource logical IDs
                                .expectExcludesItems(['Vpc'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 91, character: 31 }, end: { line: 91, character: 32 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `nvironmentName, "production"]
  IsNotProduction: !Not [!Condition Is]`,
                        position: { line: 91, character: 31 },
                        description: 'Condition excluding self',
                        verification: {
                            position: { line: 92, character: 38 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['IsNotProduction'])
                                .expectContainsItems(['IsProduction'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 92, character: 38 }, end: { line: 92, character: 39 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `Production]
  IsDevelopment: !Equals [!Ref EnvironmentName, "development"]
  
  # Complex nested conditions
  IsProductionOrStaging: !Or
    - !Condition Is`,
                        position: { line: 92, character: 38 },
                        description: 'Condition excluding self',
                        verification: {
                            position: { line: 97, character: 19 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['IsProduction', 'IsNotProduction', 'IsDevelopment'])
                                .expectExcludesItems(['IsProductionOrStaging'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Production
    - !Equals [!Ref EnvironmentName, "staging"]
  
  ComplexCondition: !And
    - !Condition IsProductionOrStaging
    - !Not [!Condition IsDevelopment]
    - !Equals [!Ref AWS::]`,
                        position: { line: 97, character: 19 },
                        description: 'Pseudo-parameter',
                        verification: {
                            position: { line: 103, character: 25 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Region'])
                                .todo(
                                    `intrinsic functions are being suggested incorrectly!
                                [
                                  "!RefAll",
                                  "!GetAZs",
                                  "!Ref",
                                  "!Equals",
                                  "!Base64",
                                  "!GetAtt",
                                  "!Transform",
                                  "!EachMemberEquals",
                                  "!EachMemberIn",
                                ]`,
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 103, character: 25 }, end: { line: 103, character: 26 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `Region, "us-east-1"]
  
  HasMultipleAZs: !Not [!Equals [!Select [1, !Ref A]]]`,
                        position: { line: 103, character: 25 },
                        description: 'Authored parameter from template',
                        verification: {
                            position: { line: 105, character: 51 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AvailabilityZones'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 105, character: 51 }, end: { line: 105, character: 54 } },
                        description: 'remove ]]]',
                    },
                    {
                        action: 'type',
                        content: `vailabilityZones], ""]]

# Test rule validation with complex assertions
Rules:
  ValidateRegionAndEnvironment:
    RuleCondition: !Equals [!Ref AWS::Region, "us-east-1"]
    Assertions:
      - Assert: !Contains
          - ["t3.micro", "t3.small", "t3.medium"]
          - !Fi`,
                        position: { line: 105, character: 51 },
                        description: 'FindInMap intrinsic function name',
                        verification: {
                            position: { line: 114, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['!FindInMap'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ndInMap [Re]`,
                        position: { line: 114, character: 15 },
                        description: 'Authored mapping name',
                        verification: {
                            position: { line: 114, character: 26 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['RegionMap'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `gionMap, !Ref AWS::`,
                        range: { start: { line: 114, character: 26 }, end: { line: 114, character: 26 } },
                        description: 'Pseudo-parameter',
                        verification: {
                            position: { line: 114, character: 45 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Region'])
                                .todo(`no suggestion of pseudo-parameter after AWS:: is typed; needs the R`)
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Region, I`,
                        range: { start: { line: 114, character: 45 }, end: { line: 114, character: 45 } },
                        description: 'Mapping second level key',
                        verification: {
                            position: { line: 114, character: 54 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['InstanceType'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 114, character: 54 }, end: { line: 114, character: 55 } },
                        description: 'Remove ]',
                    },
                    {
                        action: 'type',
                        content: `nstanceType]
        AssertDescription: "Instance type must be valid for region"
      - Assert: !And
          - !Not [!Equals [!Ref D]]`,
                        position: { line: 114, character: 54 },
                        description: 'Authored Parameter',
                        verification: {
                            position: { line: 117, character: 33 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DatabasePassword'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 117, character: 33 }, end: { line: 117, character: 35 } },
                        description: 'Remove ]]',
                    },
                    {
                        action: 'type',
                        content: `atabasePassword, ""]]
          - !N`,
                        position: { line: 117, character: 33 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 118, character: 14 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['!Not']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ot [!E]`,
                        position: { line: 118, character: 14 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 118, character: 20 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['!Equals']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 118, character: 20 }, end: { line: 118, character: 21 } },
                        description: 'Remove ]',
                    },
                    {
                        action: 'type',
                        content: `quals [!R]]`,
                        description: 'Intrinsic function name',
                        position: { line: 118, character: 20 },
                        verification: {
                            position: { line: 118, character: 29 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['!Ref']).build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `ef V`,
                        description: 'Authored Parameter',
                        range: { start: { line: 118, character: 29 }, end: { line: 118, character: 29 } },
                        verification: {
                            position: { line: 118, character: 33 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VpcCidr']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 118, character: 33 }, end: { line: 118, character: 35 } },
                        description: 'Remove ]]',
                    },
                    {
                        action: 'type',
                        content: `pcCidr, ""]]
        AssertDescription: "Required parameters must not be empty"

  ValidateParameterCombinations:
    Assertions:
      - Assert: !Or
          - !Equals [!Ref EnvironmentName, "development"]
          - !And
            - !Not [!Equals [!Ref EnvironmentName, "development"]]
            - !Not [!Equals [!Select [1, !Ref A]]]`,
                        position: { line: 118, character: 33 },
                        description: 'Authored Parameter',
                        verification: {
                            position: { line: 127, character: 47 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AvailabilityZones'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 127, character: 47 }, end: { line: 127, character: 50 } },
                        description: 'Remove ]]]',
                    },
                    {
                        action: 'type',
                        content: `vailabilityZones], ""]]
        AssertDescription: "Non-development environments must specify multiple availability zones"
      - Assert: !Implies
          - !Equals [!Ref BooleanParameter, "true"]
          - !And
            - !Not [!Equals [!Ref InstanceCount, 1]]
            - !Not [!Equals [!Ref SSMParameter, ""]]
        AssertDescription: "When BooleanParameter is true, InstanceCount must be > 1 and SSMParameter must be provided"

Resources:
  # Test VPC with complex tagging and attributes
  VPC:
    Type: AWS::`,
                        position: { line: 127, character: 47 },
                        description: 'Resource type',
                        verification: {
                            position: { line: 139, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectMinItems(10)
                                .expectContainsItems(['AWS::EC2::VPC'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `EC2::VPC
    Properties:`,
                        position: { line: 139, character: 15 },
                        description: 'Do not suggest when at :',
                        // should return nothing when at colon on Properties
                        verification: {
                            position: { line: 140, character: 15 },
                            expectation: CompletionExpectationBuilder.create().expectItems([]).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      `,
                        position: { line: 140, character: 15 },
                        description: 'Resource property',
                        verification: {
                            position: { line: 141, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Ci`,
                        position: { line: 141, character: 6 },
                        description: 'Resource property',
                        verification: {
                            position: { line: 141, character: 10 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `drBlock: !Ref Vpc`,
                        position: { line: 141, character: 10 },
                        description: 'Authored parameter',
                        verification: {
                            position: { line: 141, character: 25 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VpcCidr']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Cidr
      Enable`,
                        position: { line: 141, character: 25 },
                        description: 'Resource property',
                        verification: {
                            position: { line: 142, character: 12 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnableDnsHostnames', 'EnableDnsSupport'])
                                .expectExcludesItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `DnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - `,
                        position: { line: 142, character: 12 },
                        description: 'Should provide keys when at possible value or key location inside array',
                        verification: {
                            position: { line: 145, character: 10 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Key', 'Value']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Key: Name
          Value: !Sub "\${E}"`,
                        position: { line: 145, character: 10 },
                        description: 'Sub using authored parameter',
                        verification: {
                            position: { line: 146, character: 26 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 146, character: 26 }, end: { line: 146, character: 28 } },
                        description: 'Remove }"',
                    },
                    {
                        action: 'type',
                        content: `nvironmentName}-vpc"
        - K`,
                        position: { line: 146, character: 26 },
                        description: 'Nested resource property',
                        verification: {
                            position: { line: 147, character: 11 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Key']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ey: Environment
          Value: !Ref EnvironmentName
    Me`,
                        position: { line: 147, character: 26 },
                        description: 'Resource field expect ones already defined',
                        verification: {
                            position: { line: 149, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Metadata'])
                                .expectExcludesItems(['Type', 'Properties'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tadata:
      Purpose: "Main VPC"
      CreatedBy: "CloudFormation"

  # Test subnet with complex intrinsic functions
  PublicSubnet:
    Type: AWS::EC2::S`,
                        position: { line: 149, character: 6 },
                        description: 'Resource type',
                        verification: {
                            position: { line: 155, character: 21 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::EC2::SecurityGroup', 'AWS::EC2::Subnet'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ubnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select [0, !Ref SubnetCidrs]
      AvailabilityZone: !Select [0, !Ref AvailabilityZones]
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: !Sub
            - "\${EnvName}-public-subnet-\${AZ}"
            - EnvName: !Ref EnvironmentName
              AZ: !Select [0, !Ref AvailabilityZones]
        - Key: Type
          Value: Public
    Condition: Is`,
                        position: { line: 155, character: 21 },
                        description: 'Condition usage within Resource',
                        verification: {
                            position: { line: 169, character: 17 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ProductionOrStaging

  # Test security group with complex rules and references
  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: "Security group with complex rules"
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - Ip`,
                        position: { line: 169, character: 17 },
                        description: 'Suggest properties from $ref #/definitions/* under items from resource schema',
                        verification: {
                            position: { line: 178, character: 12 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['IpProtocol'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Protocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
          Description: "HTTP access"
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
          Description: "HTTPS access"
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          SourceSecurityGroupId: !Ref BastionSecurityGroup
          Description: "SSH from bastion"
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-web-sg"

  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: "Bastion security group"
      Vpc`,
                        position: { line: 178, character: 12 },
                        description: 'Resource property suggestion and omission of already authored property',
                        verification: {
                            position: { line: 204, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['VpcId'])
                                .expectExcludesItems(['GroupDescription'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Id: !Ref V`,
                        position: { line: 204, character: 9 },
                        description: 'Suggest resource logical ids when using Fn::Ref in Resource section',
                        verification: {
                            position: { line: 204, character: 19 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VPC']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `PC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0

  # Test launch template with complex user data and conditional properties
  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate
    Properties:
      LaunchTemplateName: !Sub "\${EnvironmentName}-template"
      LaunchTemplateData:
        ImageId: !FindInMap [RegionMap, !Ref AWS::Region, AMI]
        InstanceType: !FindInMap [RegionMap, !Ref AWS::Region, InstanceType]
        SecurityGroupIds:
          - !Ref WebSecurityGroup
        TagSpecifications:
          - ResourceType: instance
            Tags:
              - Key: Name
                Value: !Sub "\${EnvironmentName}-instance"
              - Key: Environment
                Value: !Ref EnvironmentName
    Me`,
                        position: { line: 204, character: 19 },
                        description: 'Suggest resource entity fields expect ones already defined',
                        verification: {
                            position: { line: 228, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Metadata'])
                                .expectExcludesItems(['Type', 'Properties'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tadata:
      AWS::CloudFormation::Designer:
        id: "launch-template-id"

  # Test Auto Scaling Group with complex configuration and policies
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup
    Properties:
      AutoScalingGroupName: !Sub "\${EnvironmentName}-asg"
      LaunchTemplate:
        `,
                        position: { line: 228, character: 6 },
                        description: 'Suggest sub properties when first key in nested object',
                        verification: {
                            position: { line: 238, character: 8 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Version']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `LaunchTemplateId: !Ref LaunchTemplate
        `,
                        position: { line: 238, character: 8 },
                        description: 'Suggest other keys when one key is already present',
                        verification: {
                            position: { line: 239, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Version'])
                                .expectExcludesItems(['LaunchTemplateId'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Version: !GetAtt L`,
                        position: { line: 239, character: 8 },
                        description:
                            'Suggest resource logical id when using Fn::GetAtt. Omit the resource being authored',
                        verification: {
                            position: { line: 239, character: 26 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'LaunchTemplate',
                                    'PublicSubnet',
                                    'WebSecurityGroup',
                                    'BastionSecurityGroup',
                                    'VPC',
                                ])
                                .expectExcludesItems(['AutoScalingGroup'])
                                .todo(`support autocomplete for Fn::GetAtt`)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `aunchTemplate.LatestVersionNumber
      DesiredCapacity: !Ref InstanceCount
      VPCZoneIdentifier:
        - !If [HasMultipleAZs, !Ref PublicSubnet, !Ref PublicSubnet]
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-asg"
          PropagateAtLaunch: false
        - Key: Environment
          Value: !Ref EnvironmentName
          PropagateAtLaunch: true
    Up`,
                        position: { line: 239, character: 26 },
                        description: 'Suggest Resource entity field UpdatePolicy',
                        verification: {
                            position: { line: 252, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['UpdatePolicy'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `datePolicy:
      A`,
                        position: { line: 252, character: 6 },
                        description: 'Suggest AutoScalingRollingUpdate in UpdatePolicy',
                        verification: {
                            position: { line: 253, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AutoScalingRollingUpdate'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `utoScalingRollingUpdate:
        M`,
                        position: { line: 253, character: 7 },
                        description: 'Suggest MinInstancesInService in UpdatePolicy',
                        verification: {
                            position: { line: 254, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['MinInstancesInService'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `inInstancesInService: 1
        M`,
                        position: { line: 254, character: 9 },
                        description: 'Suggest MaxBatchSize in UpdatePolicy',
                        verification: {
                            position: { line: 255, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['MaxBatchSize'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `axBatchSize: 2
        P`,
                        position: { line: 255, character: 9 },
                        description: 'Suggest PauseTime in UpdatePolicy',
                        verification: {
                            position: { line: 256, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['PauseTime'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `auseTime: PT5M
        W`,
                        position: { line: 256, character: 9 },
                        description: 'Suggest WaitOnResourceSignals in UpdatePolicy',
                        verification: {
                            position: { line: 257, character: 9 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['WaitOnResourceSignals'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `aitOnResourceSignals: true
    C`,
                        position: { line: 257, character: 9 },
                        description: 'Suggest Resource entity field UpdatePolicy',
                        verification: {
                            position: { line: 258, character: 5 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CreationPolicy', 'Condition'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `reationPolicy:
      R`,
                        position: { line: 258, character: 5 },
                        description: 'Test CreationPolicy suggests ResourceSignal',
                        verification: {
                            position: { line: 259, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['ResourceSignal'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `esourceSignal:
        C`,
                        position: { line: 259, character: 7 },
                        description: 'Test CreationPolicy suggests Count',
                        verification: {
                            position: { line: 260, character: 9 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Count']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ount: !Ref InstanceCount
        T`,
                        position: { line: 260, character: 9 },
                        description: 'Test CreationPolicy suggests Timeout',
                        verification: {
                            position: { line: 261, character: 9 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Timeout']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `imeout: PT10M

  # Test RDS with complex conditional properties
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      DBInstanceIdentifier: !Sub "\${EnvironmentName}-database"
      DBInstanceClass: !FindInMap [EnvironmentMap, !Ref EnvironmentName, DatabaseSize]
      Engine: mysql
      EngineVersion: "8.0"
      AllocatedStorage: !If [Is]`,
                        position: { line: 261, character: 9 },
                        description: 'Suggest condition in first argument of !If',
                        verification: {
                            position: { line: 271, character: 31 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 271, character: 31 }, end: { line: 271, character: 32 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `Production, 100, 20]
      StorageType: gp2
      StorageEncrypted: !If [IsProduction, true, false]
      MasterUsername: admin
      MasterUserPassword: !Ref D`,
                        position: { line: 271, character: 31 },
                        description: 'Ref a parameter while defining a resource property',
                        verification: {
                            position: { line: 275, character: 32 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DatabasePassword'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `atabasePassword
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      BackupRetentionPeriod: !If [IsProduction, 7, 1]
      MultiAZ: !Condition Is`,
                        position: { line: 275, character: 32 },
                        description: 'Suggest condition after !Condition while defining resource property',
                        verification: {
                            position: { line: 279, character: 28 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .todo(`not working even when testing not on last line of YAML`)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Production
      PubliclyAccessible: false
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-database"
        - Key: Environment
          Value: !Ref EnvironmentName
    DeletionPolicy: `,
                        position: { line: 279, character: 28 },
                        description: 'Suggest DeletionPolicy options',
                        verification: {
                            position: { line: 286, character: 20 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Delete', 'Retain', 'RetainExceptOnCreate', 'Snapshot'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `!If [IsProduction, S]`,
                        position: { line: 286, character: 20 },
                        description: 'Suggest DeletionPolicy option Snapshot for resources that support snapshot',
                        verification: {
                            position: { line: 286, character: 40 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Snapshot'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 286, character: 40 }, end: { line: 286, character: 41 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `napshot, D]`,
                        position: { line: 286, character: 40 },
                        description: 'Suggest DeletionPolicy option Delete',
                        verification: {
                            position: { line: 286, character: 50 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Delete']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 286, character: 50 }, end: { line: 286, character: 51 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `elete]
    UpdateReplacePolicy: !If [IsProduction, Snapshot, Delete]

  DatabaseSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: "Database security group"
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 3306
          ToPort: 3306
          SourceSecurityGroupId: !Ref WebSecurityGroup

  # Test Lambda with complex environment variables and VPC config
  LambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: !Sub "\${EnvironmentName}-function"
      Runtime: python3.9
      Handler: index.lambda_handler
      Role: !GetAtt LambdaRole.Arn
      Code:
        ZipFile: !Sub |
          import json
          import boto3
          
          def lambda_handler(event, context):
              return {
                  'statusCode': 200,
                  'body': json.dumps({
                      'environment': '\${EnvironmentName}',
                      'region': '\${AWS::Region}',
                      'database': '\${Database}'
                  })
              }
      Environment:
        Variables:
          ENVIRONMENT: !Ref EnvironmentName
          DATABASE_ENDPOINT: !GetAtt Database.`,
                        position: { line: 286, character: 50 },
                        description: 'Suggest readonly properties of Resource as Fn::GetAtt value',
                        verification: {
                            position: { line: 325, character: 46 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Endpoint.Address'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Endpoint.Address
          LOG_LEVEL: !FindInMap [EnvironmentMap, !Ref EnvironmentName, LogLevel]
          VPC_ID: !Ref VPC
      VpcConfig:
        SecurityGroupIds:
          - !Ref WebSecurityGroup
        SubnetIds:
          - !Ref PublicSubnet
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-lambda"
    Condition: IsProductionOrStaging

  # Test IAM role with complex policy
  LambdaRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub "\${EnvironmentName}-lambda-role"
      AssumeRolePolicyDocument:
        Ver`,
                        position: { line: 325, character: 46 },
                        description: 'No suggestions when in nested json with no schema definition',
                        verification: {
                            position: { line: 344, character: 11 },
                            expectation: CompletionExpectationBuilder.create().expectItems([]).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `sion: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
      Policies:
        - PolicyName: DatabaseAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - rds:DescribeDBInstances
                  - rds:DescribeDBClusters
                Resource: !Sub "arn:aws:rds:\${AWS::R}"`,
                        position: { line: 344, character: 11 },
                        description:
                            'suggest pseudo-parameter inside Fn::Sub while authoring deeply nested resource property',
                        verification: {
                            position: { line: 362, character: 52 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Region'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 362, character: 52 }, end: { line: 362, character: 54 } },
                        description: 'remove }"',
                    },
                    {
                        action: 'type',
                        content: `egion}:\${AWS::AccountId}:db:\${Database}"

  # Test CloudWatch alarm with complex dimensions and actions
  DatabaseAlarm:
    Type: AWS::CloudWatch::Alarm
    Properties:
      AlarmName: !Sub "\${EnvironmentName}-database-cpu"
      AlarmDescription: "Database CPU utilization alarm"
      MetricName: CPUUtilization
      Namespace: AWS/RDS
      Statistic: Average
      Period: 300
      EvaluationPeriods: 2
      Threshold: 80
      ComparisonOperator: GreaterThanThreshold
      Dimensions:
        - !If
            - IsProduction
            - `,
                        position: { line: 362, character: 52 },
                        description: 'Suggest Keys inside If',
                        verification: {
                            position: { line: 380, character: 14 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Value', 'Name']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Name: DBInstanceIdentifier
              Value: !Ref Database
            - Name: DBInstanceIdentifier
              `,
                        position: { line: 380, character: 14 },
                        description: 'Suggest Keys inside but filter out existing keys',
                        verification: {
                            position: { line: 384, character: 14 },
                            // this works in a real template but not in e2e testing
                            expectation: CompletionExpectationBuilder.create().expectItems(['Value']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Value: !Ref Database
      AlarmActions:
        - !Ref SNSTopic
      TreatMissingData: notBreaching
    Condition: IsProduction

  # Test SNS topic with complex attributes
  SNSTopic:
    Type: AWS::SNS::Topic
    Properties:
      TopicName: !Sub "\${EnvironmentName}-alerts"
      DisplayName: !Sub "\${EnvironmentName} Environment Alerts"
      KmsMasterKeyId: alias/aws/sns
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-alerts"
        - Key: Environment
          Value: !Ref EnvironmentName
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: my-bucket
      `,
                        position: { line: 383, character: 14 },
                        description: 'Do not resuggest only BucketName',
                        verification: {
                            position: { line: 405, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['BucketEncryption'])
                                .expectExcludesItems(['BucketName'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `VersioningConfiguration:
        Status: `,
                        position: { line: 405, character: 8 },
                        description: 'Suggest enum values when at null location',
                        verification: {
                            position: { line: 406, character: 18 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Enabled', 'Suspended'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
          `,
                        position: { line: 406, character: 18 },
                        description: 'Suggest enum values when in nested value position',
                        verification: {
                            position: { line: 407, character: 10 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Enabled', 'Suspended'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `'Enabled'
O`,
                        position: { line: 406, character: 18 },
                        description: 'Suggest Outputs top-level-section and omit authored sections',
                        verification: {
                            position: { line: 407, character: 1 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Outputs'])
                                .expectExcludesItems(['Conditions', 'Resources', 'Transform', 'Description'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `utputs:
  # Test all output types and complex references
  VPCId:
    Description: "ID of the VPC"
    V`,
                        position: { line: 407, character: 1 },
                        description: 'Suggest Output entity field Value',
                        verification: {
                            position: { line: 411, character: 5 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Value']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `alue: !Ref VPC
    Export:
      Name: !Sub "\${EnvironmentName}-VPC-ID"

  VPCCidr:
    Description: "CIDR block of the VPC"
    Value: !GetAtt VPC.CidrBlock
    Export:
      Name: !Sub "\${EnvironmentName}-VPC-CIDR"

  DatabaseEndpoint:
    Description: "RDS database endpoint"
    Value: !GetAtt Database.Endpoint.Address
    Export:
      Name: !Sub "\${EnvironmentName}-Database-Endpoint"
    Condition: Is`,
                        position: { line: 411, character: 5 },
                        description: 'Condition usage within Outputs',
                        verification: {
                            position: { line: 426, character: 17 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ProductionOrStaging

  # Test complex output with multiple functions
  ComplexOutput:
    Description: "Complex output demonstrating multiple functions"
    Value: !Sub
      - |
        Environment: \${Environment}
        VPC: \${VpcId} (\${VpcCidr})
        Subnets: \${SubnetList}
        Database: \${DbEndpoint}:\${DbPort}
        Instance Count: \${InstanceCount}
        Region AZs: \${AvailabilityZones}
        Max Scaling: \${MaxScaling}
      - Environment: !Ref E`,
                        position: { line: 426, character: 17 },
                        description: 'Ref parameter inside !Sub',
                        verification: {
                            position: { line: 442, character: 27 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `nvironmentName
        VpcId: !Ref VPC
        VpcCidr: !GetAtt VPC.`,
                        position: { line: 442, character: 27 },
                        description: 'GetAtt attribute returns all attributes',
                        verification: {
                            position: { line: 443, character: 29 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DefaultNetworkAcl', 'CidrBlockAssociations'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `CidrBlock
        SubnetList: !Join [", ", !Ref SubnetCidrs]
        DbEndpoint: !GetAtt Database.Endpoint.Address
        DbPort: !GetAtt Database.Endpoint.`,
                        position: { line: 443, character: 29 },
                        description: 'Ref parameter inside !Sub',
                        verification: {
                            position: { line: 446, character: 42 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Endpoint.Address', 'Endpoint.Port'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `Port
        InstanceCount: !Ref InstanceCount
        AvailabilityZones: !Join [", ", !Ref AvailabilityZones]

  # Test conditional output with complex logic
  ConditionalOutput:
    Description: "Output that only exists in production"
    Value: !If
      - IsProduction
      - !Sub 
        - "Production environment in \${Region} with \${Count} instances"
        - Region: !Ref AWS::Region
          Count: !Ref InstanceCount
      - !Ref AWS::NoValue
    Condition: IsProduction

  # Test output with complex nested functions
  NestedFunctionOutput:
    Description: "Output with deeply nested functions"
    Value: !Select
      - 0
      - !Split
        - ","
        - !Sub
          - "\${First},\${Second},\${Third}"
          - First: !FindInMap [RegionMap, !Ref AWS::Region, A]`,
                        position: { line: 446, character: 42 },
                        description: 'suggest Mapping second level key in deeply nested intrinsic function',
                        verification: {
                            position: { line: 471, character: 61 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['AMI']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 471, character: 61 }, end: { line: 471, character: 62 } },
                        description: 'remove ]',
                    },
                    {
                        action: 'type',
                        content: `MI]
            Second: !GetAtt Database.Endpoint.Address
            Th`,
                        position: { line: 471, character: 64 },
                        description: 'suggest substitution variable in second arg of Fn::Sub based on first arg',
                        verification: {
                            position: { line: 474, character: 14 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Third'])
                                .todo(
                                    `feature to suggest variables authored in Fn::Sub first arg while typing second arg`,
                                )
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('test nested object property completion', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Nested object property completion',
                steps: [
                    {
                        action: 'type',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      NotificationConfiguration:
        `,
                        position: { line: 0, character: 0 },
                        description: 'Test autocomplete in nested object within Properties',
                        verification: {
                            position: { line: 6, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'TopicConfigurations',
                                    'QueueConfigurations',
                                    'LambdaConfigurations',
                                    'EventBridgeConfiguration',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `TopicConfigurations:
          - Topic: arn:aws:sns:us-east-1:123456789012:my-topic
            Event: s3:ObjectCreated:*`,
                        position: { line: 6, character: 8 },
                        description: 'Complete the nested object structure',
                    },
                ],
            };
            template.executeScenario(scenario);
        });
    });

    describe('JSON', () => {
        it('Completion while authoring', () => {
            const template = new TemplateBuilder(DocumentType.JSON);

            const scenario: TemplateScenario = {
                name: 'Comprehensive template',
                steps: [
                    {
                        action: 'type',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "a"
}`,
                        position: { line: 0, character: 0 },
                        description: 'Suggest top level section',
                        verification: {
                            position: { line: 2, character: 3 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Parameters', 'Mappings', 'Transform', 'Metadata'])
                                .expectExcludesItems(['AWSTemplateFormatVersion'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Des`,
                        range: { start: { line: 2, character: 3 }, end: { line: 2, character: 4 } },
                        description: 'Suggest top level sections',
                        verification: {
                            position: { line: 2, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Description', 'Resources', 'Rules', 'Resources'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Description": "Comprehensive CloudFormation template showcasing ALL complex syntax - GOOD STATE",
  "Transform": [
    "AWS::Serverless-2016-10-31",
    "AWS::Include"
  ],
  "Me
}`,
                        range: { start: { line: 2, character: 3 }, end: { line: 7, character: 7 } },
                        description: 'Suggest top level section, only the ones that have not been already authored',
                        verification: {
                            position: { line: 7, character: 5 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems([
                                    'Metadata',
                                    'Parameters',
                                    'Resources',
                                    'Mappings',
                                    'Resources',
                                    'Parameters',
                                ])
                                .expectExcludesItems(['Transform', 'Description', 'AWSTemplateFormatVersion'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tadata": {
    "AWS::CloudFormation::Interface": {
      "ParameterGroups": [
        {
          "Label": {
            "Default": "Network Configuration"
          },
          "Parameters": [
            "VpcCidr",
            "EnvironmentName"
          ]
        }
      ],
      "ParameterLabels": {
        "VpcCidr": {
          "Default": "VPC CIDR Block"
        }
      }
    },
    "CustomMetadata": {
      "Version": "1.0.0",
      "ComplexObject": {
        "NestedArray": [
          "Item1",
          {
            "SubObject": {
              "Key1": "Value1",
              "Key2": "Value2"
            }
          }
        ]
      }
    }
  },
  "P`,
                        position: { line: 7, character: 5 },
                        verification: {
                            position: { line: 41, character: 4 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Parameters'])
                                .expectExcludesItems(['Description', 'Metadata', 'Transform'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `arameters": {
    "EnvironmentName": {
      "Type": "S
    }
  }`,
                        position: { line: 41, character: 4 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 43, character: 16 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['String', 'List<String>'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `tring",
      "Default": "production",
      "AllowedValues": ["development", "staging", "production"],
      "ConstraintDescription": "Must be development, staging, or production"
    },
    "VpcCidr": {
      "Type": "String",
      "Default": "10.0.0.0/16",
      "AllowedPattern": "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\\\\/(1[6-9]|2[0-8]))$"
    },
    "SubnetCidrs": {
      "Type": "C`,
                        position: { line: 43, character: 16 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 54, character: 16 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CommaDelimitedList'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ommaDelimitedList",
      "D"`,
                        position: { line: 54, character: 16 },
                        description: 'Parameter fields',
                        verification: {
                            position: { line: 55, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['Type'])
                                .expectContainsItems(['Default'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 55, character: 8 }, end: { line: 55, character: 9 } },
                        description: 'remove closing "',
                    },
                    {
                        action: 'type',
                        content: `efault": "10.0.1.0/24,10.0.2.0/24"
    },
    "DatabasePassword": {
      "Type": "String",
      "NoEcho": true,
      "MinLength": 8, 
      "M"`,
                        position: { line: 55, character: 8 },
                        description: 'Parameter fields',
                        verification: {
                            position: { line: 61, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['Type', 'NoEcho', 'MinLength'])
                                .expectContainsItems(['MaxLength'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 61, character: 8 }, end: { line: 61, character: 9 } },
                        description: 'remove closing "',
                    },
                    {
                        action: 'type',
                        content: `axLength": 128
    },
    "InstanceCount": {
      "Type": "Number",
      "Default": 2,
      "MinValue": 1,
      "MaxValue": 10
    },
    "AvailabilityZones": {
      "Type": "List<AWS::EC2::A`,
                        position: { line: 61, character: 8 },
                        description: 'Parameter types',
                        verification: {
                            position: { line: 70, character: 30 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'List<AWS::EC2::AvailabilityZone::Name>',
                                    'List<AWS::EC2::Image::Id>',
                                    'List<AWS::EC2::Instance::Id>',
                                    'List<AWS::EC2::SecurityGroup::GroupName>',
                                    'List<AWS::EC2::SecurityGroup::Id>',
                                    'List<AWS::EC2::Subnet::Id>',
                                    'List<AWS::EC2::VPC::Id>',
                                    'List<AWS::EC2::Volume::Id>',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `vailabilityZone::Name>",
      "Description": "List of AZs"`,
                        position: { line: 70, character: 31 },
                        description: 'Description of parameter',
                    },
                    {
                        action: 'type',
                        content: `},
    "SSMParameter": {
      "Type": "AWS::SSM::Parameter::Value<String>",
      "Default": "/myapp/config/database-url"
    },
    "BooleanParameter": {
      "Type": "String",
      "Default": "true",
      "AllowedValues": ["true", "false"]
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
        "DatabaseSize": "db.t3.micro",
        "LogLevel": "DEBUG"
      },
      "production": {
        "DatabaseSize": "db.t3.large",
        "LogLevel": "WARN"
      }
    }
  },
  "Conditions": {
    "IsProduction": {"Fn::E"`,
                        position: { line: 72, character: 4 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 106, character: 26 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Fn::Equals', 'Fn::EachMemberEquals', 'Fn::EachMemberIn'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 106, character: 27 }, end: { line: 106, character: 29 } },
                        description: 'remove }',
                    },
                    {
                        action: 'type',
                        content: `quals": [{"Ref": "E"}]},`,
                        position: { line: 106, character: 27 },
                        description: 'Ref parameter inside Fn::Equals',
                        verification: {
                            position: { line: 106, character: 45 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                .expectExcludesItems(['Vpc'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `EnvironmentName"}, "production"`,
                        range: { start: { line: 106, character: 45 }, end: { line: 106, character: 48 } },
                        description: 'Complete reference parameter and add production value',
                    },
                    {
                        action: 'type',
                        content: ` 
    "IsNotProduction": {"Fn::Not": [{"Condition": "Is"}]},`,
                        position: { line: 106, character: 79 },
                        description: 'Condition excluding self',
                        verification: {
                            position: { line: 107, character: 52 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectExcludesItems(['IsNotProduction'])
                                .expectContainsItems(['IsProduction'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `IsProduction`,
                        range: { start: { line: 107, character: 51 }, end: { line: 107, character: 53 } },
                        description: 'Complete condition reference',
                    },
                    {
                        action: 'type',
                        content: `
    "IsDevelopment": {"Fn::Equals": [{"Ref": "EnvironmentName"}, "development"]},
    "IsProductionOrStaging": {"Fn::Or": [
      {"Condition": "Is"}`,
                        position: { line: 107, character: 68 },
                        description: 'Add more conditions',
                        verification: {
                            position: { line: 110, character: 22 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['IsProduction', 'IsNotProduction', 'IsDevelopment'])
                                .expectExcludesItems(['IsProductionOrStaging'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `IsProduction`,
                        range: { start: { line: 110, character: 21 }, end: { line: 110, character: 23 } },
                        description: 'Complete condition reference',
                    },
                    {
                        action: 'type',
                        content: `,
      {"Fn::Equals": [{"Ref": "EnvironmentName"}, "staging"]}
    ]},
    "ComplexCondition": {"Fn::And": [
      {"Condition": "IsProductionOrStaging"},
      {"Fn::Not": [{"Condition": "IsDevelopment"}]},
      {"Fn::Equals": [{"Ref": "AWS::"}
    ]}`,
                        position: { line: 110, character: 35 },
                        description: 'Pseudo-parameter',
                        verification: {
                            position: { line: 116, character: 35 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Region'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `AWS::Region"}, "us-east-1"]}`,
                        range: { start: { line: 116, character: 31 }, end: { line: 116, character: 38 } },
                        description: 'Complete region reference',
                    },
                    {
                        action: 'type',
                        content: `,
    "HasMultipleAZs": {"Fn::Not": [{"Fn::Equals": [{"Fn::Select": [1, {"Ref": "A"}]}]}]}`,
                        position: { line: 117, character: 6 },
                        description: 'Complete region reference and add HasMultipleAZs condition',
                        verification: {
                            position: { line: 118, character: 78 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AvailabilityZones'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `AvailabilityZones`,
                        range: { start: { line: 118, character: 79 }, end: { line: 118, character: 80 } },
                        description: 'Complete reference parameter',
                    },
                    {
                        action: 'type',
                        content: `, false`,
                        position: { line: 118, character: 100 },
                        description: 'Complete conditional arguments',
                    },
                    {
                        action: 'type',
                        content: `},
  "Rules": {
    "ValidateRegionAndEnvironment": {
      "RuleCondition": {"Fn::Equals": [{"Ref": "AWS::Region"}, "us-east-1"]},
      "Assertions": [
        {
          "Assert": {"Fn::Contains": [
            ["t3.micro", "t3.small", "t3.medium"],
            {"Fi"}
          ]}
        }
      ]
    }
  }`,
                        position: { line: 119, character: 2 },
                        description: 'FindInMap intrinsic function name',
                        verification: {
                            position: { line: 127, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Fn::FindInMap'])
                                .todo('Completion provider not recognizing this as inIntrinsicFunction')
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 132, character: 2 }, end: { line: 132, character: 3 } },
                        description: 'Remove trailing }',
                    },
                    {
                        action: 'replace',
                        content: `"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "I"]`,
                        range: { start: { line: 127, character: 13 }, end: { line: 127, character: 17 } },
                        description: 'Complete FindInMap function with mapping name, region, and start of key',
                        verification: {
                            position: { line: 127, character: 69 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['InstanceType'])
                                .todo('Dynamic topLevelKey making secondLevelKey invalid')
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `InstanceType`,
                        range: { start: { line: 127, character: 69 }, end: { line: 127, character: 70 } },
                        description: 'Complete instanceType parameter',
                    },
                    {
                        action: 'type',
                        content: `
          ]},
          "AssertDescription": "Instance type must be valid for region"
        },
        {
          "Assert": {"Fn::And": [
            {"Fn::Not": [{"Fn::Equals": [{"Ref": "D"}]}]}`,
                        position: { line: 127, character: 84 },
                        description: 'Authored Parameter',
                        verification: {
                            position: { line: 133, character: 50 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DatabasePassword'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 133, character: 51 }, end: { line: 133, character: 57 } },
                        description: 'Remove ]}',
                    },
                    {
                        action: 'type',
                        content: `atabasePassword"}, ""]}]},
            {"Fn::N`,
                        position: { line: 133, character: 51 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 134, character: 18 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Fn::Not']).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ot": [{"Fn::E"}`,
                        position: { line: 134, character: 19 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 134, character: 31 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Fn::Equals'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 134, character: 32 }, end: { line: 134, character: 34 } },
                        description: 'Remove "}',
                    },
                    {
                        action: 'type',
                        content: `quals": [{"Ref": "V"}]}]}`,
                        position: { line: 134, character: 34 },
                        description: 'Intrinsic function name',
                        verification: {
                            position: { line: 134, character: 52 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VpcCidr']).build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `pcCidr"}, ""]}]}`,
                        range: { start: { line: 134, character: 51 }, end: { line: 134, character: 59 } },
                        description: 'Complete intrinsic function name and conditional argument',
                    },
                    {
                        action: 'type',
                        content: `,
    "ValidateParameterCombinations": {
      "Assertions": [
        {
          "Assert": {"Fn::Or": [
            {"Fn::Equals": [{"Ref": "EnvironmentName"}, "development"]},
            {"Fn::And": [
              {"Fn::Not": [{"Fn::Equals": [{"Ref": "EnvironmentName"}, "development"]}]},
              {"Fn::Not": [{"Fn::Equals": [{"Fn::Select": [1, {"Ref": "A"}]}, ""]}]}
            ]}
          ]},
          "AssertDescription": "Non-development environments must specify multiple availability zones"
        }
      ]
    }`,
                        position: { line: 138, character: 5 },
                        description: 'Authored Parameter',
                        verification: {
                            position: { line: 146, character: 71 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AvailabilityZones'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `AvailabilityZones`,
                        range: { start: { line: 146, character: 71 }, end: { line: 146, character: 72 } },
                        description: 'Replace A with AvailabilityZones',
                    },
                    {
                        action: 'type',
                        content: `
  },
  "Resources": {
    "VPC": {
      "Type": "AWS::
    }`,
                        position: { line: 152, character: 5 },
                        description: 'Add Resources section with VPC resource type',
                        verification: {
                            position: { line: 156, character: 18 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::EC2::VPC'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `EC2::VPC",
      "Properties":`,
                        position: { line: 156, character: 20 },
                        description: 'Complete VPC resource type and add Properties',
                        verification: {
                            position: { line: 157, character: 20 },
                            expectation: CompletionExpectationBuilder.create().expectItems([]).build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` {
        ""
      }`,
                        position: { line: 157, character: 20 },
                        description: 'Add newline and start property name',
                        verification: {
                            position: { line: 158, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: `type`,
                        content: `Ci`,
                        position: { line: 158, character: 9 },
                        description: 'Complete property name',
                        verification: {
                            position: { line: 158, character: 10 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 158, character: 11 }, end: { line: 158, character: 12 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `drBlock": {"Ref": "Vpc"}`,
                        position: { line: 158, character: 11 },
                        description: 'Complete CidrBlock property with Ref to parameter',
                        verification: {
                            position: { line: 158, character: 32 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VpcCidr']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 158, character: 33 }, end: { line: 158, character: 35 } },
                        description: 'Remove closing }',
                    },
                    {
                        action: 'type',
                        content: `Cidr"},
        "Enable"`,
                        position: { line: 158, character: 33 },
                        description: 'Add Enable properties to test DNS-related autocomplete',
                        verification: {
                            position: { line: 159, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnableDnsHostnames', 'EnableDnsSupport'])
                                .expectExcludesItems(['CidrBlock'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `DnsHostnames": true,
        "EnableDnsSupport": true,
        "Tags": [
          {
            ""
          }
        ]`,
                        range: { start: { line: 159, character: 15 }, end: { line: 159, character: 16 } },
                        description: 'Should provide keys when at possible value or key location inside array',
                        verification: {
                            position: { line: 163, character: 12 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Key', 'Value']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 163, character: 13 }, end: { line: 163, character: 14 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `Key": "Name",
            "Value": {"Fn::Sub": "\${E}"}`,
                        position: { line: 163, character: 13 },
                        description: 'Sub using authored parameter',
                        verification: {
                            position: { line: 164, character: 36 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 164, character: 37 }, end: { line: 164, character: 40 } },
                        description: 'Remove }"',
                    },
                    {
                        action: 'type',
                        content: `nvironmentName}-vpc"}
          },
          {
            "K"`,
                        position: { line: 164, character: 39 },
                        description: 'Nested resource property',
                        verification: {
                            position: { line: 167, character: 13 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Key']).build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 167, character: 14 }, end: { line: 167, character: 15 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `ey": "Environment",
            "Value": {"Ref": "EnvironmentName"}`,
                        position: { line: 167, character: 14 },
                        description: 'Resource field expect ones already defined',
                    },

                    {
                        action: 'type',
                        content: `,
    "M"`,
                        position: { line: 171, character: 7 },
                        description: 'Add Metadata section',
                        verification: {
                            position: { line: 172, character: 5 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Metadata'])
                                .expectExcludesItems(['Type', 'Properties'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 172, character: 7 }, end: { line: 172, character: 8 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `etadata": {
        "Purpose": "Main VPC",
        "CreatedBy": "CloudFormation"
      }
    },
    "PublicSubnet": {
      "Type": "AWS::EC2::S`,
                        position: { line: 172, character: 6 },
                        description: 'Resource type',
                        verification: {
                            position: { line: 178, character: 25 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::EC2::SecurityGroup', 'AWS::EC2::Subnet'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `ubnet"`,
                        range: { start: { line: 178, character: 26 }, end: { line: 178, character: 27 } },
                        description: '',
                    },
                    {
                        action: 'type',
                        content: `,
      "Properties": {
        "VpcId": {"Ref": "VPC"},
        "CidrBlock": {"Fn::Select": [0, {"Ref": "SubnetCidrs"}]},
        "AvailabilityZone": {"Fn::Select": [0, {"Ref": "AvailabilityZones"}]},
        "MapPublicIpOnLaunch": true,
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": [
              "\${EnvName}-public-subnet-\${AZ}",
              {
                "EnvName": {"Ref": "EnvironmentName"},
                "AZ": {"Fn::Select": [0, {"Ref": "AvailabilityZones"}]}
              }
            ]}
          },
          {
            "Key": "Type",
            "Value": "Public"
          }
        ]
      },
      "Condition": "Is`,
                        position: { line: 178, character: 33 },
                        description: 'Condition usage within Resource',
                        verification: {
                            position: { line: 201, character: 21 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ProductionOrStaging"`,
                        position: { line: 201, character: 22 },
                        description: 'Complete condition',
                    },
                    {
                        action: 'type',
                        content: `,
    "WebSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Security group with complex rules",
        "VpcId": {"Ref": "VPC"},
        "SecurityGroupIngress": [
          {
            "Ip"
          }
        ]
      }
    }`,
                        position: { line: 202, character: 5 },
                        description: 'Suggest properties from $ref #/definitions/* under items from resource schema',
                        verification: {
                            position: { line: 210, character: 14 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['IpProtocol'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 210, character: 15 }, end: { line: 210, character: 16 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `Protocol": "tcp",
            "FromPort": 80,
            "ToPort": 80,
            "CidrIp": "0.0.0.0/0",
            "Description": "HTTP access"
          },
          {
            "IpProtocol": "tcp",
            "FromPort": 443,
            "ToPort": 443,
            "CidrIp": "0.0.0.0/0",
            "Description": "HTTPS access"
          },
          {
            "IpProtocol": "tcp",
            "FromPort": 22,
            "ToPort": 22,
            "SourceSecurityGroupId": {"Ref": "BastionSecurityGroup"},
            "Description": "SSH from bastion"
          }
        ],
        "SecurityGroupEgress": [
          {
            "IpProtocol": "-1",
            "CidrIp": "0.0.0.0/0"
          }
        ],
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": "\${EnvironmentName}-web-sg"}`,
                        position: { line: 210, character: 15 },
                        description: 'Complete properties',
                    },
                    {
                        action: 'type',
                        content: `,
    "BastionSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Bastion security group",
        "Vpc"
      }
    }`,
                        position: { line: 244, character: 5 },
                        description: 'Resource property suggestion and omission of already authored property',
                        verification: {
                            position: { line: 249, character: 13 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['VpcId'])
                                .expectExcludesItems(['GroupDescription'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Id": {"Ref": "V"}`,
                        range: { start: { line: 249, character: 12 }, end: { line: 249, character: 13 } },
                        description: 'Suggest resource logical ids when using Fn::Ref in Resource section',
                        verification: {
                            position: { line: 249, character: 28 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['VPC']).build(),
                        },
                    },
                    {
                        action: `type`,
                        content: `PC`,
                        position: { line: 249, character: 27 },
                        description: 'Complete resource logical id',
                    },
                    {
                        action: 'type',
                        content: `,
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 22,
            "ToPort": 22,
            "CidrIp": "0.0.0.0/0"
          }
        ]`,
                        position: { line: 249, character: 31 },
                        description: 'Complete resource property',
                    },
                    {
                        action: 'type',
                        content: `,
    "LaunchTemplate": {
      "Type": "AWS::EC2::LaunchTemplate",
      "Properties": {
        "LaunchTemplateName": {"Fn::Sub": "\${EnvironmentName}-template"},
        "LaunchTemplateData": {
          "ImageId": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "AMI"]},
          "InstanceType": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "InstanceType"]},
          "SecurityGroupIds": [
            {"Ref": "WebSecurityGroup"}
          ],
          "TagSpecifications": [
            {
              "ResourceType": "instance",
              "Tags": [
                {
                  "Key": "Name",
                  "Value": {"Fn::Sub": "\${EnvironmentName}-instance"}
                },
                {
                  "Key": "Environment",
                  "Value": {"Ref": "EnvironmentName"}
                }
              ]
            }
          ]
        }
      },
      "Me"
    }`,
                        position: { line: 259, character: 5 },
                        description: 'Suggest resource entity fields expect ones already defined',
                        verification: {
                            position: { line: 287, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Metadata'])
                                .expectExcludesItems(['Type', 'Properties'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 287, character: 9 }, end: { line: 287, character: 10 } },
                        description: 'Remove closing quote to continue property name',
                    },
                    {
                        action: 'type',
                        content: `tadata": {
        "AWS::CloudFormation::Designer": {
          "id": "launch-template-id"
        }
      }`,
                        position: { line: 287, character: 9 },
                        description: 'Add Metadata section',
                    },
                    {
                        action: 'type',
                        content: `,
    "AutoScalingGroup": {
      "Type": "AWS::AutoScaling::AutoScalingGroup",
      "Properties": {
        "AutoScalingGroupName": {"Fn::Sub": "\${EnvironmentName}-asg"},
        "LaunchTemplate": {
          ""
        }
      }
    }`,
                        position: { line: 292, character: 5 },
                        description: 'Suggest sub properties when first key in nested object',
                        verification: {
                            position: { line: 298, character: 10 },
                            expectation: CompletionExpectationBuilder.create().expectItems(['Version']).build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `LaunchTemplateId": {"Ref": "LaunchTemplate"},
          ""`,
                        range: { start: { line: 298, character: 11 }, end: { line: 298, character: 12 } },
                        description: 'Suggest other keys when one key is already present',
                        verification: {
                            position: { line: 299, character: 10 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Version'])
                                .expectExcludesItems(['LaunchTemplateId'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Version": {"Fn::GetAtt": ["L"]}`,
                        range: { start: { line: 299, character: 11 }, end: { line: 299, character: 12 } },
                        description:
                            'Suggest resource logical id when using Fn::GetAtt. Omit the resource being authored',
                        verification: {
                            position: { line: 299, character: 38 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['LaunchTemplate', 'PublicSubnet'])
                                .expectExcludesItems(['AutoScalingGroup'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `aunchTemplate", "LatestVersionNumber`,
                        position: { line: 299, character: 39 },
                        description: 'Complete resource logical id',
                    },
                    {
                        action: 'type',
                        content: `,
        "DesiredCapacity": {"Ref": "InstanceCount"},
        "VPCZoneIdentifier": [
          {"Fn::If": ["HasMultipleAZs", {"Ref": "PublicSubnet"}, {"Ref": "PublicSubnet"}]}
        ],
        "HealthCheckType": "ELB",
        "HealthCheckGracePeriod": 300,
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": "\${EnvironmentName}-asg"},
            "PropagateAtLaunch": false
          },
          {
            "Key": "Environment",
            "Value": {"Ref": "EnvironmentName"},
            "PropagateAtLaunch": true
          }
        ]`,
                        position: { line: 300, character: 9 },
                        description: 'Suggest Resource entity field UpdatePolicy',
                    },
                    {
                        action: 'type',
                        content: `,
      "Up"`,
                        position: { line: 319, character: 7 },
                        description: 'Suggest UpdatePolicy entity field',
                        verification: {
                            position: { line: 320, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['UpdatePolicy'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `datePolicy": {
        "AutoScalingRollingUpdate": {
          "MinInstancesInService": 1,
          "MaxBatchSize": 2,
          "PauseTime": "PT5M",
          "WaitOnResourceSignals": true
        }
      },
      "C"`,
                        range: { start: { line: 320, character: 9 }, end: { line: 320, character: 10 } },
                        description: 'Suggest Resource entity field CreationPolicy',
                        verification: {
                            position: { line: 328, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['CreationPolicy', 'Condition'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `reationPolicy": {
        "ResourceSignal": {
          "Count": {"Ref": "InstanceCount"},
          "Timeout": "PT10M"
        }
      }
    },
    "Database": {
      "Type": "AWS::RDS::DBInstance",
      "Properties": {
        "DBInstanceIdentifier": {"Fn::Sub": "\${EnvironmentName}-database"},
        "DBInstanceClass": {"Fn::FindInMap": ["EnvironmentMap", {"Ref": "EnvironmentName"}, "DatabaseSize"]},
        "Engine": "mysql",
        "EngineVersion": "8.0",
        "AllocatedStorage": {"Fn::If": ["Is"]}
      }`,
                        range: { start: { line: 328, character: 8 }, end: { line: 328, character: 9 } },
                        description: 'Suggest condition in first argument of Fn::If',
                        verification: {
                            position: { line: 342, character: 42 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Production", 100, 20]},
        "StorageType": "gp2",
        "StorageEncrypted": {"Fn::If": ["IsProduction", true, false]},
        "MasterUsername": "admin",
        "MasterUserPassword": {"Ref": "D"}`,
                        range: { start: { line: 342, character: 43 }, end: { line: 342, character: 46 } },
                        description: 'Ref a parameter while defining a resource property',
                        verification: {
                            position: { line: 346, character: 39 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DatabasePassword'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `atabasePassword"},
        "VPCSecurityGroups": [
          {"Ref": "DatabaseSecurityGroup"}
        ],
        "BackupRetentionPeriod": {"Fn::If": ["IsProduction", 7, 1]},
        "MultiAZ": {"Condition": "Is"}`,
                        range: { start: { line: 346, character: 40 }, end: { line: 346, character: 42 } },
                        description: 'Suggest condition after Condition while defining resource property',
                        verification: {
                            position: { line: 351, character: 36 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .todo('Not returning anything')
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `Production"},
        "PubliclyAccessible": false,
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": "\${EnvironmentName}-database"}
          },
          {
            "Key": "Environment",
            "Value": {"Ref": "EnvironmentName"}
          }
        ]
      },
      "DeletionPolicy": {"Fn::If": ["IsProduction", "S"]}`,
                        range: { start: { line: 351, character: 36 }, end: { line: 351, character: 38 } },
                        description: 'Suggest DeletionPolicy option Snapshot for resources that support snapshot',
                        verification: {
                            position: { line: 364, character: 53 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Snapshot'])
                                .todo('Returns nothing in valid JSON')
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 364, character: 54 }, end: { line: 364, character: 57 } },
                        description: 'Remove "]}',
                    },
                    {
                        action: 'type',
                        content: `napshot", "Delete"]},
      "UpdateReplacePolicy": {"Fn::If": ["IsProduction", "Snapshot", "Delete"]}
    },
    "DatabaseSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Database security group",
        "VpcId": {"Ref": "VPC"},
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 3306,
            "ToPort": 3306,
            "SourceSecurityGroupId": {"Ref": "WebSecurityGroup"}
          }
        ]`,
                        position: { line: 364, character: 54 },
                        description: 'Complete deletion policy, add new security group.',
                    },
                    {
                        action: 'type',
                        content: `,
    "LambdaFunction": {
      "Type": "AWS::Lambda::Function",
      "Properties": {
        "FunctionName": {"Fn::Sub": "\${EnvironmentName}-function"},
        "Runtime": "python3.9",
        "Handler": "index.lambda_handler",
        "Role": {"Fn::GetAtt": ["LambdaRole", "Arn"]},
        "Code": {
          "ZipFile": {"Fn::Sub": "import json\\nimport boto3\\n\\ndef lambda_handler(event, context):\\n    return {\\n        'statusCode': 200,\\n        'body': json.dumps({\\n            'environment': '\${EnvironmentName}',\\n            'region': '\${AWS::Region}',\\n            'database': '\${Database}'\\n        })\\n    }"}
        },
        "Environment": {
          "Variables": {
            "ENVIRONMENT": {"Ref": "EnvironmentName"},
            "DATABASE_ENDPOINT": {"Fn::GetAtt": ["Database", ""]}
          }
        }
      }
    }`,
                        position: { line: 381, character: 5 },
                        description: 'Suggest readonly properties of Resource as Fn::GetAtt value',
                        verification: {
                            position: { line: 395, character: 61 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Endpoint.Address'])
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 395, character: 62 }, end: { line: 395, character: 65 } },
                        description: 'Remove "]}',
                    },
                    {
                        action: 'type',
                        content: `Endpoint.Address"]},
              "LOG_LEVEL": {"Fn::FindInMap": ["EnvironmentMap", {"Ref": "EnvironmentName"}, "LogLevel"]},
              "VPC_ID": {"Ref": "VPC"}`,
                        position: { line: 395, character: 62 },
                        description: 'Complete property of resource, add new variables',
                    },
                    {
                        action: 'type',
                        content: `,
        "VpcConfig": {
          "SecurityGroupIds": [
            {"Ref": "WebSecurityGroup"}
          ],
          "SubnetIds": [
            {"Ref": "PublicSubnet"}
          ]
        },
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": "\${EnvironmentName}-lambda"}
          }
        ]`,
                        position: { line: 398, character: 11 },
                        description: 'Complete tags, add new resource',
                    },
                    {
                        action: 'type',
                        content: `,
      "Condition": "IsProductionOrStaging"
      }
    },
    "LambdaRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "RoleName": {"Fn::Sub": "\${EnvironmentName}-lambda-role"},
        "AssumeRolePolicyDocument": {
          "Ver"
        }`,
                        position: { line: 413, character: 11 },
                        description: 'Complete IAM role, add new resource',
                        verification: {
                            position: { line: 422, character: 14 },
                            expectation: CompletionExpectationBuilder.create().expectItems([])
                            .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `sion": "2012-10-17",
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
        "ManagedPolicyArns": [
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
        ],
        "Policies": [
          {
            "PolicyName": "DatabaseAccess",
            "PolicyDocument": {
              "Version": "2012-10-17",
              "Statement": [
                {
                  "Effect": "Allow",
                  "Action": [
                    "rds:DescribeDBInstances",
                    "rds:DescribeDBClusters"
                  ],
                  "Resource": {"Fn::Sub": "arn:aws:rds:\${AWS::R"}
                }
              ]
            }
          }
        ]
      }`,
                        range: { start: { line: 422, character: 14 }, end: { line: 424, character: 7 } },
                        description:
                            'suggest pseudo-parameter inside Fn::Sub while authoring deeply nested resource property',
                        verification: {
                            position: { line: 449, character: 62 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['AWS::Region'])
                                .build(),
                        },
                    },
                    {
                      action: 'type',
                      position: { line: 449, character: 63 },
                      content: `egion`
                    },
                    {
                        action: 'type',
                        content: `,
    "DatabaseAlarm": {
      "Type": "AWS::CloudWatch::Alarm",
      "Properties": {
        "AlarmName": {"Fn::Sub": "\${EnvironmentName}-database-cpu"},
        "AlarmDescription": "Database CPU utilization alarm",
        "MetricName": "CPUUtilization",
        "Namespace": "AWS/RDS",
        "Statistic": "Average",
        "Period": 300,
        "EvaluationPeriods": 2,
        "Threshold": 80,
        "ComparisonOperator": "GreaterThanThreshold",
        "Dimensions": [
          {"Fn::If": [
            "IsProduction",
            {
              ""
            }
          ]}
        ]
      }
    }`,
                        position: { line: 456, character: 5 },
                        description: 'Suggest Keys inside If',
                        verification: {
                            position: { line: 473, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Value', 'Name'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `"Name": "DBInstanceIdentifier",
              "Value": {"Ref": "Database"}
            },
            {
              "Name": "DBInstanceIdentifier",
              ""`,
                        range: { start: { line: 473, character: 14 }, end: { line: 473, character: 16 } },
                        description: 'Suggest Keys inside but filter out existing keys',
                        verification: {
                            position: { line: 478, character: 15 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Value'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `"Value": {"Ref": "Database"}`,
                        range: { start: { line: 478, character: 14 }, end: { line: 478, character: 16 } },
                        description: 'Suggest Values inside but filter out existing values',
                    },
                    {
                        action: 'type',
                        position: { line: 481, character: 9 },
                        content: `,
        "AlarmActions": [
          {"Ref": "SNSTopic"}
        ],
        "TreatMissingData": "notBreaching"
      },
      "Condition": "IsProduction"
    },
    "SNSTopic": {
      "Type": "AWS::SNS::Topic",
      "Properties": {
        "TopicName": {"Fn::Sub": "\${EnvironmentName}-alerts"},
        "DisplayName": {"Fn::Sub": "\${EnvironmentName} Environment Alerts"},
        "KmsMasterKeyId": "alias/aws/sns",
        "Tags": [
          {
            "Key": "Name",
            "Value": {"Fn::Sub": "\${EnvironmentName}-alerts"}
          },
          {
            "Key": "Environment",
            "Value": {"Ref": "EnvironmentName"}
          }
        ]
      }
    },
    "Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "my-bucket",
        "":`,
                        description: 'Do not resuggest only BucketName',
                        verification: {
                            position: { line: 511, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['BucketEncryption'])
                                .expectExcludesItems(['BucketName'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 511, character: 8 }, end: { line: 511, character: 11 } },
                        content: `"VersioningConfiguration": {
          "Status": 
        }`,
                        description: 'Suggest enum values when at null location',
                        verification: {
                            position: { line: 512, character: 20 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Enabled', 'Suspended'])
                                .todo('Returns nothing in valid json')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
            `,
                        position: { line: 512, character: 19 },
                        description: 'Suggest enum values when in nested value position',
                        verification: {
                            position: { line: 513, character: 12 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Enabled', 'Suspended'])
                                .todo('Returns nothing')
                                .build(),
                        },
                    },
                    { 
                        action: 'type',
                        content: ` "Enabled"`,
                        position: { line: 512, character: 20 },
                        description: 'Suggest nested object property completion',
                    },
                    {
                        action: 'type',
                        position: { line: 514, character: 9 },
                        description: "Nested object property completion",
                        content: `,
        "NotificationConfiguration": {
          ""
        }`,
                        verification: {
                            position: { line: 516, character: 11 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'TopicConfigurations',
                                    'QueueConfigurations',
                                    'LambdaConfigurations',
                                    'EventBridgeConfiguration',
                                ])
                                .build(),
                        },
                    },
                    {
                      action: 'type',
                      content: `TopicConfigurations`,
                      position: { line: 516, character: 11 },
                      description: 'Suggest nested array item completion',
                    },
                    {
                        action: 'type',
                        content: `,
  "O"`,
                        position: { line: 520, character: 3 },
                        description: 'Suggest Outputs top-level-section and omit authored sections',
                        verification: {
                            position: { line: 521, character: 3 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Outputs'])
                                .expectExcludesItems(['Conditions', 'Resources', 'Transform', 'Description'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `"Outputs": {
    "VPCId": {
      "Description": "ID of the VPC",
      "V"
    }
  }`,
                        range: { start: { line: 521, character: 2 }, end: { line: 521, character: 5 } },
                        description: 'Suggest Output entity field Value',
                        verification: {
                            position: { line: 524, character: 8 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Value'])
                                .todo('Works in functional testing for both comprehensive.json and current doc')
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `"Value": {"Ref": "VPC"},
      "Export": {
        "Name": {"Fn::Sub": "\${EnvironmentName}-VPC-ID"}
      }
    },
    "VPCCidr": {
      "Description": "CIDR block of the VPC",
      "Value": {"Fn::GetAtt": ["VPC", "CidrBlock"]},
      "Export": {
        "Name": {"Fn::Sub": "\${EnvironmentName}-VPC-CIDR"}
      }
    },
    "DatabaseEndpoint": {
      "Description": "RDS database endpoint",
      "Value": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
      "Export": {
        "Name": {"Fn::Sub": "\${EnvironmentName}-Database-Endpoint"}
      },
      "Condition": "Is"`,
                        range: { start: { line: 524, character: 6 }, end: { line: 524, character: 9 } },
                        description: 'Condition usage within Outputs',
                        verification: {
                            position: { line: 542, character: 22 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'IsProduction',
                                    'IsNotProduction',
                                    'IsDevelopment',
                                    'IsProductionOrStaging',
                                ])
                                .expectExcludesItems(['ComplexCondition', 'HasMultipleAZs'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ProductionOrStaging`,
                        position: { line: 542, character: 22 },
                    },
                    {
                        action: 'type',
                        content: `,
    "ComplexOutput": {
      "Description": "Complex output demonstrating multiple functions",
      "Value": {"Fn::Sub": [
        "Environment: \${Environment}\\nVPC: \${VpcId} (\${VpcCidr})\\nSubnets: \${SubnetList}\\nDatabase: \${DbEndpoint}:\${DbPort}\\nInstance Count: \${InstanceCount}\\nRegion AZs: \${AvailabilityZones}\\nMax Scaling: \${MaxScaling}",
        {
          "Environment": {"Ref": "E"}
        }
      ]}
    }`,
                        position: { line: 543, character: 5 },
                        description: 'Ref parameter inside Fn::Sub',
                        verification: {
                            position: { line: 549, character: 35 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['EnvironmentName'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `nvironmentName"},
          "VpcId": {"Ref": "VPC"},
          "VpcCidr": {"Fn::GetAtt": ["VPC", ""]}`,
                        range: { start: { line: 549, character: 35 }, end: { line: 549, character: 37 } },
                        description: 'GetAtt attribute returns all attributes',
                        verification: {
                            position: { line: 551, character: 45 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['DefaultNetworkAcl', 'CidrBlockAssociations'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        content: `CidrBlock"]},
          "SubnetList": {"Fn::Join": [", ", {"Ref": "SubnetCidrs"}]},
          "DbEndpoint": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
          "DbPort": {"Fn::GetAtt": ["Database", "Endpoint."]}`,
                        range: { start: { line: 551, character: 45 }, end: { line: 551, character: 48 } },
                        description: 'Ref parameter inside Fn::Sub',
                        verification: {
                            position: { line: 554, character: 54 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Endpoint.Address', 'Endpoint.Port'])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 554, character: 58 }, end: { line: 554, character: 61 } },
                        content: `Port"]},
          "InstanceCount": {"Ref": "InstanceCount"},
          "AvailabilityZones": {"Fn::Join": [", ", {"Ref": "AvailabilityZones"}]}`,
                        description: 'Complete GetAtt Ref',
                    },
                    {
                        action: 'type',
                        content: `,
    "ConditionalOutput": {
      "Description": "Output that only exists in production",
      "Value": {"Fn::If": [
        "IsProduction",
        {"Fn::Sub": [
          "Production environment in \${Region} with \${Count} instances",
          {
            "Region": {"Ref": "AWS::Region"},
            "Count": {"Ref": "InstanceCount"}
          }
        ]},
        {"Ref": "AWS::NoValue"}
      ]},
      "Condition": "IsProduction"
    },
    "NestedFunctionOutput": {
      "Description": "Output with deeply nested functions",
      "Value": {"Fn::Select": [
        0,
        {"Fn::Split": [
          ",",
          {"Fn::Sub": [
            "\${First},\${Second},\${Third}",
            {
              "First": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "A"]}
            }
          ]}
        ]}
      ]}
    }`,
                        position: { line: 559, character: 5 },
                        description: 'suggest Mapping second level key in deeply nested intrinsic function',
                        verification: {
                            position: { line: 584, character: 79 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['AMI'])
                                .todo('Dynamic first level key making second key invalid')
                                .build(),
                        },
                    },
                    {
                        action: 'delete',
                        range: { start: { line: 584, character: 81 }, end: { line: 584, character: 84 } },
                        description: 'Remove "]}',
                    },

                    {
                        action: 'type',
                        content: `MI"]},
              "Second": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
              "Th`,
                        position: { line: 584, character: 81 },
                        description: 'suggest substitution variable in second arg of Fn::Sub based on first arg',
                        verification: {
                            position: { line: 586, character: 17 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectItems(['Third'])
                                .todo('Returns nothing')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `ird": "placeholder"`,
                        position: { line: 586, character: 18 },
                        description: 'Complete the JSON template',
                        verification: {
                            position: { line: 580, character: 35 },
                            expectation: CompletionExpectationBuilder.create().expectItems([]).build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });
    });
});
