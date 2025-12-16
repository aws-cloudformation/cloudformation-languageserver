import { describe, it, expect } from 'vitest';
import { JsonSyntaxTree } from '../../../../src/context/syntaxtree/JsonSyntaxTree';
import { YamlSyntaxTree } from '../../../../src/context/syntaxtree/YamlSyntaxTree';

describe('Intrinsic Function Path Preservation', () => {
    it('should preserve Fn::If in path when navigating to conditional content', () => {
        const yamlContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  TestResource:
    Type: AWS::ECS::TaskDefinition
    Properties:
      ContainerDefinitions:
        - Name: container1
          Image: nginx
        - !If
          - SomeCondition
          - Name: conditional-container
            Image: redis
          - Name: fallback-container
            Image: alpine
`;

        const path = getYamlPath(yamlContent, 11, 18);
        expect(path).toEqual([
            'Resources',
            'TestResource',
            'Properties',
            'ContainerDefinitions',
            1,
            'Fn::If',
            1,
            'Name',
        ]);
    });

    it('should preserve nested Fn::If functions in complex structures', () => {
        const yamlContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  ComplexResource:
    Type: AWS::ECS::TaskDefinition
    Properties:
      ContainerDefinitions:
        - Name: web
          Environment:
            - !If
              - IsProduction
              - Name: PROD_VAR
                Value: prod-value
              - !If
                - IsStaging
                - Name: STAGING_VAR
                  Value: staging-value
                - Name: DEV_VAR
                  Value: dev-value
`;

        const path = getYamlPath(yamlContent, 15, 24);
        expect(path).toEqual([
            'Resources',
            'ComplexResource',
            'Properties',
            'ContainerDefinitions',
            0,
            'Environment',
            0,
            'Fn::If',
            2,
            'Fn::If',
            1,
            'Name',
        ]);
    });

    it('should handle other intrinsic functions like Fn::Sub', () => {
        const yamlContent = `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  TestResource:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 
        - 'my-bucket-\${env}-\${id}'
        - env: !Ref Environment
          id: !Ref UniqueId
`;

        const path = getYamlPath(yamlContent, 8, 11);
        expect(path).toEqual(['Resources', 'TestResource', 'Properties', 'BucketName', 'Fn::Sub', 1, 'env']);
    });

    describe('YAML shorthand', () => {
        it('!If in array returning complex objects', () => {
            // Line 18: "          - Name: conditional-container"
            const path = getYamlPath(YAML_TEMPLATE, 18, 20);
            expect(path).toEqual([
                'Resources',
                'TaskDefinition',
                'Properties',
                'ContainerDefinitions',
                1,
                'Fn::If',
                1,
                'Name',
            ]);
        });

        it('nested !If > !If in complex structures', () => {
            // Line 27: "                  - Name: STAGING_VAR"
            const path = getYamlPath(YAML_TEMPLATE, 27, 26);
            expect(path).toEqual([
                'Resources',
                'TaskDefinition',
                'Properties',
                'ContainerDefinitions',
                1,
                'Fn::If',
                1,
                'Environment',
                0,
                'Fn::If',
                2,
                'Fn::If',
                1,
                'Name',
            ]);
        });

        it('!Sub array form with variable mapping containing nested !Ref', () => {
            // Line 37: "        - 'my-bucket-${env}-${id}'"
            const templateStringPath = getYamlPath(YAML_TEMPLATE, 37, 12);
            expect(templateStringPath).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::Sub', 0]);

            // Line 38: "        - env: !Ref Environment"
            const varMappingPath = getYamlPath(YAML_TEMPLATE, 38, 20);
            expect(varMappingPath).toEqual([
                'Resources',
                'Bucket',
                'Properties',
                'BucketName',
                'Fn::Sub',
                1,
                'env',
                'Ref',
            ]);
        });

        it('!Equals with nested !Ref in Conditions', () => {
            // Line 7: "    - !Ref Environment"
            const path = getYamlPath(YAML_TEMPLATE, 7, 10);
            expect(path).toEqual(['Conditions', 'IsProduction', 'Fn::Equals', 0, 'Ref']);
        });

        it('!Select with nested !GetAZs', () => {
            // Line 44: "        - 0"
            const path = getYamlPath(YAML_TEMPLATE, 44, 10);
            expect(path).toEqual(['Resources', 'Instance', 'Properties', 'AvailabilityZone', 'Fn::Select', 0]);
        });

        it('!Join inline array form', () => {
            // Line 47: "        - Key: !Join ['-', [prefix, suffix]]"
            const path = getYamlPath(YAML_TEMPLATE, 47, 24);
            expect(path).toEqual(['Resources', 'Instance', 'Properties', 'Tags', 0, 'Key', 'Fn::Join']);
        });
    });

    describe('JSON', () => {
        it('Fn::If in array - position on Fn::If key', () => {
            // Line 10: Fn::If inside ContainerDefinitions array
            const path = getJsonPath(JSON_TEMPLATE, 10, 16);
            expect(path).toEqual(['Resources', 'TaskDefinition', 'Properties', 'ContainerDefinitions', 1, 'Fn::If']);
        });

        it('Fn::If in array - position on condition name (index 0)', () => {
            // Line 10: position on "IsProduction" string
            const path = getJsonPath(JSON_TEMPLATE, 10, 24);
            expect(path).toEqual(['Resources', 'TaskDefinition', 'Properties', 'ContainerDefinitions', 1, 'Fn::If', 0]);
        });

        it('Fn::Sub array form - position on template string (index 0)', () => {
            // Line 17: Fn::Sub template string
            const path = getJsonPath(JSON_TEMPLATE, 17, 40);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::Sub', 0]);
        });

        it('Fn::Equals with nested Ref', () => {
            // Line 2: Fn::Equals containing Ref
            const path = getJsonPath(JSON_TEMPLATE, 2, 40);
            expect(path).toEqual(['Conditions', 'IsProduction', 'Fn::Equals', 0, 'Ref']);
        });
    });

    describe('YAML flow-style', () => {
        it('flow-style Fn::Sub', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: { Fn::Sub: "my-bucket-\${AWS::Region}" }`;
            // Position on the string value inside Fn::Sub
            const path = getYamlPath(template, 4, 30);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::Sub']);
        });

        it('flow-style nested intrinsics - position on inner Ref value', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: { Fn::If: [IsProd, { Ref: ProdName }, { Ref: DevName }] }`;
            //                               ^col 44 (ProdName value)
            const path = getYamlPath(template, 4, 44);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::If', 'Ref']);
        });
    });

    describe('YAML edge cases', () => {
        it('!GetAtt dot notation', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
Outputs:
  BucketArn:
    Value: !GetAtt Bucket.Arn`;
            // Position on the value "Bucket.Arn"
            const path = getYamlPath(template, 5, 18);
            expect(path).toEqual(['Outputs', 'BucketArn', 'Value', 'Fn::GetAtt']);
        });

        it('!GetAtt array form', () => {
            const template = `Outputs:
  Arn:
    Value: !GetAtt [MyBucket, Arn]`;
            // Position on "MyBucket" inside the array
            const path = getYamlPath(template, 2, 20);
            expect(path).toEqual(['Outputs', 'Arn', 'Value', 'Fn::GetAtt']);
        });

        it('simple !Sub string form (not array)', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub "my-bucket-\${AWS::Region}"`;
            // Position on the string value
            const path = getYamlPath(template, 4, 24);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::Sub']);
        });

        it('standalone !Ref as direct value', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Ref BucketNameParam`;
            // Position on the parameter name value
            const path = getYamlPath(template, 4, 20);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Ref']);
        });

        it('sibling intrinsics at same level', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: !Sub "\${Env}-key"
          Value: !Ref SomeParam`;
            // Position on Key's Sub value
            const keyPath = getYamlPath(template, 5, 18);
            expect(keyPath).toEqual(['Resources', 'Bucket', 'Properties', 'Tags', 0, 'Key', 'Fn::Sub']);

            // Position on Value's Ref value
            const valuePath = getYamlPath(template, 6, 20);
            expect(valuePath).toEqual(['Resources', 'Bucket', 'Properties', 'Tags', 0, 'Value', 'Ref']);
        });

        it('intrinsics in Outputs section', () => {
            const template = `Outputs:
  BucketArn:
    Value: !GetAtt MyBucket.Arn
    Export:
      Name: !Sub "\${AWS::StackName}-BucketArn"`;
            const getAttPath = getYamlPath(template, 2, 18);
            expect(getAttPath).toEqual(['Outputs', 'BucketArn', 'Value', 'Fn::GetAtt']);

            const subPath = getYamlPath(template, 4, 18);
            expect(subPath).toEqual(['Outputs', 'BucketArn', 'Export', 'Name', 'Fn::Sub']);
        });
    });

    describe('JSON edge cases', () => {
        it('deeply nested intrinsics (3+ levels)', () => {
            const template = `{
  "Resources": {
    "Bucket": {
      "Properties": {
        "BucketName": { "Fn::If": ["Cond", { "Fn::Sub": ["x-{y}", { "y": { "Ref": "P" } }] }, ""] }
      }
    }
  }
}`;
            // Position on "P" value inside the deepest Ref
            const path = getJsonPath(template, 4, 82);
            expect(path).toEqual([
                'Resources',
                'Bucket',
                'Properties',
                'BucketName',
                'Fn::If',
                1,
                'Fn::Sub',
                1,
                'y',
                'Ref',
            ]);
        });
    });

    describe('malformed templates (fallback)', () => {
        it('incomplete template triggers fallback for context path', () => {
            const incomplete = `AWSTemplateFormatVersion: '2010-09-09'
Conditions:
  IsProd: !Equals [!Ref`;
            // When parent is ERROR node, fallback provides context
            const path = getYamlPath(incomplete, 2, 20);
            expect(path).toEqual(['Conditions', 'IsProd']);
        });

        it('incomplete !Sub with no value', () => {
            const incomplete = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub
        -`;
            // Position on the dash (first array item)
            const path = getYamlPath(incomplete, 5, 9);
            expect(path).toEqual(['Resources', 'Bucket', 'Properties', 'BucketName', 'Fn::Sub', 0]);
        });
    });
});

function getYamlPath(content: string, line: number, character: number): (string | number)[] {
    const tree = new YamlSyntaxTree(content);
    const node = tree.getNodeAtPosition({ line, character });
    return [...tree.getPathAndEntityInfo(node).propertyPath];
}

function getJsonPath(content: string, line: number, character: number): (string | number)[] {
    const tree = new JsonSyntaxTree(content);
    const node = tree.getNodeAtPosition({ line, character });
    return [...tree.getPathAndEntityInfo(node).propertyPath];
}

const YAML_TEMPLATE = `
AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  Environment:
    Type: String
Conditions:
  IsProduction: !Equals
    - !Ref Environment
    - production
Resources:
  TaskDefinition:
    Type: AWS::ECS::TaskDefinition
    Properties:
      ContainerDefinitions:
        - Name: container1
          Image: nginx
        - !If
          - IsProduction
          - Name: conditional-container
            Image: redis
            Environment:
              - !If
                - IsProduction
                - Name: PROD_VAR
                  Value: prod-value
                - !If
                  - IsProduction
                  - Name: STAGING_VAR
                    Value: staging-value
                  - Name: DEV_VAR
                    Value: dev-value
          - Name: fallback-container
            Image: alpine
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub
        - 'my-bucket-\${env}-\${id}'
        - env: !Ref Environment
          id: !GetAtt TaskDefinition.Arn
  Instance:
    Type: AWS::EC2::Instance
    Properties:
      AvailabilityZone: !Select
        - 0
        - !GetAZs ''
      Tags:
        - Key: !Join ['-', [prefix, suffix]]
          Value: test
`;

const JSON_TEMPLATE = `{
  "Conditions": {
    "IsProduction": { "Fn::Equals": [{ "Ref": "Environment" }, "production"] }
  },
  "Resources": {
    "TaskDefinition": {
      "Type": "AWS::ECS::TaskDefinition",
      "Properties": {
        "ContainerDefinitions": [
          { "Name": "container1", "Image": "nginx" },
          { "Fn::If": ["IsProduction", { "Name": "conditional-container" }, { "Name": "fallback" }] }
        ]
      }
    },
    "Bucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": { "Fn::Sub": ["my-bucket-\${env}", { "env": { "Ref": "Environment" } }] }
      }
    }
  }
}`;
