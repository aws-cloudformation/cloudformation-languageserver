import { describe, expect, it } from 'vitest';
import { intrinsicFunctionsDocsMap } from '../../../src/artifacts/IntrinsicFunctionsDocs';
import { outputSectionFieldDocsMap } from '../../../src/artifacts/OutputSectionFieldDocs';
import { parameterAttributeDocsMap } from '../../../src/artifacts/ParameterAttributeDocs';
import { pseudoParameterDocsMap } from '../../../src/artifacts/PseudoParameterDocs';
import { resourceAttributeDocsMap } from '../../../src/artifacts/ResourceAttributeDocs';
import { creationPolicyPropertyDocsMap } from '../../../src/artifacts/resourceAttributes/CreationPolicyPropertyDocs';
import { deletionPolicyValueDocsMap } from '../../../src/artifacts/resourceAttributes/DeletionPolicyPropertyDocs';
import { updatePolicyPropertyDocsMap } from '../../../src/artifacts/resourceAttributes/UpdatePolicyPropertyDocs';
import { templateSectionDocsMap } from '../../../src/artifacts/TemplateSectionDocs';
import {
    TopLevelSection,
    IntrinsicFunction,
    PseudoParameter,
    ResourceAttribute,
    CreationPolicyProperty,
    ResourceSignalProperty,
    UpdatePolicyProperty,
    AutoScalingRollingUpdateProperty,
} from '../../../src/context/ContextType';
import { DocumentType } from '../../../src/document/Document';
import { HoverExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Hover Features', () => {
    describe('YAML', () => {
        it('Hover while authoring', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Comprehensive template hover',
                steps: [
                    {
                        action: 'type',
                        content: "AWSTemplateFormatVersion: '2010-09-09'",
                        position: { line: 0, character: 0 },
                        description: 'Type AWSTemplateFormatVersion section',
                        verification: {
                            position: { line: 0, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.AWSTemplateFormatVersion))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
Description: 'Comprehensive CloudFormation template showcasing ALL complex syntax - GOOD STATE'`,
                        position: { line: 0, character: 38 },
                        description: 'Type Description section',
                        verification: {
                            position: { line: 1, character: 5 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Description))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

# Test Transform with multiple values
Transform:
  - 'AWS::Serverless-2016-10-31'
  - 'AWS::Include'`,
                        position: { line: 1, character: 95 },
                        description: 'Type Transform section',
                        verification: {
                            position: { line: 4, character: 0 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Transform))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

# Test complex metadata structures
Metadata:
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
            Key2: Value2`,
                        position: { line: 6, character: 18 },
                        description: 'Type Metadata section',
                        verification: {
                            position: { line: 9, character: 0 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Metadata))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

# Test ALL parameter types and constraints
Parameters:
  EnvironmentName:
    Type: String
    Default: "production"
    AllowedValues: ["development", "staging", "production"]
    ConstraintDescription: "Must be development, staging, or production"

  VpcCidr:
    Type: String
    Default: "10.0.0.0/16"
    AllowedPattern: "^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\\\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\\\\/(1[6-9]|2[0-8]))$"

  SubnetCidrs:
    Type: CommaDelimitedList
    Default: "10.0.1.0/24,10.0.2.0/24"

  DatabasePassword:
    Type: String
    NoEcho: true
    MinLength: 8
    MaxLength: 128

  InstanceCount:
    Type: Number
    Default: 2
    MinValue: 1
    MaxValue: 10

  AvailabilityZones:
    Type: List<AWS::EC2::AvailabilityZone::Name>
    Description: "List of AZs"

  SSMParameter:
    Type: AWS::SSM::Parameter::Value<String>
    Default: "/myapp/config/database-url"

  BooleanParameter:
    Type: String
    Default: "true"
    AllowedValues: ["true", "false"]`,
                        position: { line: 27, character: 24 },
                        description: 'Type Parameters section',
                        verification: {
                            position: { line: 30, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Parameters))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Parameter logical ID provides information about the Parameter',
                        verification: {
                            position: { line: 31, character: 5 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Type:** String', '**Default Value:** "production"'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Type Parameter Atribute',
                        verification: {
                            position: { line: 32, character: 6 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Type'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Default Parameter Atribute',
                        verification: {
                            position: { line: 33, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Default'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on AllowedValues Parameter Atribute',
                        verification: {
                            position: { line: 34, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('AllowedValues'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on ConstraintDescription Parameter Atribute',
                        verification: {
                            position: { line: 35, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('ConstraintDescription'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on NoEcho Parameter Atribute',
                        verification: {
                            position: { line: 48, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('NoEcho'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MinLength Parameter Atribute',
                        verification: {
                            position: { line: 49, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MinLength'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MaxLength Parameter Atribute',
                        verification: {
                            position: { line: 50, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MaxLength'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MinValue Parameter Atribute',
                        verification: {
                            position: { line: 55, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MinValue'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MaxValue Parameter Atribute',
                        verification: {
                            position: { line: 56, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MaxValue'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Description Parameter Atribute',
                        verification: {
                            position: { line: 60, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Description'))
                                .build(),
                        },
                    },
                    //from here testing hover as soon as the hoverable text is typed instead of the full section
                    {
                        action: 'type',
                        content: `

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
      LogLevel: "WARN"`,
                        position: { line: 69, character: 36 },
                        description: 'Type Mappings section',
                        verification: {
                            position: { line: 72, character: 0 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Mappings))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

# Test ALL condition functions and complex nesting
Conditions:`,
                        position: { line: 87, character: 22 },
                        description: 'Type Conditions section',
                        verification: {
                            position: { line: 90, character: 0 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Conditions))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  IsProduction: !Equals`,
                        position: { line: 90, character: 11 },
                        description: 'Type Equals function for IsProduction',
                        verification: {
                            position: { line: 91, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Ref EnvironmentName, "production"]`,
                        position: { line: 91, character: 23 },
                        description: 'Type EnvironmentName parameter reference for IsProduction',
                        verification: {
                            position: { line: 91, character: 35 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    //'**Allowed Values:**',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  IsNotProduction: !Not [!Condition`,
                        position: { line: 91, character: 60 },
                        description: 'Type Not function for IsNotProduction',
                        verification: {
                            position: { line: 92, character: 22 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` IsProduction]
  IsDevelopment: !Equals`,
                        position: { line: 92, character: 35 },
                        description: 'Type Equals function for IsDevelopment',
                        verification: {
                            position: { line: 93, character: 22 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Ref`,
                        position: { line: 93, character: 24 },
                        description: 'Type Ref function for IsDevelopment',
                        verification: {
                            position: { line: 93, character: 29 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` EnvironmentName, "development"]`,
                        position: { line: 93, character: 30 },
                        description: 'Type EnvironmentName parameter reference for IsDevelopment',
                        verification: {
                            position: { line: 93, character: 40 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    '**Allowed Values:**',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  # Complex nested conditions
  IsProductionOrStaging: !Or`,
                        position: { line: 93, character: 62 },
                        description: 'Type Or function for IsProductionOrStaging',
                        verification: {
                            position: { line: 96, character: 27 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Or))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    - !Condition IsProduction
    - !Equals`,
                        position: { line: 96, character: 28 },
                        description: 'Type Equals function in IsProductionOrStaging condition',
                        verification: {
                            position: { line: 98, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Ref`,
                        position: { line: 98, character: 13 },
                        description: 'Type Ref function in IsProductionOrStaging condition',
                        verification: {
                            position: { line: 98, character: 17 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` EnvironmentName, "staging"]`,
                        position: { line: 98, character: 19 },
                        description: 'Type EnvironmentName parameter reference in staging condition',
                        verification: {
                            position: { line: 98, character: 28 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    '**Allowed Values:**',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  
  ComplexCondition: !And`,
                        position: { line: 98, character: 47 },
                        description: 'Type And function for ComplexCondition',
                        verification: {
                            position: { line: 100, character: 22 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.And))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    - !Condition IsProductionOrStaging`,
                        position: { line: 100, character: 24 },
                        description: 'Type Condition reference for IsProductionOrStaging',
                        verification: {
                            position: { line: 101, character: 25 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Condition**, IsProductionOrStaging'])
                                .todo(`hover on condition name reference for !Condition and not just Condition:`)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    - !Not`,
                        position: { line: 101, character: 38 },
                        description: 'Type Not function in ComplexCondition',
                        verification: {
                            position: { line: 102, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Condition IsDevelopment]
    - !Equals`,
                        position: { line: 102, character: 10 },
                        description: 'Type Equals function in ComplexCondition',
                        verification: {
                            position: { line: 103, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Ref`,
                        position: { line: 103, character: 13 },
                        description: 'Type Ref function for AWS::Region',
                        verification: {
                            position: { line: 103, character: 17 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` AWS::Region`,
                        position: { line: 103, character: 19 },
                        description: 'Type AWS::Region reference',
                        verification: {
                            position: { line: 103, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(pseudoParameterDocsMap.get(PseudoParameter.AWSRegion))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `, "us-east-1"]
  
  HasMultipleAZs: !Not`,
                        position: { line: 103, character: 31 },
                        description: 'Type Not function for HasMultipleAZs',
                        verification: {
                            position: { line: 105, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Equals`,
                        position: { line: 105, character: 22 },
                        description: 'Type Equals function for HasMultipleAZs',
                        verification: {
                            position: { line: 105, character: 28 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [!Select`,
                        position: { line: 105, character: 31 },
                        description: 'Type Select function for HasMultipleAZs',
                        verification: {
                            position: { line: 105, character: 36 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [1, !Ref`,
                        position: { line: 105, character: 40 },
                        description: 'Type Ref function for AvailabilityZones',
                        verification: {
                            position: { line: 105, character: 48 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` AvailabilityZones], ""]]`,
                        position: { line: 105, character: 49 },
                        description: 'Type AvailabilityZones parameter reference',
                        verification: {
                            position: { line: 105, character: 59 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** List<AWS::EC2::AvailabilityZone::Name>',
                                    'List of AZs',
                                    '```typescript\n(parameter) AvailabilityZones: string\n```',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

# Test rule validation with complex assertions
Rules:`,
                        position: { line: 105, character: 74 },
                        description: 'Type Rules section',
                        verification: {
                            position: { line: 108, character: 2 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Rules))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  ValidateRegionAndEnvironment:
    RuleCondition: !Equals [!Ref AWS::Region, "us-east-1"]
    Assertions:
      - Assert: !Contains`,
                        position: { line: 108, character: 6 },
                        description: 'Type Contains function in Rules assertion',
                        verification: {
                            position: { line: 112, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Contains))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
          - ["t3.micro", "t3.small", "t3.medium"]
          - !FindInMap`,
                        position: { line: 112, character: 25 },
                        description: 'Type FindInMap function in Rules assertion',
                        verification: {
                            position: { line: 114, character: 18 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.FindInMap))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [RegionMap, !Ref AWS::Region, InstanceType]`,
                        position: { line: 114, character: 22 },
                        description: 'Type RegionMap mapping reference',
                        verification: {
                            position: { line: 114, character: 29 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Mapping:** RegionMap')
                                .expectContainsText(['us-east-1', 'us-west-2'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        AssertDescription: "Instance type must be valid for region"
      - Assert: !And
          - !Not [!Equals [!Ref DatabasePassword, ""]]
          - !Not [!Equals [!Ref VpcCidr, ""]]
        AssertDescription: "Required parameters must not be empty"

  ValidateParameterCombinations:
    Assertions:
      - Assert: !Or
          - !Equals [!Ref EnvironmentName, "development"]
          - !And
            - !Not [!Equals [!Ref EnvironmentName, "development"]]
            - !Not [!Equals [!Select`,
                        position: { line: 114, character: 66 },
                        description: 'Type Select function in parameter validation',
                        verification: {
                            position: { line: 127, character: 34 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [1, !Ref AvailabilityZones], ""]]
        AssertDescription: "Non-development environments must specify multiple availability zones"
      - Assert: !Implies
          - !Equals [!Ref BooleanParameter, "true"]
          - !And
            - !Not [!Equals [!Ref InstanceCount, 1]]
            - !Not [!Equals [!Ref SSMParameter, ""]]
        AssertDescription: "When BooleanParameter is true, InstanceCount must be > 1 and SSMParameter must be provided"

Resources:`,
                        position: { line: 127, character: 36 },
                        description: 'Complete Rules assertions and type Resources section',
                        verification: {
                            position: { line: 136, character: 4 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Resources))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  # Test VPC with complex tagging and attributes
  VPC:
    Type: AWS::EC2::VPC`,
                        position: { line: 136, character: 10 },
                        description: 'Type AWS::EC2::VPC resource type',
                        verification: {
                            position: { line: 139, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::EC2::VPC')
                                .expectContainsText(['Specifies a virtual private cloud (VPC)'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 139, character: 23 },
                        description: 'Resource logical ID',
                        verification: {
                            position: { line: 138, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['```typescript\n(resource) VPC: string\n```'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:`,
                        position: { line: 139, character: 23 },
                        description: 'Type CidrBlock property',
                        verification: {
                            position: { line: 140, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CidrBlock'])
                                .expectContainsText(['Tags'])
                                .expectContainsText(['EnableDnsSupport'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      CidrBlock:`,
                        position: { line: 140, character: 16 },
                        description: 'Type CidrBlock property',
                        verification: {
                            position: { line: 141, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CidrBlock'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` !Ref VpcCidr
      EnableDnsHostnames:`,
                        position: { line: 141, character: 16 },
                        description: 'Type EnableDnsHostnames property',
                        verification: {
                            position: { line: 142, character: 14 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['EnableDnsHostnames'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` true
      EnableDnsSupport:`,
                        position: { line: 142, character: 25 },
                        description: 'Type EnableDnsSupport property',
                        verification: {
                            position: { line: 143, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['EnableDnsSupport'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` true
      Tags:`,
                        position: { line: 143, character: 23 },
                        description: 'Type Tags property',
                        verification: {
                            position: { line: 144, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Tags'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - Key:`,
                        position: { line: 144, character: 11 },
                        description: 'Type Key property in Tags array item',
                        verification: {
                            position: { line: 145, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Key'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` Name
          Value: !Sub`,
                        position: { line: 145, character: 14 },
                        description: 'Type Sub function in Tags',
                        verification: {
                            position: { line: 146, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Sub))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "\${EnvironmentName}-vpc"
        - Key: Environment
          Value: !Ref EnvironmentName
    Metadata:
      Purpose: "Main VPC"
      CreatedBy: "CloudFormation"

  # Test subnet with complex intrinsic functions
  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: !Select`,
                        position: { line: 146, character: 21 },
                        description: 'Type Select function in subnet properties',
                        verification: {
                            position: { line: 158, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [0, !Ref SubnetCidrs]
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
    Condition: IsProductionOrStaging

  # Test security group with complex rules and references
  WebSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: "Security group with complex rules"
      VpcId: !Ref VPC
      SecurityGroupIngress: 
        - IpProtocol: tcp
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
          SourceSecurityGroupId: !Ref BastionSecurityGroup`,
                        position: { line: 158, character: 24 },
                        description: 'Complete SecurityGroupIngress and type Ref function for BastionSecurityGroup',
                        verification: {
                            position: { line: 177, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['IpProtocol'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 191, character: 58 },
                        description: 'Verify hover on nested property inside array',
                        verification: {
                            position: { line: 178, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['type IpProtocol = string'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 191, character: 58 },
                        description: 'Verify hover on Ref function for BastionSecurityGroup',
                        verification: {
                            position: { line: 191, character: 36 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
          Description: "SSH from bastion"
      SecurityGroupEgress:
        - IpProtocol: -1
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-web-sg"

  BastionSecurityGroup:
    Type: AWS::EC2::SecurityGroup`,
                        position: { line: 191, character: 58 },
                        description: 'Type AWS::EC2::SecurityGroup for BastionSecurityGroup',
                        verification: {
                            position: { line: 201, character: 35 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::EC2::SecurityGroup')
                                .expectContainsText(['Resource Type definition for AWS::EC2::SecurityGroup'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      GroupDescription: "Bastion security group"
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0

  # Test launch template with complex user data and conditional properties
  LaunchTemplate:
    Type: AWS::EC2::LaunchTemplate`,
                        position: { line: 201, character: 35 },
                        description: 'Type AWS::EC2::LaunchTemplate resource type',
                        verification: {
                            position: { line: 213, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::EC2::LaunchTemplate')
                                .expectContainsText(['Specifies the properties for creating a launch template'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 213, character: 35 },
                        description: '!Ref VPC gets VPC information on hover',
                        verification: {
                            position: { line: 204, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Type:** AWS::EC2::VPC'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      LaunchTemplateName: !Sub "\${EnvironmentName}-template"
      LaunchTemplateData:
        ImageId: !FindInMap`,
                        position: { line: 213, character: 35 },
                        description: 'Type FindInMap function in LaunchTemplate',
                        verification: {
                            position: { line: 217, character: 18 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.FindInMap))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [RegionMap, !Ref AWS::Region, AMI]
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
    Metadata:
      AWS::CloudFormation::Designer:
        id: "launch-template-id"

  # Test Auto Scaling Group with complex configuration and policies
  AutoScalingGroup:
    Type: AWS::AutoScaling::AutoScalingGroup`,
                        position: { line: 217, character: 32 },
                        description:
                            'Complete LaunchTemplate properties and type AWS::AutoScaling::AutoScalingGroup resource type',
                        verification: {
                            position: { line: 234, character: 35 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::AutoScaling::AutoScalingGroup')
                                .expectContainsText(['defines an Amazon EC2 Auto Scaling group'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      AutoScalingGroupName: !Sub "\${EnvironmentName}-asg"
      LaunchTemplate:
        LaunchTemplateId: !Ref LaunchTemplate
        Version: !GetAtt `,
                        position: { line: 234, character: 44 },
                        description: 'Type GetAtt function for LaunchTemplate version',
                        verification: {
                            position: { line: 239, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `LaunchTemplate.LatestVersionNumber
      DesiredCapacity: !Ref InstanceCount`,
                        position: { line: 239, character: 25 },
                        description: 'Complete LaunchTemplate version and add DesiredCapacity',
                        verification: {
                            position: { line: 239, character: 30 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Resource:** LaunchTemplate')
                                .expectContainsText(['LaunchTemplate', 'AWS::EC2::LaunchTemplate'])
                                .todo(`Returns nothing`)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      VPCZoneIdentifier:
        - !If `,
                        position: { line: 240, character: 41 },
                        description: 'Type If function in VPCZoneIdentifier',
                        verification: {
                            position: { line: 242, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [HasMultipleAZs, !Ref PublicSubnet, !Ref PublicSubnet]`,
                        position: { line: 242, character: 13 },
                        description: 'Type If function with HasMultipleAZs condition',
                        verification: {
                            position: { line: 242, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Condition:** HasMultipleAZs')
                                .expectContainsText(['HasMultipleAZs', '!Not', '!Equals', '!Select'])
                                .todo(`Returns nothing`)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      HealthCheckType: ELB
      HealthCheckGracePeriod: 300
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-asg"
          PropagateAtLaunch: false
        - Key: Environment
          Value: !Ref EnvironmentName
          PropagateAtLaunch: true
    UpdatePolicy:
      AutoScalingRollingUpdate:
        MinInstancesInService: 1
        MaxBatchSize: 2
        PauseTime: PT5M
        WaitOnResourceSignals: true`,
                        position: { line: 242, character: 68 },
                        description: 'Type UpdatePolicy attribute',
                        verification: {
                            position: { line: 252, character: 11 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['UpdatePolicy', 'updates', 'AutoScalingRollingUpdate'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 257, character: 35 },
                        description: 'Hover on AutoScalingRollingUpdate in UpdatePolicy',
                        verification: {
                            position: { line: 253, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(
                                    updatePolicyPropertyDocsMap.get(UpdatePolicyProperty.AutoScalingRollingUpdate),
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 257, character: 35 },
                        description: 'Hover on MinInstancesInService in AutoScalingRollingUpdate inside UpdatePolicy',
                        verification: {
                            position: { line: 254, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(
                                    updatePolicyPropertyDocsMap.get(
                                        AutoScalingRollingUpdateProperty.MinInstancesInService,
                                    ),
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 257, character: 35 },
                        description: 'Hover on MaxBatchSize in AutoScalingRollingUpdate inside UpdatePolicy',
                        verification: {
                            position: { line: 255, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(
                                    updatePolicyPropertyDocsMap.get(AutoScalingRollingUpdateProperty.MaxBatchSize),
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 257, character: 35 },
                        description: 'Hover on PauseTime in AutoScalingRollingUpdate inside UpdatePolicy',
                        verification: {
                            position: { line: 256, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(
                                    updatePolicyPropertyDocsMap.get(AutoScalingRollingUpdateProperty.PauseTime),
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 257, character: 35 },
                        description: 'Hover on WaitonResourceSignals in AutoScalingRollingUpdate inside UpdatePolicy',
                        verification: {
                            position: { line: 257, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(
                                    updatePolicyPropertyDocsMap.get(
                                        AutoScalingRollingUpdateProperty.WaitOnResourceSignals,
                                    ),
                                )
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    CreationPolicy:
      ResourceSignal:
        Count: !Ref InstanceCount
        Timeout: PT10M`,
                        position: { line: 257, character: 35 },
                        description: 'Type CreationPolicy attribute',
                        verification: {
                            position: { line: 258, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CreationPolicy', 'creation', 'signal'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 261, character: 22 },
                        description: 'Hover on ResourceSignal in CreationPolicy',
                        verification: {
                            position: { line: 259, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(creationPolicyPropertyDocsMap.get(CreationPolicyProperty.ResourceSignal))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 261, character: 22 },
                        description: 'Hover on Count in CreationPolicy ResourceSignal',
                        verification: {
                            position: { line: 260, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(creationPolicyPropertyDocsMap.get(ResourceSignalProperty.Count))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 261, character: 22 },
                        description: 'Hover on Timeout in CreationPolicy ResourceSignal',
                        verification: {
                            position: { line: 261, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(creationPolicyPropertyDocsMap.get(ResourceSignalProperty.Timeout))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  # Test RDS with complex conditional properties
  Database:
    Type: AWS::RDS::DBInstance`,
                        position: { line: 261, character: 22 },
                        description: 'Complete CreationPolicy and type AWS::RDS::DBInstance resource type',
                        verification: {
                            position: { line: 265, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::RDS::DBInstance')
                                .expectContainsText(['creates an Amazon DB instance'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      DBInstanceIdentifier: !Sub "\${EnvironmentName}-database"
      DBInstanceClass: !FindInMap [EnvironmentMap, !Ref EnvironmentName, DatabaseSize]
      Engine: mysql
      EngineVersion: "8.0"
      AllocatedStorage: !If [IsProduction, 100, 20]
      StorageType: gp2
      StorageEncrypted: !If [IsProduction, true, false]
      MasterUsername: admin
      MasterUserPassword: !Ref DatabasePassword
      VPCSecurityGroups:
        - !Ref DatabaseSecurityGroup
      BackupRetentionPeriod: !If [IsProduction, 7, 1]
      MultiAZ: !Condition
      PubliclyAccessible: false
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-database"
        - Key: Environment
          Value: !Ref EnvironmentName
    DeletionPolicy: !If [IsProduction, Snapshot, Delete]
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
    Type: AWS::Lambda::Function`,
                        position: { line: 265, character: 30 },
                        description: 'Type AWS::Lambda::Function resource type',
                        verification: {
                            position: { line: 302, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::Lambda::Function')
                                .expectContainsText(['creates a Lambda function'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 302, character: 31 },
                        description: 'Hover Snapshot in DeletionPolicy Resource Attribute',
                        verification: {
                            position: { line: 286, character: 44 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(deletionPolicyValueDocsMap.get('Snapshot'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 302, character: 31 },
                        description: 'Hover Delete in DeletionPolicy Resource Attribute',
                        verification: {
                            position: { line: 286, character: 52 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(deletionPolicyValueDocsMap.get('Delete'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      FunctionName: !Sub "\${EnvironmentName}-function"
      Runtime: python3.9
      Handler: index.lambda_handler
      Role: !GetAtt`,
                        position: { line: 302, character: 31 },
                        description: 'Type GetAtt function for Lambda role',
                        verification: {
                            position: { line: 307, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` LambdaRole.Arn
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
          DATABASE_ENDPOINT: !GetAtt`,
                        position: { line: 307, character: 19 },
                        description:
                            'Complete Lambda environment variables and type GetAtt function for Database endpoint',
                        verification: {
                            position: { line: 325, character: 33 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` Database.Endpoint.Address
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
    Type: AWS::IAM::Role`,
                        position: { line: 325, character: 36 },
                        description: 'Type AWS::IAM::Role resource type',
                        verification: {
                            position: { line: 340, character: 19 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::IAM::Role')
                                .expectContainsText([
                                    'Creates a new role for your AWS-account',
                                    'AssumeRolePolicyDocument',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 340, character: 36 },
                        description: 'Type AssumeRolePolicyDocument property',
                        verification: {
                            position: { line: 329, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    'type SecurityGroupIds = string[]',
                                    '**Array size:** no limit to 5 items',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      RoleName: !Sub "\${EnvironmentName}-lambda-role"
      AssumeRolePolicyDocument:`,
                        position: { line: 340, character: 24 },
                        description: 'Type AssumeRolePolicyDocument property',
                        verification: {
                            position: { line: 343, character: 6 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['AssumeRolePolicyDocument', 'trust policy', 'assume', 'role'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: lambda.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:`,
                        position: { line: 343, character: 33 },
                        description: 'Type ManagedPolicyArns property',
                        verification: {
                            position: { line: 350, character: 6 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['ManagedPolicyArns', 'managed policies', 'ARN'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        - arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole
      Policies:`,
                        position: { line: 350, character: 24 },
                        description: 'Type Policies property',
                        verification: {
                            position: { line: 353, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Policies', 'inline policy document'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - PolicyName: DatabaseAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - rds:DescribeDBInstances
                  - rds:DescribeDBClusters
                Resource: !Sub "arn:aws:rds:\${AWS::Region}:\${AWS::AccountId}:db:\${Database}"

  # Test CloudWatch alarm with complex dimensions and actions
  DatabaseAlarm:
    Type: AWS::CloudWatch::Alarm`,
                        position: { line: 353, character: 24 },
                        description: 'Complete IAM role properties and type AWS::CloudWatch::Alarm resource type',
                        verification: {
                            position: { line: 366, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::CloudWatch::Alarm')
                                .expectContainsText(['specifies an alarm and associates it with the specified metric'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
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
        - Name: DBInstanceIdentifier
          Value: !Ref Database
      AlarmActions:
        - !Ref SNSTopic
      TreatMissingData: notBreaching
    Condition: IsProduction

  # Test SNS topic with complex attributes
  SNSTopic:
    Type: AWS::SNS::Topic`,
                        position: { line: 366, character: 32 },
                        description: 'Type AWS::SNS::Topic resource type',
                        verification: {
                            position: { line: 387, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::SNS::Topic')
                                .expectContainsText(['creates a topic to which notifications can be published'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Properties:
      TopicName: !Sub "\${EnvironmentName}-alerts"
      DisplayName: !Sub "\${EnvironmentName} Environment Alerts"
      KmsMasterKeyId: alias/aws/sns
      Tags:
        - Key: Name
          Value: !Sub "\${EnvironmentName}-alerts"
        - Key: Environment
          Value: !Ref EnvironmentName

Outputs:`,
                        position: { line: 387, character: 25 },
                        description: 'Complete SNS topic properties and type Outputs section',
                        verification: {
                            position: { line: 398, character: 0 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Outputs))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
  # Test all output types and complex references
  VPCId:
    Description: "ID of the VPC"
    Value: !Ref VPC
    Export:
      Name: !Sub "\${EnvironmentName}-VPC-ID"

  VPCCidr:
    Description: "CIDR block of the VPC"
    Value: !GetAtt`,
                        position: { line: 398, character: 8 },
                        description: 'Type GetAtt function for VPC CIDR',
                        verification: {
                            position: { line: 408, character: 17 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 408, character: 18 },
                        description: 'Test Hover for Description output section field',
                        verification: {
                            position: { line: 407, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Description'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 408, character: 18 },
                        description: 'Test Hover for Value output section field',
                        verification: {
                            position: { line: 408, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Value'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` VPC.CidrBlock
    Export:
      Name: !Sub "\${EnvironmentName}-VPC-CIDR"

  DatabaseEndpoint:
    Description: "RDS database endpoint"
    Value: !GetAtt`,
                        position: { line: 408, character: 18 },
                        description: 'Type GetAtt function for Database endpoint',
                        verification: {
                            position: { line: 414, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 414, character: 18 },
                        description: 'Test Hover for Export output section field',
                        verification: {
                            position: { line: 409, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Export'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` Database.Endpoint.Address
    Export:
      Name: !Sub "\${EnvironmentName}-Database-Endpoint"
    Condition: IsProductionOrStaging

  # Test complex output with multiple functions
  ComplexOutput:
    Description: "Complex output demonstrating multiple functions"
    Value: !Sub`,
                        position: { line: 414, character: 18 },
                        description: 'Type Sub function in complex output',
                        verification: {
                            position: { line: 422, character: 14 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Sub))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      - |
        Environment: \${Environment}
        VPC: \${VpcId} (\${VpcCidr})
        Subnets: \${SubnetList}
        Database: \${DbEndpoint}:\${DbPort}
        Instance Count: \${InstanceCount}
        Region AZs: \${AvailabilityZones}
        Max Scaling: \${MaxScaling}
      - Environment: !Ref EnvironmentName
        VpcId: !Ref VPC
        VpcCidr: !GetAtt VPC.CidrBlock
        SubnetList: !Join`,
                        position: { line: 422, character: 15 },
                        description: 'Complete Sub function parameters and type Join function',
                        verification: {
                            position: { line: 434, character: 25 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Join))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [", ", !Ref SubnetCidrs]
        DbEndpoint: !GetAtt Database.Endpoint.Address
        DbPort: !GetAtt Database.Endpoint.Port
        InstanceCount: !Ref InstanceCount
        AvailabilityZones: !Join [", ", !Ref AvailabilityZones]

  # Test conditional output with complex logic
  ConditionalOutput:
    Description: "Output that only exists in production"
    Value: !If`,
                        position: { line: 434, character: 25 },
                        description: 'Complete complex output parameters and type If function in conditional output',
                        verification: {
                            position: { line: 443, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      - IsProduction
      - !Sub 
        - "Production environment in \${Region} with \${Count} instances"
        - Region: !Ref AWS::Region
          Count: !Ref InstanceCount
      - !Ref`,
                        position: { line: 443, character: 14 },
                        description: 'Type Ref function for AWS::NoValue in conditional output',
                        verification: {
                            position: { line: 449, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` AWS::NoValue`,
                        position: { line: 449, character: 12 },
                        description: 'Type AWS::NoValue pseudo parameter',
                        verification: {
                            position: { line: 449, character: 18 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(pseudoParameterDocsMap.get(PseudoParameter.AWSNoValue))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
    Condition: IsProduction`,
                        position: { line: 449, character: 25 },
                        description: 'Type IsProduction condition in ConditionalOutput',
                        verification: {
                            position: { line: 450, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Condition:** IsProduction')
                                .expectContainsText([
                                    'IsProduction',
                                    "'!Equals'",
                                    "'!Ref': 'EnvironmentName'",
                                    "'production'",
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `

  # Test output with complex nested functions
  NestedFunctionOutput:
    Description: "Output with deeply nested functions"
    Value: !Select`,
                        position: { line: 450, character: 27 },
                        description: 'Complete conditional output and type Select function in nested output',
                        verification: {
                            position: { line: 455, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
      - 0
      - !Split`,
                        position: { line: 455, character: 18 },
                        description: 'Type Split function for nested output parsing',
                        verification: {
                            position: { line: 457, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Split))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `
        - ","
        - !Sub
          - "\${First},\${Second},\${Third}"
          - First: !FindInMap [RegionMap, !Ref AWS::Region, AMI]
            Second: !GetAtt Database.Endpoint.Address
            Third: !If [IsProduction, "prod", "dev"]`,
                        position: { line: 457, character: 14 },
                        description: 'Type If function in nested Sub parameters',
                        verification: {
                            position: { line: 463, character: 20 }, // Point to the '!' in '!If'
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });
    });

    describe('JSON', () => {
        it('Resource Type Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Resource Type Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 4, character: 14 },
                        verification: {
                            position: { line: 4, character: 20 }, // Position on "AWS::S3::Bucket"
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::S3::Bucket')
                                .expectContainsText(['The ``AWS::S3::Bucket`` resource creates an Amazon S3 bucket'])
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('Resource Property Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Resource Property Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "my-bucket"
      }
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 6, character: 8 },
                        verification: {
                            position: { line: 6, character: 12 }, // Position on "BucketName"
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['BucketName'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('Intrinsic Function Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Intrinsic Function Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {
          "Ref": "MyParameter"
        }
      }
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 7, character: 10 },
                        verification: {
                            position: { line: 7, character: 12 }, // Position on "Ref"
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Ref', 'reference'])
                                .expectMinLength(20)
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('Resource Attribute Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Resource Attribute Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "DependsOn": "MyOtherResource"
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 5, character: 6 },
                        verification: {
                            position: { line: 5, character: 10 }, // Position on "DependsOn"
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(resourceAttributeDocsMap.get(ResourceAttribute.DependsOn))
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('Template Section Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Template Section Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "MyParam": {
      "Type": "String"
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 2, character: 2 },
                        verification: {
                            position: { line: 2, character: 8 }, // Position on "Parameters"
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Parameters'])
                                .expectMinLength(5)
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('Fn::GetAtt Hover in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Fn::GetAtt Hover in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": {
          "Fn::GetAtt": ["MyOtherResource", "Arn"]
        }
      }
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 7, character: 10 },
                        verification: {
                            position: { line: 7, character: 15 }, // Position on "Fn::GetAtt"
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['GetAtt'])
                                .expectMinLength(5)
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });

        it('No Hover on Empty Space in JSON', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'No Hover on Empty Space in JSON',
                steps: [
                    {
                        action: 'initialize',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket"
    }
  }
}`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 7, character: 0 },
                        verification: {
                            position: { line: 7, character: 0 }, // Position on empty line
                            expectation: HoverExpectationBuilder.create().expectUndefined().build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);
        });
    });

    describe('Hover Infrastructure Tests', () => {
        it('HoverRouter Integration', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            template.initialize(`AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket`);

            // Test that hover router is working
            const hoverContent = template.getHoverAt({ line: 3, character: 15 });
            expect(hoverContent).toBeDefined();
            expect(hoverContent).toContain('AWS::S3::Bucket');
        });

        it('Multiple Hover Scenarios', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            template.initialize(`AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  MyParam:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref MyParam`);

            // Test 1: Resource type hover
            const resourceTypeHover = template.getHoverAt({ line: 6, character: 15 });
            expect(resourceTypeHover).toBeDefined();
            expect(resourceTypeHover).toContain('AWS::S3::Bucket');

            // Test 2: Intrinsic function hover
            const intrinsicHover = template.getHoverAt({ line: 8, character: 20 });
            expect(intrinsicHover).toBeDefined();
            expect(intrinsicHover).toContain('Ref');

            // Test 3: Template section hover
            const sectionHover = template.getHoverAt({ line: 1, character: 5 });
            expect(sectionHover).toBeDefined();
            expect(sectionHover).toContain('Parameters');

            // Test 4: No hover on empty space
            const emptyHover = template.getHoverAt({ line: 10, character: 0 });
            expect(emptyHover).toBeUndefined();
        });

        it('Parameter Reference Hover - Valid and Invalid Cases', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Parameter Reference Hover Tests',
                steps: [
                    {
                        action: 'initialize',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  BucketName:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketName`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 7, character: 25 },
                        description: 'Test valid parameter reference hover',
                        verification: {
                            position: { line: 8, character: 25 }, // Position on "BucketName" in !Ref BucketName
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Type:** String', 'BucketName'])
                                .build(),
                        },
                    },
                ],
            };
            template.executeScenario(scenario);

            // Test Case 2: Invalid parameter reference
            const invalidTemplate = new TemplateBuilder(DocumentType.YAML);
            const invalidScenario: TemplateScenario = {
                name: 'Invalid Parameter Reference Hover Test',
                steps: [
                    {
                        action: 'initialize',
                        content: `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  BucketName:
    Type: String
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref NonExistentParam`,
                    },
                    {
                        action: 'type',
                        content: '',
                        position: { line: 8, character: 25 },
                        description: 'Test invalid parameter reference hover should return undefined',
                        verification: {
                            position: { line: 7, character: 30 }, // Position on "NonExistentParam" in !Ref NonExistentParam
                            expectation: HoverExpectationBuilder.create().expectUndefined().build(),
                        },
                    },
                ],
            };
            invalidTemplate.executeScenario(invalidScenario);
        });

        it('HoverExpectationBuilder Functionality', () => {
            const expectation = HoverExpectationBuilder.create()
                .expectContainsText(['test', 'content'])
                .expectStartsWith('### ')
                .expectMinLength(10)
                .expectMaxLength(1000)
                .build();

            expect(expectation.containsText).toEqual(['test', 'content']);
            expect(expectation.startsWith).toBe('### ');
            expect(expectation.minLength).toBe(10);
            expect(expectation.maxLength).toBe(1000);
        });
    });

<<<<<<< Updated upstream
    describe('Comprehensive JSON', () => {
=======
    describe('JSON', () => {
>>>>>>> Stashed changes
        it('Hover while authoring', () => {
            const template = new TemplateBuilder(DocumentType.JSON);
            const scenario: TemplateScenario = {
                name: 'Comprehensive template hover',
                steps: [
                    {
                        action: 'type',
                        content: `{
  "AWSTemplateFormatVersion": "2010-09-09"
}`,
                        position: { line: 0, character: 0 },
                        description: 'Type AWSTemplateFormatVersion section',
                        verification: {
                            position: { line: 1, character: 14 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.AWSTemplateFormatVersion))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `,
  "Description": "Comprehensive CloudFormation template showcasing ALL complex syntax - GOOD STATE"`,
                        position: { line: 1, character: 42 },
                        description: 'Type Description section',
=======
                        action: 'type', 
                        content: `,
  "Description": "Comprehensive CloudFormation template showcasing ALL complex syntax - GOOD STATE"`,
                        position: { line: 1, character: 42 }, 
                        description: 'Type Description section', 
>>>>>>> Stashed changes
                        verification: {
                            position: { line: 2, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Description))
                                .build(),
                        },
<<<<<<< Updated upstream
                    },
=======
                    }, 
>>>>>>> Stashed changes
                    {
                        action: 'type',
                        content: `,
  "Transform": [
    "AWS::Serverless-2016-10-31",
    "AWS::Include"
  ]`,
                        position: { line: 2, character: 99 },
                        description: 'Type Transform section',
                        verification: {
                            position: { line: 3, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Transform))
                                .build(),
                        },
<<<<<<< Updated upstream
                    },
=======
                    }, 
>>>>>>> Stashed changes
                    {
                        action: 'type',
                        content: `,
  "Metadata": {
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
  }`,
                        position: { line: 6, character: 3 },
                        description: 'Type Metadata section',
                        verification: {
                            position: { line: 7, character: 2 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Metadata))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
  "Parameters": {
    "EnvironmentName": {
      "Type": "String",
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
      "Type": "CommaDelimitedList",
       "Default": "10.0.1.0/24,10.0.2.0/24"
    },
    "DatabasePassword": {
      "Type": "String",
      "NoEcho": true,
      "MinLength": 8, 
      "MaxLength": 128
    },
    "InstanceCount": {
      "Type": "Number",
      "Default": 2,
      "MinValue": 1,
      "MaxValue": 10
    },
    "AvailabilityZones": {
      "Type": "List<AWS::EC2::AvailabilityZone::Name>",
      "Description": "List of AZs"
    },
    "SSMParameter": {
      "Type": "AWS::SSM::Parameter::Value<String>",
      "Default": "/myapp/config/database-url"
    },
    "BooleanParameter": {
      "Type": "String",
      "Default": "true",
      "AllowedValues": ["true", "false"]
    }
  }`,
                        position: { line: 40, character: 3 },
                        description: 'Type Parameter types',
                        verification: {
                            position: { line: 41, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Parameters))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Parameter logical ID provides information about the Parameter',
                        verification: {
                            position: { line: 42, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Type:** String', '**Default Value:** "production"'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Type Parameter Atribute',
                        verification: {
                            position: { line: 43, character: 8 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Type'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Default Parameter Atribute',
                        verification: {
                            position: { line: 44, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Default'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on AllowedValues Parameter Atribute',
                        verification: {
                            position: { line: 45, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('AllowedValues'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on ConstraintDescription Parameter Atribute',
                        verification: {
                            position: { line: 46, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('ConstraintDescription'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on NoEcho Parameter Atribute',
                        verification: {
                            position: { line: 59, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('NoEcho'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MinLength Parameter Atribute',
                        verification: {
                            position: { line: 60, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MinLength'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MaxLength Parameter Atribute',
                        verification: {
                            position: { line: 61, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MaxLength'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MinValue Parameter Atribute',
                        verification: {
                            position: { line: 66, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MinValue'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on MaxValue Parameter Atribute',
                        verification: {
                            position: { line: 67, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('MaxValue'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 69, character: 36 },
                        description: 'Hover on Description Parameter Atribute',
                        verification: {
                            position: { line: 71, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(parameterAttributeDocsMap.get('Description'))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `,
=======
                      action: 'type',
                      content: `,
>>>>>>> Stashed changes
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
  }`,
<<<<<<< Updated upstream
                        position: { line: 82, character: 3 },
                        description: 'Type Mappings section',
                        verification: {
=======
                      position: { line: 82, character: 3 },
                      description: 'Type Mappings section', 
                      verification: {
>>>>>>> Stashed changes
                            position: { line: 83, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Mappings))
                                .build(),
                        },
<<<<<<< Updated upstream
                    },
                    {
                        action: 'type',
                        content: `,
  "Conditions": {
  }`,
                        position: { line: 104, character: 3 },
                        description: 'Type Conditions section',
                        verification: {
=======
                    }, 
                    {
                      action: 'type', 
                      content: `,
  "Conditions": {
  }`,                 position: { line: 104, character: 3 }, 
                      description: 'Type Conditions section', 
                      verification: {
>>>>>>> Stashed changes
                            position: { line: 105, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Conditions))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `
    "IsProduction": {"Fn::Equals"}`,
                        position: { line: 105, character: 17 },
                        description: 'Type Equals function for IsProduction',
                        verification: {
=======
                      action: 'type', 
                      content: `
    "IsProduction": {"Fn::Equals"}`, 
                      position: {line: 105, character: 17}, 
                      description: 'Type Equals function for IsProduction', 
                      verification: {
>>>>>>> Stashed changes
                            position: { line: 106, character: 30 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `: [{"Ref": "EnvironmentName"}, "production"]`,
                        position: { line: 106, character: 33 },
                        description: 'Type EnvironmentName parameter reference for IsProduction',
                        verification: {
=======
                      action: 'type', 
                      content: `: [{"Ref": "EnvironmentName"}, "production"]`, 
                      position: {line: 106, character: 33 },
                      description: 'Type EnvironmentName parameter reference for IsProduction', 
                      verification: {
>>>>>>> Stashed changes
                            position: { line: 106, character: 50 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
<<<<<<< Updated upstream
                    },
=======
                    }, 
>>>>>>> Stashed changes
                    {
                        action: 'type',
                        content: `, 
    "IsNotProduction": {"Fn::Not": [{"Condition": `,
                        position: { line: 106, character: 78 },
                        description: 'Type Not function for IsNotProduction',
                        verification: {
                            position: { line: 107, character: 31 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "IsProduction"}]},
    "IsDevelopment": {"Fn::Equals":`,
                        position: { line: 107, character: 50 },
                        description: 'Type Equals function for IsDevelopment',
                        verification: {
                            position: { line: 108, character: 30 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Ref":`,
                        position: { line: 108, character: 35 },
                        description: 'Type Ref function for IsDevelopment',
                        verification: {
                            position: { line: 108, character: 40 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "EnvironmentName"}, "development"]}`,
                        position: { line: 108, character: 44 },
                        description: 'Type EnvironmentName parameter reference for IsDevelopment',
                        verification: {
                            position: { line: 108, character: 54 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    '**Allowed Values:**',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "IsProductionOrStaging": {"Fn::Or":`,
                        position: { line: 108, character: 80 },
                        description: 'Type Or function for IsProductionOrStaging',
                        verification: {
                            position: { line: 109, character: 36 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Or))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [
      {"Condition": "IsProduction"},
      {"Fn::Equals":
    ]}`,
                        position: { line: 109, character: 39 },
                        description: 'Type Equals function in IsProductionOrStaging condition',
                        verification: {
                            position: { line: 111, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Ref":]}`,
                        position: { line: 111, character: 20 },
                        description: 'Type Ref function in IsProductionOrStaging condition',
                        verification: {
                            position: { line: 111, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "EnvironmentName"}, "staging"`,
                        position: { line: 111, character: 29 },
                        description: 'Type EnvironmentName parameter reference in staging condition',
                        verification: {
                            position: { line: 111, character: 38 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** String',
                                    '**Default Value:** "production"',
                                    '**Allowed Values:**',
                                    '- development',
                                    '- staging',
                                    '- production',
                                    '**Constraint Description:** Must be development, staging, or production',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "ComplexCondition": {"Fn::And":`,
                        position: { line: 112, character: 6 },
                        description: 'Type And function for ComplexCondition',
                        verification: {
                            position: { line: 113, character: 32 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.And))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [
      {"Condition": "IsProductionOrStaging"}`,
                        position: { line: 113, character: 35 },
                        description: 'Type Condition reference for IsProductionOrStaging',
                        verification: {
                            position: { line: 114, character: 28 },
                            expectation: HoverExpectationBuilder.create()
                                //todo: hover on condition name reference for !Condition and not just Condition:
                                .expectContainsText(['**Condition**, IsProductionOrStaging'])
                                .todo()
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
      {"Fn::Not":`,
                        position: { line: 114, character: 44 },
                        description: 'Type Not function in ComplexCondition',
                        verification: {
                            position: { line: 115, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Condition": "IsDevelopment"}]},
      {"Fn::Equals":`,
                        position: { line: 115, character: 17 },
                        description: 'Type Equals function in ComplexCondition',
                        verification: {
                            position: { line: 116, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Ref":}]}`,
                        position: { line: 116, character: 20 },
                        description: 'Type Ref function for AWS::Region',
                        verification: {
                            position: { line: 116, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "AWS::Region"}`,
                        position: { line: 116, character: 29 },
                        description: 'Type AWS::Region reference',
                        verification: {
                            position: { line: 116, character: 39 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(pseudoParameterDocsMap.get(PseudoParameter.AWSRegion))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `, "us-east-1"]}
    ]},
    "HasMultipleAZs": {"Fn::Not":`,
                        position: { line: 116, character: 44 },
                        description: 'Type Not function for HasMultipleAZs',
                        verification: {
                            position: { line: 118, character: 30 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Not))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Fn::Equals":`,
                        position: { line: 118, character: 33 },
                        description: 'Type Equals function for HasMultipleAZs',
                        verification: {
                            position: { line: 118, character: 44 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Equals))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [{"Fn::Select":`,
                        position: { line: 118, character: 49 },
                        description: 'Type Select function for HasMultipleAZs',
                        verification: {
                            position: { line: 118, character: 61 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [1, {"Ref":`,
                        position: { line: 118, character: 65 },
                        description: 'Type Ref function for AvailabilityZones',
                        verification: {
                            position: { line: 118, character: 73 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "AvailabilityZones"`,
                        position: { line: 118, character: 77 },
                        description: 'Type AvailabilityZones parameter reference',
                        verification: {
                            position: { line: 118, character: 87 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    '**Type:** List<AWS::EC2::AvailabilityZone::Name>',
                                    'List of AZs',
                                    '```typescript\n(parameter) AvailabilityZones: string\n```',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `, false]}]}
  },
  "Rules":`,
                        position: { line: 118, character: 100 },
                        description: 'Type Rules section',
                        verification: {
                            position: { line: 120, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Rules))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` {
    "ValidateRegionAndEnvironment": {
      "RuleCondition": {"Fn::Equals": [{"Ref": "AWS::Region"}, "us-east-1"]},
      "Assertions": [
        {
          "Assert": {"Fn::Contains":`,
                        position: { line: 120, character: 10 },
                        description: 'Type Contains function in Rules assertion',
                        verification: {
                            position: { line: 125, character: 29 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Contains))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [
            ["t3.micro", "t3.small", "t3.medium"],
            {"Fn::FindInMap":}
          ]}
        }
      ]
    }`,
                        position: { line: 125, character: 36 },
                        description: 'Type FindInMap function in Rules assertion',
                        verification: {
                            position: { line: 127, character: 23 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.FindInMap))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` ["RegionMap", {"Ref": "AWS::Region"}, "InstanceType"]`,
                        position: { line: 127, character: 29 },
                        description: 'Type RegionMap mapping reference',
                        verification: {
                            position: { line: 127, character: 37 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Mapping:** RegionMap')
                                .expectContainsText(['us-east-1', 'us-west-2'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
          "AssertDescription": "Instance type must be valid for region"
        },
        {
          "Assert": {"Fn::And": [
            {"Fn::Not": [{"Fn::Equals": [{"Ref": "DatabasePassword"}, ""]}]},
            {"Fn::Not": [{"Fn::Equals": [{"Ref": "VpcCidr"}, ""]}]}
          ]}
        }
      ]
    },
    "ValidateParameterCombinations": {
      "Assertions": [
        {
          "Assert": {"Fn::Or": [
            {"Fn::Equals": [{"Ref": "EnvironmentName"}, "development"]},
            {"Fn::And": [
              {"Fn::Not": [{"Fn::Equals": [{"Ref": "EnvironmentName"}, "development"]}]},
              {"Fn::Not": [{"Fn::Equals": [{"Fn::Select":`,
                        position: { line: 128, character: 12 },
                        description: 'Type Select function in parameter validation',
                        verification: {
                            position: { line: 146, character: 52 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: ` [1, {"Ref": "AvailabilityZones"}]}, ""]}]}
            ]}
          ]},
          "AssertDescription": "Non-development environments must specify multiple availability zones"`,
                        position: { line: 146, character: 57 },
                        description: 'Type non-development environment validation',
=======
                      action: 'type', 
                      content: ` [1, {"Ref": "AvailabilityZones"}]}, ""]}]}
            ]}
          ]},
          "AssertDescription": "Non-development environments must specify multiple availability zones"`,
                      position: { line: 146, character: 57 },
                      description: 'Type non-development environment validation',
>>>>>>> Stashed changes
                    },
                    {
                        action: 'type',
                        content: `,
  "Resources":`,
                        position: { line: 153, character: 3 },
                        description: 'Complete Rules assertions and type Resources section',
                        verification: {
                            position: { line: 154, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Resources))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` {
    "VPC": {
      "Type": "AWS::EC2::VPC"`,
                        position: { line: 154, character: 14 },
                        description: 'Type AWS::EC2::VPC resource type',
                        verification: {
                            position: { line: 156, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::EC2::VPC')
                                .expectContainsText(['Specifies a virtual private cloud (VPC)'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 139, character: 23 },
                        description: 'Resource logical ID',
                        verification: {
                            position: { line: 155, character: 5 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['```typescript\n(resource) VPC: string\n```'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
      "Properties":`,
                        position: { line: 156, character: 29 },
                        description: 'Type CidrBlock property',
                        verification: {
                            position: { line: 157, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CidrBlock'])
                                .expectContainsText(['Tags'])
                                .expectContainsText(['EnableDnsSupport'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` {
        "CidrBlock":`,
                        position: { line: 157, character: 19 },
                        description: 'Type CidrBlock property',
                        verification: {
                            position: { line: 158, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CidrBlock'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` {"Ref": "VpcCidr"},
        "EnableDnsHostnames":
      }
    }
  }`,
                        position: { line: 158, character: 20 },
                        description: 'Type EnableDnsHostnames property',
                        verification: {
                            position: { line: 159, character: 17 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['EnableDnsHostnames'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` true,
        "EnableDnsSupport":`,
                        position: { line: 159, character: 29 },
                        description: 'Type EnableDnsSupport property',
                        verification: {
                            position: { line: 160, character: 17 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['EnableDnsSupport'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` true,
        "Tags":`,
                        position: { line: 160, character: 27 },
                        description: 'Type Tags property',
                        verification: {
                            position: { line: 161, character: 12 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Tags'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` [
          {
            "Key":
          }
        ]`,
                        position: { line: 161, character: 15 },
                        description: 'Type Key property in Tags array item',
                        verification: {
                            position: { line: 163, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Key'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "Name",
            "Value": {"Fn::Sub":`,
                        position: { line: 163, character: 18 },
                        description: 'Type Sub function in Tags',
                        verification: {
                            position: { line: 164, character: 28 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Sub))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` "\${EnvironmentName}-vpc"}`,
                        position: { line: 164, character: 32 },
                        description: 'Type Select function in subnet properties',
                    },
                    {
                        action: 'type',
                        content: `,
          {
            "Key": "Environment",
            "Value": {"Ref": "EnvironmentName"}
          }`,
                        position: { line: 165, character: 11 },
                        description: 'Type Select function in subnet properties',
                    },
                    {
                        action: 'type',
                        content: `,
      "Metadata": {
        "Purpose": "Main VPC",
        "CreatedBy": "CloudFormation"
      }
    },
    "PublicSubnet": {
      "Type": "AWS::EC2::Subnet",
      "Properties": {
        "VpcId": {"Ref": "VPC"},
        "CidrBlock": {"Fn::Select":}
      }`,
                        position: { line: 171, character: 7 },
                        description: 'Type Select function in subnet properties',
                        verification: {
                            position: { line: 181, character: 30 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'delete',
                        range: { start: { line: 181, character: 35 }, end: { line: 181, character: 36 } },
                        description: 'Remove extra }',
=======
                      action: 'delete',
                      range: { start: { line: 181, character: 35 }, end: { line: 181, character: 36 }},
                      description: 'Remove extra }', 
>>>>>>> Stashed changes
                    },
                    {
                        action: 'type',
                        content: ` [0, {"Ref": "SubnetCidrs"}]},
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
        ]`,
                        position: { line: 181, character: 35 },
                        description: 'Type Select function in subnet properties',
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `,
      "Condition": "IsProductionOrStaging"`,
                        position: { line: 200, character: 7 },
                        description: '',
=======
                      action: 'type',
                      content:`,
      "Condition": "IsProductionOrStaging"`,
                      position: {line: 200, character: 7},
                      description:''
>>>>>>> Stashed changes
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
            "IpProtocol": "tcp",
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
            "SourceSecurityGroupId": {"Ref": "BastionSecurityGroup"}`,
                        position: { line: 202, character: 5 },
                        description: 'Complete SecurityGroupIngress and type Ref function for BastionSecurityGroup',
                        verification: {
                            position: { line: 208, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['IpProtocol'])
                                .expectMinLength(10)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 191, character: 58 },
                        description: 'Verify hover on nested property inside array',
                        verification: {
                            position: { line: 210, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['type IpProtocol = string'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 191, character: 58 },
                        description: 'Verify hover on Ref function for BastionSecurityGroup',
                        verification: {
                            position: { line: 227, character: 39 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: `,
=======
                      action: 'type',
                      content: `,
>>>>>>> Stashed changes
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
            "Value": {"Fn::Sub": "\${EnvironmentName}-web-sg"}
          }
        ]
      }
    },
    "BastionSecurityGroup": {
      "Type": "AWS::EC2::SecurityGroup",
      "Properties": {
        "GroupDescription": "Bastion security group",
        "VpcId": {"Ref": "VPC"},
        "SecurityGroupIngress": [
          {
            "IpProtocol": "tcp",
            "FromPort": 22,
            "ToPort": 22,
            "CidrIp": "0.0.0.0/0"
          }
        ]
      }
    },
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
      "Metadata": {
        "AWS::CloudFormation::Designer": {
          "id": "launch-template-id"
        }
      }
<<<<<<< Updated upstream
    }`,
                        position: { line: 227, character: 68 },
                        description: 'Type Launch template and Metada',
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 277, character: 68 },
                        description: 'Verify hover on AWS::EC2::SecurityGroup',
                        verification: {
=======
    }`, 
                      position: { line: 227, character: 68}, 
                      description: 'Type Launch template and Metada'
                    },
                    {
                      action: 'type', 
                      content: ``,
                      position: { line: 277, character: 68},
                      description: 'Verify hover on AWS::EC2::SecurityGroup',
                      verification: {
>>>>>>> Stashed changes
                            position: { line: 246, character: 25 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::EC2::SecurityGroup')
                                .expectContainsText(['Resource Type definition for AWS::EC2::SecurityGroup'])
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: ``,
                        position: { line: 277, character: 68 },
                        description: '!Ref VPC gets VPC information on hover',
=======
                      action: 'type', 
                      content: ``,
                      position: { line: 277, character: 68},
                      description: '!Ref VPC gets VPC information on hover',
>>>>>>> Stashed changes
                        verification: {
                            position: { line: 249, character: 26 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['**Type:** AWS::EC2::VPC'])
                                .build(),
                        },
                    },
                    {
<<<<<<< Updated upstream
                        action: 'type',
                        content: ``,
                        position: { line: 277, character: 68 },
                        description: 'Verify hover on FindInMap function in LaunchTemplate',
=======
                      action: 'type', 
                      content: ``,
                      position: { line: 277, character: 68},
                      description: 'Verify hover on FindInMap function in LaunchTemplate',
>>>>>>> Stashed changes
                        verification: {
                            position: { line: 265, character: 27 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.FindInMap))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "AutoScalingGroup": {
      "Type": "AWS::AutoScaling::AutoScalingGroup",
      "Properties": {
        "AutoScalingGroupName": {"Fn::Sub": "\${EnvironmentName}-asg"},
        "LaunchTemplate": {
          "LaunchTemplateId": {"Ref": "LaunchTemplate"},
          "Version": {"Fn::GetAtt": ["LaunchTemplate", "LatestVersionNumber"]}
        },
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
        ]
      }`,
                        position: { line: 292, character: 5 },
<<<<<<< Updated upstream
                        description: 'Type AWS::AutoScaling::AutoScalingGroup resource type',
=======
                        description:
                            'Type AWS::AutoScaling::AutoScalingGroup resource type',
>>>>>>> Stashed changes
                        verification: {
                            position: { line: 294, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::AutoScaling::AutoScalingGroup')
                                .expectContainsText(['defines an Amazon EC2 Auto Scaling group'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 234, character: 44 },
                        description: 'Verify hover on GetAtt function for LaunchTemplate version',
                        verification: {
                            position: { line: 299, character: 27 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 239, character: 25 },
                        description: 'Verify hover on LaunchTemplate version',
                        verification: {
                            position: { line: 299, character: 42 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Resource:** LaunchTemplate')
                                .expectContainsText(['LaunchTemplate', 'AWS::EC2::LaunchTemplate'])
                                .todo()
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 240, character: 41 },
                        description: 'Verify hover on If function in VPCZoneIdentifier',
                        verification: {
                            position: { line: 303, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 242, character: 13 },
                        description: 'Verify hover on HasMultipleAZs condition',
                        verification: {
                            position: { line: 303, character: 23 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Condition:** HasMultipleAZs')
                                .expectContainsText(['HasMultipleAZs', '!Not', '!Equals', '!Select'])
                                .todo()
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
      "UpdatePolicy": {
        "AutoScalingRollingUpdate": {
          "MinInstancesInService": 1,
          "MaxBatchSize": 2,
          "PauseTime": "PT5M",
          "WaitOnResourceSignals": true
        }
      }`,
                        position: { line: 319, character: 7 },
                        description: 'Type UpdatePolicy attribute',
                        verification: {
                            position: { line: 320, character: 13 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['UpdatePolicy', 'updates', 'AutoScalingRollingUpdate'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
      "CreationPolicy": {
        "ResourceSignal": {
          "Count": {"Ref": "InstanceCount"},
          "Timeout": "PT10M"
        }
      }
    }`,
                        position: { line: 327, character: 7 },
                        description: 'Type CreationPolicy attribute',
                        verification: {
                            position: { line: 328, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['CreationPolicy', 'creation', 'signal'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "Database": {
      "Type": "AWS::RDS::DBInstance"`,
                        position: { line: 334, character: 5 },
                        description: 'Type AWS::RDS::DBInstance resource type',
                        verification: {
                            position: { line: 336, character: 16 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::RDS::DBInstance')
                                .expectContainsText(['creates an Amazon DB instance'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
      "Properties": {
        "DBInstanceIdentifier": {"Fn::Sub": "\${EnvironmentName}-database"},
        "DBInstanceClass": {"Fn::FindInMap": ["EnvironmentMap", {"Ref": "EnvironmentName"}, "DatabaseSize"]},
        "Engine": "mysql",
        "EngineVersion": "8.0",
        "AllocatedStorage": {"Fn::If": ["IsProduction", 100, 20]},
        "StorageType": "gp2",
        "StorageEncrypted": {"Fn::If": ["IsProduction", true, false]},
        "MasterUsername": "admin",
        "MasterUserPassword": {"Ref": "DatabasePassword"},
        "VPCSecurityGroups": [
          {"Ref": "DatabaseSecurityGroup"}
        ],
        "BackupRetentionPeriod": {"Fn::If": ["IsProduction", 7, 1]},
        "MultiAZ": {"Fn::If": ["IsProduction", true, false]},
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
      "DeletionPolicy": {"Fn::If": ["IsProduction", "Snapshot", "Delete"]},
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
        ]
      }
    },
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
            "DATABASE_ENDPOINT": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
            "LOG_LEVEL": {"Fn::FindInMap": ["EnvironmentMap", {"Ref": "EnvironmentName"}, "LogLevel"]},
            "VPC_ID": {"Ref": "VPC"}
          }
        },
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
        ]
      },
      "Condition": "IsProductionOrStaging"
    }`,
                        position: { line: 336, character: 36 },
                        description: 'Type AWS::Lambda::Function resource type',
                        verification: {
                            position: { line: 383, character: 24 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::Lambda::Function')
                                .expectContainsText(['creates a Lambda function'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 307, character: 19 },
<<<<<<< Updated upstream
                        description: 'Verify hover on GetAtt function for Database endpoint',
=======
                        description:
                            'Verify hover on GetAtt function for Database endpoint',
>>>>>>> Stashed changes
                        verification: {
                            position: { line: 395, character: 39 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "LambdaRole": {
      "Type": "AWS::IAM::Role",
      "Properties": {
        "RoleName": {"Fn::Sub": "\${EnvironmentName}-lambda-role"},
        "AssumeRolePolicyDocument": {
          "Version": "2012-10-17",
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
                  "Resource": {"Fn::Sub": "arn:aws:rds:\${AWS::Region}:\${AWS::AccountId}:db:\${Database}"}
                }
              ]
            }
          }
        ]
      }
    }`,
                        position: { line: 416, character: 5 },
                        description: 'Type AWS::IAM::Role resource type',
                        verification: {
                            position: { line: 419, character: 23 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::IAM::Role')
                                .expectContainsText([
                                    'Creates a new role for your AWS-account',
                                    'AssumeRolePolicyDocument',
                                ])
                                .todo()
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 340, character: 36 },
                        description: 'Verify hover on AssumeRolePolicyDocument property',
                        verification: {
                            position: { line: 401, character: 14 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText([
                                    'type SecurityGroupIds = string[]',
                                    '**Array size:** no limit to 5 items',
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 340, character: 24 },
                        description: 'Type AssumeRolePolicyDocument property',
                        verification: {
                            position: { line: 421, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['AssumeRolePolicyDocument', 'trust policy', 'assume', 'role'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 343, character: 33 },
                        description: 'Verify hover on ManagedPolicyArns property',
                        verification: {
                            position: { line: 433, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['ManagedPolicyArns', 'managed policies', 'ARN'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 350, character: 24 },
                        description: 'Verify hover on Policies property',
                        verification: {
                            position: { line: 437, character: 9 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContainsText(['Policies', 'inline policy document'])
                                .build(),
                        },
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
          {
            "Name": "DBInstanceIdentifier",
            "Value": {"Ref": "Database"}
          }
        ],
        "AlarmActions": [
          {"Ref": "SNSTopic"}
        ],
        "TreatMissingData": "notBreaching"
      },
      "Condition": "IsProduction"
    }`,
                        position: { line: 456, character: 5 },
                        description: 'Verify hover on AWS::CloudWatch::Alarm resource type',
                        verification: {
                            position: { line: 458, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::CloudWatch::Alarm')
                                .expectContainsText(['specifies an alarm and associates it with the specified metric'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
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
  }`,
                        position: { line: 481, character: 5 },
                        description: 'Type AWS::SNS::Topic resource type',
                        verification: {
                            position: { line: 483, character: 15 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('### AWS::SNS::Topic')
                                .expectContainsText(['creates a topic to which notifications can be published'])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `, 
  "Outputs": {
    "VPCId": {
      "Description": "ID of the VPC",
      "Value": {"Ref": "VPC"},
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
      "Condition": "IsProductionOrStaging"
    },
    "ComplexOutput": {
      "Description": "Complex output demonstrating multiple functions",
      "Value": {"Fn::Sub": [
        "Environment: \${Environment}\\nVPC:\${VpcId} (\${VpcCidr})\\nSubnets: \${SubnetList}\\nDatabase: \${DbEndpoint}:\${DbPort}\\nInstance Count: \${InstanceCount}\\nRegion AZs: \${AvailabilityZones}\\nMax Scaling: \${MaxScaling}\\n",
        {
          "Environment": {"Ref": "EnvironmentName"},
          "VpcId": {"Ref": "VPC"},
          "VpcCidr": {"Fn::GetAtt": ["VPC", "CidrBlock"]},
          "SubnetList": {"Fn::Join": [", ", {"Ref": "SubnetCidrs"}]},
          "DbEndpoint": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
          "DbPort": {"Fn::GetAtt": ["Database", "Endpoint.Port"]},
          "InstanceCount": {"Ref": "InstanceCount"},
          "AvailabilityZones": {"Fn::Join": [", ", {"Ref": "AvailabilityZones"}]}
        }
      ]}
    },
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
    }
  }`,
                        position: { line: 500, character: 3 },
                        description: 'Type Outputs section',
                        verification: {
                            position: { line: 501, character: 3 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(templateSectionDocsMap.get(TopLevelSection.Outputs))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 398, character: 8 },
                        description: 'Test hover on GetAtt function for VPC CIDR',
                        verification: {
                            position: { line: 511, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 408, character: 18 },
                        description: 'Test Hover for Description output section field',
                        verification: {
                            position: { line: 510, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Description'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 408, character: 18 },
                        description: 'Test Hover for Value output section field',
                        verification: {
                            position: { line: 511, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Value'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 408, character: 18 },
                        description: 'Test hover on GetAtt function for Database endpoint',
                        verification: {
                            position: { line: 518, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 414, character: 18 },
                        description: 'Test Hover for Export output section field',
                        verification: {
                            position: { line: 519, character: 7 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(outputSectionFieldDocsMap.get('Export'))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 414, character: 18 },
                        description: 'Type Sub function in complex output',
                        verification: {
                            position: { line: 526, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Sub))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 422, character: 15 },
                        description: 'Test hover on Join function',
                        verification: {
                            position: { line: 536, character: 37 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Join))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 434, character: 25 },
                        description: 'Test hover on If function in conditional output',
                        verification: {
                            position: { line: 542, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 443, character: 14 },
                        description: 'Test hover on Ref function for AWS::NoValue in conditional output',
                        verification: {
                            position: { line: 551, character: 10 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ` AWS::NoValue`,
                        position: { line: 449, character: 12 },
                        description: 'Test hover on AWS::NoValue pseudo parameter',
                        verification: {
                            position: { line: 551, character: 18 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(pseudoParameterDocsMap.get(PseudoParameter.AWSNoValue))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 449, character: 25 },
                        description: 'Type IsProduction condition in ConditionalOutput',
                        verification: {
                            position: { line: 553, character: 20 },
                            expectation: HoverExpectationBuilder.create()
                                .expectStartsWith('**Condition:** IsProduction')
                                .expectContainsText([
                                    'IsProduction',
                                    "'Fn::Equals'",
                                    "{Ref: 'EnvironmentName'}",
                                    "'production'",
                                ])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: `,
    "NestedFunctionOutput": {
      "Description": "Output with deeply nested functions",
      "Value": {"Fn::Select": [
        0,
        {"Fn::Split": [
          ",",
          {"Fn::Sub": [
            "\${First},\${Second},\${Third}",
            {
              "First": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "AMI"]},
              "Second": {"Fn::GetAtt": ["Database", "Endpoint.Address"]},
              "Third": {"Fn::If": ["IsProduction", "prod", "dev"]}
            }
          ]}
        ]}
      ]}
    }`,
                        position: { line: 554, character: 5 },
                        description: 'Test hover on Select function in nested output',
                        verification: {
                            position: { line: 557, character: 21 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Select))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 455, character: 18 },
                        description: 'Test hover on Split function for nested output parsing',
                        verification: {
                            position: { line: 559, character: 14 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Split))
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ``,
                        position: { line: 457, character: 14 },
                        description: 'Test hover on If function in nested Sub parameters',
                        verification: {
                            position: { line: 566, character: 29 },
                            expectation: HoverExpectationBuilder.create()
                                .expectContent(intrinsicFunctionsDocsMap.get(IntrinsicFunction.If))
                                .build(),
                        },
                    },
<<<<<<< Updated upstream
                ],
            };
            template.executeScenario(scenario);
        });
    });
=======
                ]
            }
            template.executeScenario(scenario);
        })
    })
>>>>>>> Stashed changes
});
