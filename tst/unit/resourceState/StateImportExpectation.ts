import { DocumentType } from '../../../src/document/Document';
import { DeletionPolicyOnImport } from '../../../src/resourceState/ResourceStateTypes';
import { getMockResourceProperties } from './MockResourceState';

export interface TestScenario {
    name: string;
    documentType: DocumentType;
    hasExistingResources: boolean;
    initialContent: string;
}

export const TestScenarios: TestScenario[] = [
    {
        name: 'JSON without existing Resources',
        documentType: DocumentType.JSON,
        hasExistingResources: false,
        initialContent: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test template"
}`,
    },
    {
        name: 'JSON with existing Resources',
        documentType: DocumentType.JSON,
        hasExistingResources: true,
        initialContent: `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Description": "Test template",
  "Resources": {
    "ExistingResource": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "existing-bucket"
      }
    }
  }
}`,
    },
    {
        name: 'YAML without existing Resources',
        documentType: DocumentType.YAML,
        hasExistingResources: false,
        initialContent: `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template`,
    },
    {
        name: 'YAML with existing Resources',
        documentType: DocumentType.YAML,
        hasExistingResources: true,
        initialContent: `AWSTemplateFormatVersion: '2010-09-09'
Description: Test template
Resources:
  ExistingResource:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: existing-bucket`,
    },
];

function getResourceLogicalName(resourceType: string): string {
    const typeMap: Record<string, string> = {
        'AWS::S3::Bucket': 'Bucket',
        'AWS::EC2::Instance': 'Instance',
        'AWS::IAM::Role': 'Role',
        'AWS::Lambda::Function': 'Function',
        'AWS::EC2::VPC': 'VPC',
        'AWS::EC2::Subnet': 'Subnet',
        'AWS::EC2::SecurityGroup': 'SecurityGroup',
        'AWS::EC2::LaunchTemplate': 'LaunchTemplate',
        'AWS::AutoScaling::AutoScalingGroup': 'AutoScalingGroup',
        'AWS::RDS::DBInstance': 'DBInstance',
        'AWS::CloudWatch::Alarm': 'Alarm',
        'AWS::SNS::Topic': 'Topic',
        'AWS::SSM::Parameter': 'Parameter',
    };
    return typeMap[resourceType] || 'Resource';
}

function formatPropertiesForJson(properties: any, indent: number = 6): string {
    const spaces = ' '.repeat(indent);
    return JSON.stringify(properties, null, 2)
        .split('\n')
        .map((line, index) => (index === 0 ? line : spaces + line))
        .join('\n');
}

function formatPropertiesForYaml(properties: any, indent: number = 6): string {
    const spaces = ' '.repeat(indent);
    const yamlLines: string[] = [];

    function processValue(value: any, currentIndent: number): string[] {
        const currentSpaces = ' '.repeat(currentIndent);

        if (Array.isArray(value)) {
            return value.map((item) => {
                if (typeof item === 'object' && item !== null) {
                    const subLines = processValue(item, currentIndent + 2);
                    return `${currentSpaces}- ${subLines[0].trim()}\n${subLines.slice(1).join('\n')}`;
                } else {
                    return `${currentSpaces}- ${String(item)}`;
                }
            });
        } else if (typeof value === 'object' && value !== null) {
            const lines: string[] = [];
            for (const [key, val] of Object.entries(value)) {
                if (Array.isArray(val)) {
                    lines.push(`${currentSpaces}${key}:`, ...processValue(val, currentIndent + 2));
                } else if (typeof val === 'object' && val !== null) {
                    lines.push(`${currentSpaces}${key}:`, ...processValue(val, currentIndent + 2));
                } else {
                    const formattedValue = typeof val === 'string' && /^\d+$/.test(val) ? `"${val}"` : String(val);
                    lines.push(`${currentSpaces}${key}: ${formattedValue}`);
                }
            }
            return lines;
        } else {
            return [`${String(value)}`];
        }
    }

    for (const [key, value] of Object.entries(properties)) {
        if (Array.isArray(value)) {
            yamlLines.push(`${spaces}${key}:`, ...processValue(value, indent + 2));
        } else if (typeof value === 'object' && value !== null) {
            yamlLines.push(`${spaces}${key}:`, ...processValue(value, indent + 2));
        } else {
            const formattedValue = typeof value === 'string' && /^\d+$/.test(value) ? `"${value}"` : String(value);
            yamlLines.push(`${spaces}${key}: ${formattedValue}`);
        }
    }

    return yamlLines.join('\n');
}

export function getImportExpectation(scenario: TestScenario, resourceType: string): string {
    const logicalName = getResourceLogicalName(resourceType);
    const properties = getMockResourceProperties(resourceType);
    const identifier = getResourceIdentifier(resourceType);

    if (scenario.documentType === DocumentType.JSON) {
        if (scenario.hasExistingResources) {
            return `,
    "${logicalName}": {
      "Type": "${resourceType}",
      "DeletionPolicy": "${DeletionPolicyOnImport}",
      "Properties": ${formatPropertiesForJson(properties)},
      "Metadata": {
        "PrimaryIdentifier": "${identifier}",
        "ManagedByStack": "true",
        "StackName": "test-stack"
      }
    }`;
        } else {
            return `,
  "Resources": {
    "${logicalName}": {
      "Type": "${resourceType}",
      "DeletionPolicy": "${DeletionPolicyOnImport}",
      "Properties": ${formatPropertiesForJson(properties)},
      "Metadata": {
        "PrimaryIdentifier": "${identifier}",
        "ManagedByStack": "true",
        "StackName": "test-stack"
      }
    }
  }`;
        }
    } else {
        if (scenario.hasExistingResources) {
            return `
  ${logicalName}:
    Type: ${resourceType}
    DeletionPolicy: ${DeletionPolicyOnImport}
    Properties:
${formatPropertiesForYaml(properties)}
    Metadata:
      PrimaryIdentifier: ${identifier}
      ManagedByStack: "true"
      StackName: test-stack`;
        } else {
            return `
Resources:
  ${logicalName}:
    Type: ${resourceType}
    DeletionPolicy: ${DeletionPolicyOnImport}
    Properties:
${formatPropertiesForYaml(properties)}
    Metadata:
      PrimaryIdentifier: ${identifier}
      ManagedByStack: "true"
      StackName: test-stack`;
        }
    }
}

export function getCloneExpectation(scenario: TestScenario, resourceType: string): string {
    const logicalName = getResourceLogicalName(resourceType);
    const properties = getMockResourceProperties(resourceType);
    const identifier = getResourceIdentifier(resourceType);

    // For clone, replace primary identifier properties with <CLONE INPUT REQUIRED>
    const cloneProperties = replaceCloneProperties(properties, resourceType);

    if (scenario.documentType === DocumentType.JSON) {
        if (scenario.hasExistingResources) {
            return `,
    "${logicalName}": {
      "Type": "${resourceType}",
      "Properties": ${formatPropertiesForJson(cloneProperties)},
      "Metadata": {
        "PrimaryIdentifier": "<CLONE>${identifier}"
      }
    }`;
        } else {
            return `,
  "Resources": {
    "${logicalName}": {
      "Type": "${resourceType}",
      "Properties": ${formatPropertiesForJson(cloneProperties)},
      "Metadata": {
        "PrimaryIdentifier": "<CLONE>${identifier}"
      }
    }
  }`;
        }
    } else {
        if (scenario.hasExistingResources) {
            return `
  ${logicalName}:
    Type: ${resourceType}
    Properties:
${formatPropertiesForYaml(cloneProperties)}
    Metadata:
      PrimaryIdentifier: <CLONE>${identifier}`;
        } else {
            return `
Resources:
  ${logicalName}:
    Type: ${resourceType}
    Properties:
${formatPropertiesForYaml(cloneProperties)}
    Metadata:
      PrimaryIdentifier: <CLONE>${identifier}`;
        }
    }
}

function getResourceIdentifier(resourceType: string): string {
    const identifierMap: Record<string, string> = {
        'AWS::S3::Bucket': 'my-test-bucket',
        'AWS::EC2::Instance': 'i-1234567890abcdef0',
        'AWS::IAM::Role': 'MyTestRole',
        'AWS::Lambda::Function': 'MyTestFunction',
        'AWS::EC2::VPC': 'vpc-12345678',
        'AWS::EC2::Subnet': 'subnet-12345678',
        'AWS::EC2::SecurityGroup': 'sg-12345678',
        'AWS::EC2::LaunchTemplate': 'lt-12345678',
        'AWS::AutoScaling::AutoScalingGroup': 'MyAutoScalingGroup',
        'AWS::RDS::DBInstance': 'mydbinstance',
        'AWS::CloudWatch::Alarm': 'MyTestAlarm',
        'AWS::SNS::Topic': 'arn:aws:sns:us-east-1:123456789012:MyTestTopic',
        'AWS::SSM::Parameter': '/myapp/config/database-url',
    };
    return identifierMap[resourceType] || 'unknown';
}

function replaceCloneProperties(properties: any, resourceType: string): any {
    const cloneProperties = structuredClone(properties);

    // Replace primary identifier properties with <CLONE INPUT REQUIRED>
    const primaryIdentifierProps: Record<string, string[]> = {
        'AWS::S3::Bucket': ['BucketName'],
        'AWS::IAM::Role': ['RoleName'],
        'AWS::Lambda::Function': ['FunctionName'],
        'AWS::AutoScaling::AutoScalingGroup': ['AutoScalingGroupName'],
        'AWS::RDS::DBInstance': ['DBInstanceIdentifier'],
        'AWS::CloudWatch::Alarm': ['AlarmName'],
        'AWS::SSM::Parameter': ['Name'],
    };

    const propsToReplace = primaryIdentifierProps[resourceType] || [];
    for (const prop of propsToReplace) {
        if (cloneProperties[prop] !== undefined) {
            cloneProperties[prop] = '<CLONE INPUT REQUIRED>';
        }
    }

    return cloneProperties;
}
