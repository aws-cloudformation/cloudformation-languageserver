import { describe, it, expect } from 'vitest';
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

        const syntaxTree = new YamlSyntaxTree(yamlContent);

        // Find the position of "conditional-container" (inside the Fn::If)
        const lines = yamlContent.split('\n');
        let targetLine = -1;
        let targetCol = -1;

        for (const [i, line] of lines.entries()) {
            if (line.includes('conditional-container')) {
                targetLine = i;
                targetCol = line.indexOf('conditional-container');
                break;
            }
        }

        expect(targetLine).toBeGreaterThan(-1);

        const position = { line: targetLine, character: targetCol };
        const node = syntaxTree.getNodeAtPosition(position);

        expect(node).toBeDefined();

        const pathInfo = syntaxTree.getPathAndEntityInfo(node);

        // Check if the propertyPath contains Fn::If
        const hasIntrinsic = pathInfo.propertyPath.some(
            (segment) => typeof segment === 'string' && segment.startsWith('Fn::'),
        );

        expect(hasIntrinsic).toBe(true);
        expect(pathInfo.propertyPath).toContain('Fn::If');

        // The path should be something like:
        // ['Resources', 'TestResource', 'Properties', 'ContainerDefinitions', 1, 'Fn::If', 1, 'Name']
        // instead of the broken:
        // ['Resources', 'TestResource', 'Properties', 'ContainerDefinitions', 1, 1, 'Name']

        const pathStr = JSON.stringify(pathInfo.propertyPath);
        expect(pathStr).toContain('Fn::If');
        expect(pathStr).not.toMatch(/\[1,\s*1,\s*"Name"\]/); // Should not have consecutive numeric indices
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

        const syntaxTree = new YamlSyntaxTree(yamlContent);

        // Find the position of "STAGING_VAR" (inside nested Fn::If)
        const lines = yamlContent.split('\n');
        let targetLine = -1;
        let targetCol = -1;

        for (const [i, line] of lines.entries()) {
            if (line.includes('STAGING_VAR')) {
                targetLine = i;
                targetCol = line.indexOf('STAGING_VAR');
                break;
            }
        }

        expect(targetLine).toBeGreaterThan(-1);

        const position = { line: targetLine, character: targetCol };
        const node = syntaxTree.getNodeAtPosition(position);

        expect(node).toBeDefined();

        const pathInfo = syntaxTree.getPathAndEntityInfo(node);

        // Should contain multiple Fn::If entries for nested conditions
        const intrinsicCount = pathInfo.propertyPath.filter(
            (segment) => typeof segment === 'string' && segment.startsWith('Fn::'),
        ).length;

        expect(intrinsicCount).toBeGreaterThan(0);
        expect(pathInfo.propertyPath).toContain('Fn::If');
    });

    it.todo('should handle other intrinsic functions like Fn::Sub', () => {
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

        const syntaxTree = new YamlSyntaxTree(yamlContent);

        // Find the position of "my-bucket" (inside Fn::Sub)
        const lines = yamlContent.split('\n');
        let targetLine = -1;
        let targetCol = -1;

        for (const [i, line] of lines.entries()) {
            if (line.includes('my-bucket')) {
                targetLine = i;
                targetCol = line.indexOf('my-bucket');
                break;
            }
        }

        expect(targetLine).toBeGreaterThan(-1);

        const position = { line: targetLine, character: targetCol };
        const node = syntaxTree.getNodeAtPosition(position);

        expect(node).toBeDefined();

        const pathInfo = syntaxTree.getPathAndEntityInfo(node);

        // Should contain Fn::Sub in the propertyPath
        const hasSubFunction = pathInfo.propertyPath.some(
            (segment) => typeof segment === 'string' && segment === 'Fn::Sub',
        );

        expect(hasSubFunction).toBe(true);
    });
});
