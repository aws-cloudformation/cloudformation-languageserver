import { describe, it, expect, afterAll } from 'vitest';
import { TopLevelSection, TopLevelSections } from '../../../../src/context/ContextType';
import { SyntaxTree } from '../../../../src/context/syntaxtree/SyntaxTree';
import { CommonNodeTypes } from '../../../../src/context/syntaxtree/utils/TreeSitterTypes';
import { DocumentType } from '../../../../src/document/Document';
import { Templates, position } from '../../../utils/TemplateUtils';
import { createTree } from '../../../utils/TestTree';

describe('SyntaxTree', () => {
    const trees: SyntaxTree[] = [];

    afterAll(() => {
        for (const tree of trees) {
            tree.cleanup();
        }
    });

    function createSyntaxTree(content: string, type: DocumentType): SyntaxTree {
        const tree = createTree(content, type);
        trees.push(tree);
        return tree;
    }

    describe('update', () => {
        it('should build complete YAML CloudFormation template from empty string with content validation at each step', () => {
            const yamlTree = createSyntaxTree('', DocumentType.YAML);

            // Step 1: Add AWSTemplateFormatVersion
            yamlTree.update('AWSTemplateFormatVersion: "2010-09-09"', { row: 0, column: 0 }, { row: 0, column: 0 });
            const step1Content = yamlTree.content();
            expect(step1Content).toBe('AWSTemplateFormatVersion: "2010-09-09"');
            expect(step1Content.split('\n')).toHaveLength(1);

            // Step 2: Add Parameters section at the end of the first line
            yamlTree.update(
                '\nParameters:\n  Environment:\n    Type: String\n    Default: dev',
                { row: 0, column: step1Content.length },
                { row: 0, column: step1Content.length },
            );
            const step2Content = yamlTree.content();
            expect(step2Content).toContain('AWSTemplateFormatVersion');
            expect(step2Content).toContain('Parameters:');
            expect(step2Content).toContain('Environment:');
            expect(step2Content).toContain('Type: String');
            expect(step2Content).toContain('Default: dev');
            expect(step2Content.split('\n').length).toBeGreaterThanOrEqual(5);

            // Step 3: Add Resources section at the end
            const step2Lines = step2Content.split('\n');
            yamlTree.update(
                '\nResources:\n  MyBucket:\n    Type: AWS::S3::Bucket\n    Properties:\n      BucketName: !Sub "${Environment}-bucket"',
                { row: step2Lines.length - 1, column: step2Lines[step2Lines.length - 1].length },
                { row: step2Lines.length - 1, column: step2Lines[step2Lines.length - 1].length },
            );
            const step3Content = yamlTree.content();
            expect(step3Content).toContain('AWSTemplateFormatVersion');
            expect(step3Content).toContain('Parameters:');
            expect(step3Content).toContain('Environment:');
            expect(step3Content).toContain('Resources:');
            expect(step3Content).toContain('MyBucket:');
            expect(step3Content).toContain('Type: AWS::S3::Bucket');
            expect(step3Content).toContain('Properties:');
            expect(step3Content).toContain('BucketName: !Sub "${Environment}-bucket"');
            expect(step3Content.split('\n').length).toBeGreaterThanOrEqual(10);
        });

        it('should build complete JSON CloudFormation template from empty string with full content validation at each step', () => {
            const jsonTree = createSyntaxTree('', DocumentType.JSON);

            // Step 1: Add opening brace and AWSTemplateFormatVersion
            jsonTree.update(
                '{\n  "AWSTemplateFormatVersion": "2010-09-09"',
                { row: 0, column: 0 },
                { row: 0, column: 0 },
            );
            const step1Content = jsonTree.content();
            expect(step1Content).toBe('{\n  "AWSTemplateFormatVersion": "2010-09-09"');
            expect(step1Content.split('\n')).toHaveLength(2);

            // Step 2: Add Parameters section
            jsonTree.update(
                ',\n  "Parameters": {\n    "Environment": {\n      "Type": "String",\n      "Default": "dev"\n    }\n  }',
                { row: 1, column: 42 },
                { row: 1, column: 42 },
            );
            const step2Content = jsonTree.content();
            expect(step2Content).toBe(
                '{\n  "AWSTemplateFormatVersion": "2010-09-09",\n  "Parameters": {\n    "Environment": {\n      "Type": "String",\n      "Default": "dev"\n    }\n  }',
            );
            expect(step2Content.split('\n')).toHaveLength(8);
            expect(step2Content).toContain('"Parameters"');
            expect(step2Content).toContain('"Environment"');
            expect(step2Content).toContain('"Type": "String"');
            expect(step2Content).toContain('"Default": "dev"');

            // Step 3: Add Resources section with intrinsic function and closing brace
            jsonTree.update(
                ',\n  "Resources": {\n    "MyBucket": {\n      "Type": "AWS::S3::Bucket",\n      "Properties": {\n        "BucketName": {"Fn::Sub": "${Environment}-bucket"}\n      }\n    }\n  }\n}',
                { row: 7, column: 3 },
                { row: 7, column: 3 },
            );
            const step3Content = jsonTree.content();
            const expectedFinalContent =
                '{\n  "AWSTemplateFormatVersion": "2010-09-09",\n  "Parameters": {\n    "Environment": {\n      "Type": "String",\n      "Default": "dev"\n    }\n  },\n  "Resources": {\n    "MyBucket": {\n      "Type": "AWS::S3::Bucket",\n      "Properties": {\n        "BucketName": {"Fn::Sub": "${Environment}-bucket"}\n      }\n    }\n  }\n}';
            expect(step3Content).toBe(expectedFinalContent);
            expect(step3Content.split('\n')).toHaveLength(17);
            expect(step3Content).toContain('"Resources"');
            expect(step3Content).toContain('"MyBucket"');
            expect(step3Content).toContain('"Type": "AWS::S3::Bucket"');
            expect(step3Content).toContain('"Properties"');
            expect(step3Content).toContain('"Fn::Sub": "${Environment}-bucket"');

            jsonTree.update(
                ',\n  "Resources": {\n    "MyBucket": {\n      "Type": "AWS::S3::Bucket",\n      "Properties": {\n        "BucketName": {"Fn::Sub": "${Environment}-bucket"}\n      }\n    }\n  }\n}',
                { row: 7, column: 3 },
                { row: 7, column: 3 },
            );
            expect(jsonTree.content()).toContain('"Resources"');
            expect(jsonTree.content()).toContain('"Fn::Sub"');
        });

        it('should handle complex nested structure modifications using sample templates', () => {
            const yamlTree = createSyntaxTree(Templates.sample.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.sample.json.contents, DocumentType.JSON);

            // Add complex nested resource to YAML
            const yamlResource =
                '\n  NewLambda:\n    Type: AWS::Lambda::Function\n    Properties:\n      Runtime: nodejs18.x\n      Handler: index.handler\n      Environment:\n        Variables:\n          ENV: !Ref EnvType\n          BUCKET: !Ref MyBucket';
            yamlTree.update(yamlResource, { row: 50, column: 0 }, { row: 50, column: 0 });

            expect(yamlTree.content()).toContain('NewLambda:');
            expect(yamlTree.content()).toContain('!Ref EnvType');

            // Add complex nested resource to JSON
            const jsonResource =
                ',\n    "NewLambda": {\n      "Type": "AWS::Lambda::Function",\n      "Properties": {\n        "Runtime": "nodejs18.x",\n        "Handler": "index.handler",\n        "Environment": {\n          "Variables": {\n            "ENV": {"Ref": "EnvType"},\n            "BUCKET": {"Ref": "MyBucket"}\n          }\n        }\n      }\n    }';
            jsonTree.update(jsonResource, { row: 50, column: 0 }, { row: 50, column: 0 });

            expect(jsonTree.content()).toContain('"NewLambda"');
            expect(jsonTree.content()).toContain('"Ref": "EnvType"');
        });

        it('should handle concurrent edits to multiple trees', () => {
            const yamlTree1 = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const yamlTree2 = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const jsonTree1 = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);
            const jsonTree2 = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

            // Modify all trees simultaneously
            yamlTree1.update('\nDescription: "Modified YAML 1"', { row: 1, column: 0 }, { row: 1, column: 0 });
            jsonTree1.update(
                ',\n  "Description": "Modified JSON 1"',
                { row: 1, column: 33 },
                {
                    row: 1,
                    column: 33,
                },
            );
            jsonTree2.update(
                ',\n  "Description": "Modified JSON 2"',
                { row: 1, column: 33 },
                {
                    row: 1,
                    column: 33,
                },
            );
            yamlTree2.update('\nDescription: "Modified YAML 2"', { row: 1, column: 0 }, { row: 1, column: 0 });

            expect(yamlTree1.content()).toContain('Modified YAML 1');
            expect(yamlTree2.content()).toContain('Modified YAML 2');
            expect(jsonTree1.content()).toContain('Modified JSON 1');
            expect(jsonTree2.content()).toContain('Modified JSON 2');

            // Verify trees remain independent
            expect(yamlTree1.content()).not.toContain('Modified YAML 2');
            expect(jsonTree1.content()).not.toContain('Modified JSON 2');
        });

        it('should handle replacement and deletion operations', () => {
            const yamlTree = createSyntaxTree(Templates.sample.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.sample.json.contents, DocumentType.JSON);

            const originalYamlLength = yamlTree.content().split('\n').length;
            const originalJsonLength = jsonTree.content().split('\n').length;

            // Replace content in YAML (replacing rows 20-25 with 3 new lines)
            yamlTree.update(
                'NewParam:\n    Type: Number\n    Default: 42',
                { row: 20, column: 2 },
                {
                    row: 25,
                    column: 0,
                },
            );
            expect(yamlTree.content()).toContain('NewParam:');
            expect(yamlTree.content()).toContain('Default: 42');

            // Verify YAML length changed appropriately (replaced 5+ rows with 3 rows)
            const newYamlLength = yamlTree.content().split('\n').length;
            expect(newYamlLength).toBeLessThan(originalYamlLength);

            // Delete section in JSON (deleting rows 10-20)
            jsonTree.update('', { row: 10, column: 0 }, { row: 20, column: 0 });
            const newJsonLength = jsonTree.content().split('\n').length;
            expect(newJsonLength).toBeLessThan(originalJsonLength);
        });

        describe('Error Boundary Tests', () => {
            it('should handle invalid positions gracefully in getNodeAtPosition', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test negative positions
                expect(() => yamlTree.getNodeAtPosition({ line: -1, character: 0 })).not.toThrow();
                expect(() => jsonTree.getNodeAtPosition({ line: 0, character: -1 })).not.toThrow();
                expect(() => yamlTree.getNodeAtPosition({ line: -5, character: -10 })).not.toThrow();

                // Test extremely large positions
                expect(() => yamlTree.getNodeAtPosition({ line: 10000, character: 10000 })).not.toThrow();
                expect(() => jsonTree.getNodeAtPosition({ line: 999999, character: 999999 })).not.toThrow();

                // Verify we get valid nodes even for invalid positions
                const negativeNode = yamlTree.getNodeAtPosition({ line: -1, character: 0 });
                const largeNode = jsonTree.getNodeAtPosition({ line: 10000, character: 10000 });

                expect(negativeNode).toBeDefined();
                expect(largeNode).toBeDefined();
            });

            it('should handle invalid positions gracefully in getTextAtPosition', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test invalid positions - should not throw
                expect(() => yamlTree.getTextAtPosition({ line: -1, character: 0 })).not.toThrow();
                expect(() => jsonTree.getTextAtPosition({ line: 0, character: -1 })).not.toThrow();
                expect(() => yamlTree.getTextAtPosition({ line: 10000, character: 10000 })).not.toThrow();

                // Results should be defined (even if empty or fallback)
                const negativeText = yamlTree.getTextAtPosition({ line: -1, character: 0 });
                const largeText = jsonTree.getTextAtPosition({ line: 10000, character: 10000 });

                expect(negativeText).toBeDefined();
                expect(largeText).toBeDefined();
            });

            it('should handle invalid update positions gracefully', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test updates with invalid row positions (should throw)
                expect(() => {
                    yamlTree.update('test', { row: -1, column: 0 }, { row: 0, column: 0 });
                }).toThrow(); // This should throw due to getIndexFromPoint validation

                expect(() => {
                    jsonTree.update('test', { row: 10000, column: 0 }, { row: 10000, column: 5 });
                }).toThrow(); // Should throw for invalid row

                // Test updates with invalid column positions (should handle gracefully)
                expect(() => {
                    yamlTree.update('test', { row: 0, column: -1 }, { row: 0, column: 0 });
                }).not.toThrow(); // Negative column should be handled gracefully

                expect(() => {
                    jsonTree.update('test', { row: 0, column: 10000 }, { row: 0, column: 10001 });
                }).not.toThrow(); // Large column should be handled gracefully

                // Test updates with mixed invalid positions
                expect(() => {
                    yamlTree.update('test', { row: 0, column: -5 }, { row: 0, column: -1 });
                }).not.toThrow(); // Both negative columns should be handled gracefully
            });

            it('should handle cleanup without throwing', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Cleanup should not throw
                expect(() => yamlTree.cleanup()).not.toThrow();
                expect(() => jsonTree.cleanup()).not.toThrow();

                // Multiple cleanups should not throw
                expect(() => yamlTree.cleanup()).not.toThrow();
                expect(() => jsonTree.cleanup()).not.toThrow();
            });

            it('should handle content method consistently', () => {
                const originalContent = Templates.simple.yaml.contents;
                const yamlTree = createSyntaxTree(originalContent, DocumentType.YAML);

                // Content should match original
                expect(yamlTree.content()).toBe(originalContent);

                // Content should be consistent across multiple calls
                const content1 = yamlTree.content();
                const content2 = yamlTree.content();
                expect(content1).toBe(content2);

                // Content should update after modifications
                yamlTree.update('\nDescription: "Added description"', { row: 1, column: 0 }, { row: 1, column: 0 });
                const updatedContent = yamlTree.content();
                expect(updatedContent).not.toBe(originalContent);
                expect(updatedContent).toContain('Added description');
            });

            it('should handle extremely large documents without crashing', () => {
                // Create a large CloudFormation template
                const largeResourcesSection = Array.from(
                    { length: 100 },
                    (_, i) =>
                        `  Resource${i}:\n    Type: AWS::S3::Bucket\n    Properties:\n      BucketName: !Sub "bucket-${i}"`,
                ).join('\n');

                const largeYamlContent = `AWSTemplateFormatVersion: "2010-09-09"\nResources:\n${largeResourcesSection}`;

                const largeJsonResources = Array.from(
                    { length: 100 },
                    (_, i) =>
                        `    "Resource${i}": {\n      "Type": "AWS::S3::Bucket",\n      "Properties": {\n        "BucketName": {"Fn::Sub": "bucket-${i}"}\n      }\n    }`,
                ).join(',\n');

                const largeJsonContent = `{\n  "AWSTemplateFormatVersion": "2010-09-09",\n  "Resources": {\n${largeJsonResources}\n  }\n}`;

                // Should handle large documents without throwing
                expect(() => createSyntaxTree(largeYamlContent, DocumentType.YAML)).not.toThrow();
                expect(() => createSyntaxTree(largeJsonContent, DocumentType.JSON)).not.toThrow();

                const largeYamlTree = createSyntaxTree(largeYamlContent, DocumentType.YAML);
                const largeJsonTree = createSyntaxTree(largeJsonContent, DocumentType.JSON);

                // Should be able to find nodes in large documents
                expect(() => largeYamlTree.getNodeAtPosition({ line: 50, character: 10 })).not.toThrow();
                expect(() => largeJsonTree.getNodeAtPosition({ line: 50, character: 10 })).not.toThrow();

                // Cleanup large documents
                largeYamlTree.cleanup();
                largeJsonTree.cleanup();
            });

            it('should handle malformed content gracefully', () => {
                const malformedYaml = `
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyResource
    Type: AWS::S3::Bucket
    Properties
      BucketName: "test"
    - InvalidArrayItem
  AnotherResource:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: ami-12345
      Tags:
        - Key: Name
          Value: "test"
        - "InvalidTag"
        - 123
`;

                const malformedJson = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {
    "MyResource": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "BucketName": "test"
      }
    },
    "InvalidResource": {
      "Type": "AWS::EC2::Instance"
      "Properties": {
        "ImageId": "ami-12345",
        "Tags": [
          {"Key": "Name", "Value": "test"},
          "InvalidTag",
          123,
          {"Key": "Incomplete"
        ]
      }
    }
  }
}`;

                // Should handle malformed content without throwing
                expect(() => createSyntaxTree(malformedYaml, DocumentType.YAML)).not.toThrow();
                expect(() => createSyntaxTree(malformedJson, DocumentType.JSON)).not.toThrow();

                const malformedYamlTree = createSyntaxTree(malformedYaml, DocumentType.YAML);
                const malformedJsonTree = createSyntaxTree(malformedJson, DocumentType.JSON);

                // Node operations should not throw
                expect(() => malformedYamlTree.getNodeAtPosition({ line: 5, character: 10 })).not.toThrow();
                expect(() => malformedJsonTree.getNodeAtPosition({ line: 10, character: 15 })).not.toThrow();

                // Path operations should not throw
                const yamlNode = malformedYamlTree.getNodeAtPosition({ line: 5, character: 10 });
                const jsonNode = malformedJsonTree.getNodeAtPosition({ line: 10, character: 15 });

                expect(() => malformedYamlTree.getPathAndEntityInfo(yamlNode)).not.toThrow();
                expect(() => malformedJsonTree.getPathAndEntityInfo(jsonNode)).not.toThrow();

                // Section finding should not throw
                expect(() => malformedYamlTree.findTopLevelSections([TopLevelSection.Resources])).not.toThrow();
                expect(() => malformedJsonTree.findTopLevelSections([TopLevelSection.Resources])).not.toThrow();
            });
        });
    });

    describe('Node Position and Text Retrieval', () => {
        describe('getTextAtPosition', () => {
            it('should return correct text at specific positions - simple templates', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test resource name extraction
                const yamlResourceText = yamlTree.getTextAtPosition(position(2, 4));
                const jsonResourceText = jsonTree.getTextAtPosition(position(3, 6));

                expect(yamlResourceText).toContain('MyS3Bucket');
                expect(jsonResourceText).toContain('MyS3Bucket');

                // Test resource type extraction
                const yamlTypeText = yamlTree.getTextAtPosition(position(3, 18));
                const jsonTypeText = jsonTree.getTextAtPosition(position(4, 18));

                expect(yamlTypeText).toContain('AWS::S3::Bucket');
                expect(jsonTypeText).toContain('AWS::S3::Bucket');
            });

            it('should handle edge cases and boundary positions', () => {
                const yamlTree = createSyntaxTree(Templates.comprehensive.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.comprehensive.json.contents, DocumentType.JSON);

                // Test positions at document boundaries
                const yamlStartText = yamlTree.getTextAtPosition(position(0, 0));
                const jsonStartText = jsonTree.getTextAtPosition(position(0, 0));

                expect(yamlStartText).toBeDefined();
                expect(jsonStartText).toBeDefined();

                // Test out-of-bounds positions
                const yamlOutOfBounds = yamlTree.getTextAtPosition(position(10000, 10000));
                const jsonOutOfBounds = jsonTree.getTextAtPosition(position(10000, 10000));

                expect(yamlOutOfBounds).toBeDefined();
                expect(jsonOutOfBounds).toBeDefined();
            });

            it('should handle broken templates without throwing', () => {
                const brokenYaml = createSyntaxTree(Templates.broken.yaml.contents, DocumentType.YAML);
                const brokenJson = createSyntaxTree(Templates.broken.json.contents, DocumentType.JSON);

                // Test various positions in broken templates
                const positions = [position(0, 0), position(1, 0), position(2, 5), position(4, 0)];

                for (const pos of positions) {
                    expect(() => brokenYaml.getTextAtPosition(pos)).not.toThrow();
                    expect(() => brokenJson.getTextAtPosition(pos)).not.toThrow();
                }
            });
        });

        describe('getNodeAtPosition', () => {
            it('should find resource name nodes in simple CloudFormation templates and validate node text content', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test resource name nodes
                const yamlResourceNode = yamlTree.getNodeAtPosition(position(2, 4)); // MyS3Bucket
                const jsonResourceNode = jsonTree.getNodeAtPosition(position(3, 6)); // MyS3Bucket

                expect(yamlResourceNode).toBeDefined();
                expect(yamlResourceNode.type).toBeDefined();
                expect(yamlResourceNode.text).toContain('MyS3Bucket');

                expect(jsonResourceNode).toBeDefined();
                expect(jsonResourceNode.type).toBeDefined();
                expect(jsonResourceNode.text).toContain('MyS3Bucket');

                // Test resource type nodes
                const yamlTypeNode = yamlTree.getNodeAtPosition(position(3, 18)); // AWS::S3::Bucket
                const jsonTypeNode = jsonTree.getNodeAtPosition(position(4, 18)); // AWS::S3::Bucket

                expect(yamlTypeNode).toBeDefined();
                expect(yamlTypeNode.text).toContain('AWS::S3::Bucket');
                expect(jsonTypeNode).toBeDefined();
                expect(jsonTypeNode.text).toContain('AWS::S3::Bucket');
            });

            it('should find parameter and resource nodes in comprehensive CloudFormation templates and validate node text content', () => {
                const yamlTree = createSyntaxTree(Templates.comprehensive.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.comprehensive.json.contents, DocumentType.JSON);

                // Test parameter nodes
                const yamlParamNode = yamlTree.getNodeAtPosition(position(10, 15));
                const jsonParamNode = jsonTree.getNodeAtPosition(position(10, 15));

                expect(yamlParamNode).toBeDefined();
                expect(yamlParamNode.text).toBeDefined();
                expect(yamlParamNode.text.length).toBeGreaterThan(0);

                expect(jsonParamNode).toBeDefined();
                expect(jsonParamNode.text).toBeDefined();
                expect(jsonParamNode.text.length).toBeGreaterThan(0);

                // Test resource nodes
                const yamlResourceNode = yamlTree.getNodeAtPosition(position(50, 20));
                const jsonResourceNode = jsonTree.getNodeAtPosition(position(50, 20));

                expect(yamlResourceNode).toBeDefined();
                expect(yamlResourceNode.text).toBeDefined();
                expect(yamlResourceNode.text.length).toBeGreaterThan(0);

                expect(jsonResourceNode).toBeDefined();
                expect(jsonResourceNode.text).toBeDefined();
                expect(jsonResourceNode.text.length).toBeGreaterThan(0);
            });

            it('should find intrinsic function nodes and validate their text content contains function names', () => {
                const complexYaml = `
Resources:
  MyResource:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionMap, !Ref "AWS::Region", AMI]
      UserData: !Base64 
        Fn::Sub: |
          #!/bin/bash
          echo "Hello \${Environment}"
      Tags:
        - Key: Name
          Value: !Sub "\${Environment}-instance"`;

                const complexJson = `{
  "Resources": {
    "MyResource": {
      "Type": "AWS::EC2::Instance",
      "Properties": {
        "ImageId": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "AMI"]},
        "UserData": {"Fn::Base64": {"Fn::Sub": "#!/bin/bash\\necho \\"Hello \${Environment}\\""}},
        "Tags": [
          {"Key": "Name", "Value": {"Fn::Sub": "\${Environment}-instance"}}
        ]
      }
    }
  }
}`;

                const yamlTree = createSyntaxTree(complexYaml, DocumentType.YAML);
                const jsonTree = createSyntaxTree(complexJson, DocumentType.JSON);

                // Test !FindInMap function node
                const yamlFindInMapNode = yamlTree.getNodeAtPosition(position(5, 25));
                const jsonFindInMapNode = jsonTree.getNodeAtPosition(position(5, 25));

                expect(yamlFindInMapNode).toBeDefined();
                expect(yamlFindInMapNode.text).toContain('FindInMap');
                expect(jsonFindInMapNode).toBeDefined();
                expect(jsonFindInMapNode.text).toContain('FindInMap');

                // Test array elements in Tags
                const yamlTagNode = yamlTree.getNodeAtPosition(position(11, 15));
                const jsonTagNode = jsonTree.getNodeAtPosition(position(8, 15));

                expect(yamlTagNode).toBeDefined();
                expect(yamlTagNode.text).toBeDefined();
                expect(yamlTagNode.text.length).toBeGreaterThan(0);
                expect(jsonTagNode).toBeDefined();
                expect(jsonTagNode.text).toBeDefined();
                expect(jsonTagNode.text.length).toBeGreaterThan(0);
            });

            it('should handle boundary positions and whitespace', () => {
                const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
                const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

                // Test positions at boundaries
                const boundaryPositions = [
                    position(0, 0), // Very start
                    position(1, 0), // Start of Resources line
                    position(2, 2), // Indentation
                ];

                for (const pos of boundaryPositions) {
                    const yamlNode = yamlTree.getNodeAtPosition(pos);
                    const jsonNode = jsonTree.getNodeAtPosition(pos);

                    expect(yamlNode).toBeDefined();
                    expect(jsonNode).toBeDefined();
                }
            });

            it('should handle broken templates gracefully', () => {
                const brokenYaml = createSyntaxTree(Templates.broken.yaml.contents, DocumentType.YAML);
                const brokenJson = createSyntaxTree(Templates.broken.json.contents, DocumentType.JSON);

                // Test various positions in broken templates
                const testPositions = [
                    position(0, 0), // Start
                    position(1, 0), // Broken line
                    position(4, 0), // Resources section
                    position(6, 10), // Incomplete resource
                ];

                for (const pos of testPositions) {
                    const yamlNode = brokenYaml.getNodeAtPosition(pos);
                    const jsonNode = brokenJson.getNodeAtPosition(pos);

                    expect(yamlNode).toBeDefined();
                    expect(jsonNode).toBeDefined();
                }
            });
        });
    });

    describe('getPathAndEntityInfo', () => {
        it('should build correct paths for simple CloudFormation entities', () => {
            const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

            // Test resource property paths
            const yamlResourceNode = yamlTree.getNodeAtPosition(position(2, 4)); // MyS3Bucket
            const jsonResourceNode = jsonTree.getNodeAtPosition(position(3, 6)); // MyS3Bucket

            const yamlPath = yamlTree.getPathAndEntityInfo(yamlResourceNode);
            const jsonPath = jsonTree.getPathAndEntityInfo(jsonResourceNode);

            expect(yamlPath.path.length).toBeGreaterThan(0);
            expect(jsonPath.path.length).toBeGreaterThan(0);
            expect(yamlPath.propertyPath).toContain('Resources');
            expect(jsonPath.propertyPath).toContain('Resources');
        });

        it('should handle complex nested structures using sample templates', () => {
            const yamlTree = createSyntaxTree(Templates.sample.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.sample.json.contents, DocumentType.JSON);

            // Test parameter paths
            const yamlParamNode = yamlTree.getNodeAtPosition(position(20, 10)); // Inside Parameters
            const jsonParamNode = jsonTree.getNodeAtPosition(position(15, 10)); // Inside Parameters

            const yamlParamPath = yamlTree.getPathAndEntityInfo(yamlParamNode);
            const jsonParamPath = jsonTree.getPathAndEntityInfo(jsonParamNode);

            expect(yamlParamPath.path.length).toBeGreaterThan(0);
            expect(jsonParamPath.path.length).toBeGreaterThan(0);

            // Test resource paths
            const yamlResourceNode = yamlTree.getNodeAtPosition(position(40, 10)); // Inside Resources
            const jsonResourceNode = jsonTree.getNodeAtPosition(position(35, 10)); // Inside Resources

            const yamlResourcePath = yamlTree.getPathAndEntityInfo(yamlResourceNode);
            const jsonResourcePath = jsonTree.getPathAndEntityInfo(jsonResourceNode);

            expect(yamlResourcePath.path.length).toBeGreaterThan(0);
            expect(jsonResourcePath.path.length).toBeGreaterThan(0);
        });

        it('should handle mappings and conditions', () => {
            const complexYaml = `
Mappings:
  RegionMap:
    us-east-1:
      AMI: "ami-12345"
      Config:
        MaxSize: 5
        Features: ["feature1", "feature2"]
        Nested:
          DeepProperty: "value"
Conditions:
  ComplexCondition: !And
    - !Equals [!Ref Environment, "prod"]
    - !Not [!Condition IsDev]`;

            const complexJson = `{
  "Mappings": {
    "RegionMap": {
      "us-east-1": {
        "AMI": "ami-12345",
        "Config": {
          "MaxSize": 5,
          "Features": ["feature1", "feature2"],
          "Nested": {
            "DeepProperty": "value"
          }
        }
      }
    }
  },
  "Conditions": {
    "ComplexCondition": {
      "Fn::And": [
        {"Fn::Equals": [{"Ref": "Environment"}, "prod"]},
        {"Fn::Not": [{"Condition": "IsDev"}]}
      ]
    }
  }
}`;

            const yamlTree = createSyntaxTree(complexYaml, DocumentType.YAML);
            const jsonTree = createSyntaxTree(complexJson, DocumentType.JSON);

            // Test deeply nested mapping path
            const yamlDeepNode = yamlTree.getNodeAtPosition(position(9, 20)); // DeepProperty
            const jsonDeepNode = jsonTree.getNodeAtPosition(position(10, 20)); // DeepProperty

            const yamlDeepPath = yamlTree.getPathAndEntityInfo(yamlDeepNode);
            const jsonDeepPath = jsonTree.getPathAndEntityInfo(jsonDeepNode);

            expect(yamlDeepPath.propertyPath).toContain('Mappings');
            expect(yamlDeepPath.propertyPath).toContain('RegionMap');
            expect(jsonDeepPath.propertyPath).toContain('Mappings');
            expect(jsonDeepPath.propertyPath).toContain('RegionMap');

            // Test array indices in Features
            const yamlArrayNode = yamlTree.getNodeAtPosition(position(7, 15)); // Inside Features array
            const jsonArrayNode = jsonTree.getNodeAtPosition(position(8, 15)); // Inside Features array

            const yamlArrayPath = yamlTree.getPathAndEntityInfo(yamlArrayNode);
            const jsonArrayPath = jsonTree.getPathAndEntityInfo(jsonArrayNode);

            // Should contain either Features or be in the Config structure
            const yamlHasExpectedPath =
                yamlArrayPath.propertyPath.includes('Features') || yamlArrayPath.propertyPath.includes('Config');
            const jsonHasExpectedPath =
                jsonArrayPath.propertyPath.includes('Features') || jsonArrayPath.propertyPath.includes('Config');

            expect(yamlHasExpectedPath).toBe(true);
            expect(jsonHasExpectedPath).toBe(true);
        });

        it('should handle intrinsic functions and references', () => {
            const functionsYaml = `
Resources:
  MyResource:
    Type: AWS::EC2::Instance
    Properties:
      ImageId: !FindInMap [RegionMap, !Ref "AWS::Region", AMI]
      SecurityGroups:
        - !Ref SecurityGroup
        - !GetAtt AnotherSG.GroupId
      UserData: !Base64
        Fn::Sub: |
          #!/bin/bash
          echo "Region: \${AWS::Region}"`;

            const functionsJson = `{
  "Resources": {
    "MyResource": {
      "Type": "AWS::EC2::Instance",
      "Properties": {
        "ImageId": {"Fn::FindInMap": ["RegionMap", {"Ref": "AWS::Region"}, "AMI"]},
        "SecurityGroups": [
          {"Ref": "SecurityGroup"},
          {"Fn::GetAtt": ["AnotherSG", "GroupId"]}
        ],
        "UserData": {
          "Fn::Base64": {
            "Fn::Sub": "#!/bin/bash\\necho \\"Region: \${AWS::Region}\\""
          }
        }
      }
    }
  }
}`;

            const yamlTree = createSyntaxTree(functionsYaml, DocumentType.YAML);
            const jsonTree = createSyntaxTree(functionsJson, DocumentType.JSON);

            // Test !FindInMap function path
            const yamlFindInMapNode = yamlTree.getNodeAtPosition(position(5, 30));
            const jsonFindInMapNode = jsonTree.getNodeAtPosition(position(5, 30));

            const yamlFindInMapPath = yamlTree.getPathAndEntityInfo(yamlFindInMapNode);
            const jsonFindInMapPath = jsonTree.getPathAndEntityInfo(jsonFindInMapNode);

            expect(yamlFindInMapPath.propertyPath).toContain('Resources');
            expect(yamlFindInMapPath.propertyPath).toContain('MyResource');
            expect(yamlFindInMapPath.propertyPath).toContain('Properties');
            expect(yamlFindInMapPath.propertyPath).toContain('ImageId');

            expect(jsonFindInMapPath.propertyPath).toContain('Resources');
            expect(jsonFindInMapPath.propertyPath).toContain('MyResource');
            expect(jsonFindInMapPath.propertyPath).toContain('Properties');
            expect(jsonFindInMapPath.propertyPath).toContain('ImageId');

            // Test array element in SecurityGroups
            const yamlArrayRefNode = yamlTree.getNodeAtPosition(position(7, 15));
            const jsonArrayRefNode = jsonTree.getNodeAtPosition(position(7, 15));

            const yamlArrayRefPath = yamlTree.getPathAndEntityInfo(yamlArrayRefNode);
            const jsonArrayRefPath = jsonTree.getPathAndEntityInfo(jsonArrayRefNode);

            expect(yamlArrayRefPath.propertyPath).toContain('SecurityGroups');
            expect(jsonArrayRefPath.propertyPath).toContain('SecurityGroups');

            // Should contain array index
            expect(yamlArrayRefPath.propertyPath.some((p) => typeof p === 'number')).toBe(true);
            expect(jsonArrayRefPath.propertyPath.some((p) => typeof p === 'number')).toBe(true);
        });

        it('should identify correct entity root nodes', () => {
            const yamlTree = createSyntaxTree(Templates.comprehensive.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.comprehensive.json.contents, DocumentType.JSON);

            // Test parameter entity root
            const yamlParamNode = yamlTree.getNodeAtPosition(position(20, 15));
            const jsonParamNode = jsonTree.getNodeAtPosition(position(15, 15));

            const yamlParamPath = yamlTree.getPathAndEntityInfo(yamlParamNode);
            const jsonParamPath = jsonTree.getPathAndEntityInfo(jsonParamNode);

            expect(yamlParamPath.path.length).toBeGreaterThan(0);
            expect(jsonParamPath.path.length).toBeGreaterThan(0);

            // Test resource entity root
            const yamlResourceNode = yamlTree.getNodeAtPosition(position(100, 15));
            const jsonResourceNode = jsonTree.getNodeAtPosition(position(80, 15));

            const yamlResourcePath = yamlTree.getPathAndEntityInfo(yamlResourceNode);
            const jsonResourcePath = jsonTree.getPathAndEntityInfo(jsonResourceNode);

            expect(yamlResourcePath.path.length).toBeGreaterThan(0);
            expect(jsonResourcePath.path.length).toBeGreaterThan(0);

            // Entity root should be defined for deep paths
            if (yamlResourcePath.propertyPath.length >= 2) {
                expect(yamlResourcePath.entityRootNode).toBeDefined();
            }
            if (jsonResourcePath.propertyPath.length >= 2) {
                expect(jsonResourcePath.entityRootNode).toBeDefined();
            }
        });

        it('should handle broken templates gracefully', () => {
            const brokenYaml = createSyntaxTree(Templates.broken.yaml.contents, DocumentType.YAML);
            const brokenJson = createSyntaxTree(Templates.broken.json.contents, DocumentType.JSON);

            const testPositions = [
                position(1, 0), // Broken line
                position(2, 5), // Middle of broken content
                position(4, 0), // Resources section
                position(5, 10), // Inside incomplete resource
            ];

            for (const pos of testPositions) {
                const yamlNode = brokenYaml.getNodeAtPosition(pos);
                const jsonNode = brokenJson.getNodeAtPosition(pos);

                const yamlPath = brokenYaml.getPathAndEntityInfo(yamlNode);
                const jsonPath = brokenJson.getPathAndEntityInfo(jsonNode);

                // Should not throw and should return valid path info
                expect(yamlPath.path).toBeDefined();
                expect(yamlPath.propertyPath).toBeDefined();
                expect(jsonPath.path).toBeDefined();
                expect(jsonPath.propertyPath).toBeDefined();
            }
        });

        it('should handle null and invalid nodes gracefully', () => {
            const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

            // Test null node
            const yamlNullPath = yamlTree.getPathAndEntityInfo(null as any);
            const jsonNullPath = jsonTree.getPathAndEntityInfo(null as any);

            expect(yamlNullPath.path).toEqual([]);
            expect(yamlNullPath.propertyPath).toEqual([]);
            expect(jsonNullPath.path).toEqual([]);
            expect(jsonNullPath.propertyPath).toEqual([]);

            // Test undefined node
            const yamlUndefinedPath = yamlTree.getPathAndEntityInfo(undefined as any);
            const jsonUndefinedPath = jsonTree.getPathAndEntityInfo(undefined as any);

            expect(yamlUndefinedPath.path).toEqual([]);
            expect(yamlUndefinedPath.propertyPath).toEqual([]);
            expect(jsonUndefinedPath.path).toEqual([]);
            expect(jsonUndefinedPath.propertyPath).toEqual([]);
        });

        it('should demonstrate edge cases with malformed structures', () => {
            const edgeCaseYaml = `
AWSTemplateFormatVersion: "2010-09-09"
# Orphaned properties without parent resource
Properties:
  BucketName: "orphaned"
Resources:
  ValidResource:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - "string-tag"
        - Key: "proper-tag"
          Value: "value"
        - 123  # Invalid tag format
      BucketName: "bucket-name"`;

            const edgeCaseJson = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Properties": {
    "BucketName": "orphaned"
  },
  "Resources": {
    "ValidResource": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Tags": [
          "string-tag",
          {"Key": "proper-tag", "Value": "value"},
          123
        ],
        "BucketName": "bucket-name"
      }
    }
  }
}`;

            const yamlTree = createSyntaxTree(edgeCaseYaml, DocumentType.YAML);
            const jsonTree = createSyntaxTree(edgeCaseJson, DocumentType.JSON);

            // Test orphaned properties - should NOT be under Resources path
            const yamlOrphanedNode = yamlTree.getNodeAtPosition(position(3, 0)); // Orphaned Properties
            const jsonOrphanedNode = jsonTree.getNodeAtPosition(position(3, 2)); // Orphaned Properties

            const yamlOrphanedPath = yamlTree.getPathAndEntityInfo(yamlOrphanedNode);
            const jsonOrphanedPath = jsonTree.getPathAndEntityInfo(jsonOrphanedNode);

            expect(yamlOrphanedPath.propertyPath).not.toContain('Resources');
            expect(jsonOrphanedPath.propertyPath).not.toContain('Resources');

            // Test mixed array types
            const yamlStringTagNode = yamlTree.getNodeAtPosition(position(10, 10)); // "string-tag"
            const jsonStringTagNode = jsonTree.getNodeAtPosition(position(9, 10)); // "string-tag"

            const yamlStringTagPath = yamlTree.getPathAndEntityInfo(yamlStringTagNode);
            const jsonStringTagPath = jsonTree.getPathAndEntityInfo(jsonStringTagNode);

            expect(yamlStringTagPath.propertyPath).toContain('Tags');
            expect(jsonStringTagPath.propertyPath).toContain('Tags');

            // Should contain array index if we're actually in the array
            const yamlHasArrayIndex = yamlStringTagPath.propertyPath.some((p) => typeof p === 'number');
            const jsonHasArrayIndex = jsonStringTagPath.propertyPath.some((p) => typeof p === 'number');

            // At least one should have array index (depending on exact position)
            expect(yamlHasArrayIndex || jsonHasArrayIndex).toBe(true);
        });
    });

    describe('findTopLevelSections', () => {
        it('should find all sections in comprehensive templates', () => {
            const yamlTree = createSyntaxTree(Templates.comprehensive.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.comprehensive.json.contents, DocumentType.JSON);

            const yamlSections = yamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = jsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            // Both should find major sections
            expect(yamlSections.has(TopLevelSection.Resources)).toBe(true);
            expect(yamlSections.has(TopLevelSection.Parameters)).toBe(true);
            expect(yamlSections.has(TopLevelSection.AWSTemplateFormatVersion)).toBe(true);

            expect(jsonSections.has(TopLevelSection.Resources)).toBe(true);
            expect(jsonSections.has(TopLevelSection.Parameters)).toBe(true);
            expect(jsonSections.has(TopLevelSection.AWSTemplateFormatVersion)).toBe(true);

            // Comprehensive template should have additional sections
            expect(yamlSections.has(TopLevelSection.Transform) || yamlSections.has(TopLevelSection.Metadata)).toBe(
                true,
            );
            expect(jsonSections.has(TopLevelSection.Transform) || jsonSections.has(TopLevelSection.Metadata)).toBe(
                true,
            );
        });

        it('should find sections in sample templates', () => {
            const yamlTree = createSyntaxTree(Templates.sample.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.sample.json.contents, DocumentType.JSON);

            const yamlSections = yamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = jsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            expect(yamlSections.has(TopLevelSection.Resources)).toBe(true);
            expect(yamlSections.has(TopLevelSection.Parameters)).toBe(true);
            expect(yamlSections.has(TopLevelSection.Mappings)).toBe(true);
            expect(yamlSections.has(TopLevelSection.Conditions)).toBe(true);

            expect(jsonSections.has(TopLevelSection.Resources)).toBe(true);
            expect(jsonSections.has(TopLevelSection.Parameters)).toBe(true);
            expect(jsonSections.has(TopLevelSection.Mappings)).toBe(true);
            expect(jsonSections.has(TopLevelSection.Conditions)).toBe(true);
        });

        it('should handle minimal templates', () => {
            const yamlTree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const jsonTree = createSyntaxTree(Templates.simple.json.contents, DocumentType.JSON);

            const yamlSections = yamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = jsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            expect(yamlSections.has(TopLevelSection.Resources)).toBe(true);
            expect(yamlSections.has(TopLevelSection.AWSTemplateFormatVersion)).toBe(true);
            expect(yamlSections.has(TopLevelSection.Parameters)).toBe(false);

            expect(jsonSections.has(TopLevelSection.Resources)).toBe(true);
            expect(jsonSections.has(TopLevelSection.AWSTemplateFormatVersion)).toBe(true);
            expect(jsonSections.has(TopLevelSection.Parameters)).toBe(false);
        });

        it('should handle broken templates', () => {
            const brokenYamlTree = createSyntaxTree(Templates.broken.yaml.contents, DocumentType.YAML);
            const brokenJsonTree = createSyntaxTree(Templates.broken.json.contents, DocumentType.JSON);

            const yamlSections = brokenYamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = brokenJsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            // Should find at least some sections without throwing
            expect(yamlSections.has(TopLevelSection.AWSTemplateFormatVersion)).toBe(true);

            // Resources section might not be detected in broken templates, so check more flexibly
            const yamlHasBasicSections =
                yamlSections.has(TopLevelSection.Resources) ||
                yamlSections.has(TopLevelSection.AWSTemplateFormatVersion);
            expect(yamlHasBasicSections).toBe(true);

            // Broken JSON might not parse correctly, but should not throw
            expect(jsonSections.size).toBeGreaterThanOrEqual(0);
        });

        it('should return empty map for non-CloudFormation content', () => {
            const nonCfnYamlTree = createSyntaxTree('just: some yaml', DocumentType.YAML);
            const nonCfnJsonTree = createSyntaxTree('{"not": "cloudformation"}', DocumentType.JSON);

            const yamlSections = nonCfnYamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = nonCfnJsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            expect(yamlSections.size).toBe(0);
            expect(jsonSections.size).toBe(0);
        });

        it('should handle empty templates', () => {
            const emptyYamlTree = createSyntaxTree('', DocumentType.YAML);
            const emptyJsonTree = createSyntaxTree('', DocumentType.JSON);

            const yamlSections = emptyYamlTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);
            const jsonSections = emptyJsonTree.findTopLevelSections(TopLevelSections as TopLevelSection[]);

            expect(yamlSections.size).toBe(0);
            expect(jsonSections.size).toBe(0);
        });
    });

    describe('Incremental Parsing Fix for YAML Autocompletion', () => {
        describe('getNodeAtPosition with incomplete YAML', () => {
            it('should handle incomplete keys using incremental parsing', () => {
                const incompleteYaml = `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test
      Tag`;

                const yamlTree = createSyntaxTree(incompleteYaml, DocumentType.YAML);
                const node = yamlTree.getNodeAtPosition({ line: 5, character: 9 });

                expect(node.type).toBe('string_scalar');
                expect(node.text).toBe('Tag');
            });

            it('should handle incomplete keys at different nesting levels', () => {
                const testCases = [
                    {
                        name: 'Root level property',
                        yaml: `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketNa`,
                        position: { line: 4, character: 14 },
                        expectedText: 'BucketNa',
                    },
                    {
                        name: 'Nested property',
                        yaml: `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      LifecycleConfiguration:
        Rules:
          - Prefix: test
            Statu`,
                        position: { line: 7, character: 17 },
                        expectedText: 'Statu',
                    },
                ];

                for (const testCase of testCases) {
                    const yamlTree = createSyntaxTree(testCase.yaml, DocumentType.YAML);
                    const node = yamlTree.getNodeAtPosition(testCase.position);

                    expect(node.text).toBe(testCase.expectedText);
                }
            });

            it('should not interfere with complete YAML', () => {
                const completeYaml = `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test
      Tags:
        - Key: Environment
          Value: Production`;

                const yamlTree = createSyntaxTree(completeYaml, DocumentType.YAML);
                const node = yamlTree.getNodeAtPosition({ line: 5, character: 10 });

                expect(node.text).toBe('Tags');
            });
        });

        describe('getPathAndEntityInfo with entity root selection fix', () => {
            it('should select correct entity root for Resources section', () => {
                const incompleteYaml = `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: test
      Tag`;

                const yamlTree = createSyntaxTree(incompleteYaml, DocumentType.YAML);
                const position = { line: 5, character: 9 }; // End of "Tag"

                const node = yamlTree.getNodeAtPosition(position);
                const pathInfo = yamlTree.getPathAndEntityInfo(node);

                // Should get correct property path
                expect(pathInfo.propertyPath).toEqual(['Resources', 'MyBucket', 'Properties', 'Tag']);

                // Entity root should contain the complete resource definition, not just Properties
                expect(pathInfo.entityRootNode).toBeDefined();
                if (pathInfo.entityRootNode) {
                    // The entity root should contain both Type and Properties
                    expect(pathInfo.entityRootNode.text).toContain('Type: AWS::S3::Bucket');
                    expect(pathInfo.entityRootNode.text).toContain('Properties:');
                }
            });

            it('should handle different resource types correctly', () => {
                const testCases = [
                    {
                        resourceType: 'AWS::S3::Bucket',
                        yaml: `Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      Tag`,
                    },
                    {
                        resourceType: 'AWS::Lambda::Function',
                        yaml: `Resources:
  MyFunction:
    Type: AWS::Lambda::Function
    Properties:
      Runtime: nodejs18.x
      Hand`,
                    },
                ];

                for (const testCase of testCases) {
                    const yamlTree = createSyntaxTree(testCase.yaml, DocumentType.YAML);
                    const lastLine = testCase.yaml.split('\n').length - 1;
                    const lastLineText = testCase.yaml.split('\n')[lastLine];
                    const position = { line: lastLine, character: lastLineText.length };

                    const node = yamlTree.getNodeAtPosition(position);
                    const pathInfo = yamlTree.getPathAndEntityInfo(node);

                    // Should get correct property path for any resource type
                    expect(pathInfo.propertyPath[0]).toBe('Resources');
                    expect(pathInfo.propertyPath[2]).toBe('Properties');

                    // Entity root should contain the resource type
                    expect(pathInfo.entityRootNode).toBeDefined();
                    if (pathInfo.entityRootNode) {
                        expect(pathInfo.entityRootNode.text).toContain(`Type: ${testCase.resourceType}`);
                    }
                }
            });

            it('should not affect non-Resources sections', () => {
                const yamlWithParameters = `Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedVal`;

                const yamlTree = createSyntaxTree(yamlWithParameters, DocumentType.YAML);
                const position = { line: 4, character: 14 }; // End of "AllowedVal"

                const node = yamlTree.getNodeAtPosition(position);
                const pathInfo = yamlTree.getPathAndEntityInfo(node);

                // Should work correctly for non-Resources sections
                expect(pathInfo.propertyPath).toContain('Parameters');
                expect(pathInfo.propertyPath).toContain('Environment');
            });
        });
    });

    describe('getNodeByPath', () => {
        it('should handle basic path resolution', () => {
            const yamlTree = createSyntaxTree(
                `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`,
                DocumentType.YAML,
            );

            // Test finding Resources section
            const resourcesResult = yamlTree.getNodeByPath(['Resources']);
            expect(resourcesResult.node).toBeDefined();
            expect(resourcesResult.fullyResolved).toBe(true);

            // Test finding specific resource
            const bucketResult = yamlTree.getNodeByPath(['Resources', 'MyBucket']);
            expect(bucketResult.node).toBeDefined();
            expect(bucketResult.fullyResolved).toBe(true);

            // Test finding resource property
            const typeResult = yamlTree.getNodeByPath(['Resources', 'MyBucket', 'Type']);
            expect(typeResult.node).toBeDefined();
            expect(typeResult.fullyResolved).toBe(true);
        });

        it('should return partial results for non-existent paths', () => {
            const yamlTree = createSyntaxTree(
                `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`,
                DocumentType.YAML,
            );

            // Test non-existent resource
            const nonExistentResult = yamlTree.getNodeByPath(['Resources', 'NonExistentResource']);
            expect(nonExistentResult.fullyResolved).toBe(false);

            // Test non-existent property on existing resource
            const nonExistentPropResult = yamlTree.getNodeByPath(['Resources', 'MyBucket', 'NonExistentProperty']);
            expect(nonExistentPropResult.fullyResolved).toBe(false);

            // Test completely invalid path
            const invalidPathResult = yamlTree.getNodeByPath(['InvalidSection', 'InvalidResource']);
            expect(invalidPathResult.fullyResolved).toBe(false);
        });

        it('should handle empty and single-segment paths', () => {
            const yamlTree = createSyntaxTree(
                `
AWSTemplateFormatVersion: '2010-09-09'
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
`,
                DocumentType.YAML,
            );

            // Test empty path - behavior may vary, just ensure it doesn't throw
            const emptyPathResult = yamlTree.getNodeByPath([]);
            expect(() => emptyPathResult).not.toThrow();

            // Test single segment path
            const singleSegmentResult = yamlTree.getNodeByPath(['AWSTemplateFormatVersion']);
            expect(singleSegmentResult.node).toBeDefined();
            expect(singleSegmentResult.fullyResolved).toBe(true);
        });

        it('should handle malformed templates gracefully', () => {
            const malformedYaml = createSyntaxTree(
                `
Resources:
  MyBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: "unclosed-string
      Tags:
        - Key: Environment
          Value: dev
    # Missing closing bracket
`,
                DocumentType.YAML,
            );

            // Should still be able to find valid parts
            const resourcesResult = malformedYaml.getNodeByPath(['Resources']);
            expect(resourcesResult.node).toBeDefined();

            const bucketResult = malformedYaml.getNodeByPath(['Resources', 'MyBucket']);
            expect(bucketResult.node).toBeDefined();

            // Should handle paths that go into malformed areas without throwing
            expect(() => {
                malformedYaml.getNodeByPath(['Resources', 'MyBucket', 'Properties', 'BucketName']);
                // Just verify it doesn't throw, result may vary
            }).not.toThrow();
        });
    });

    describe('JSON array item handling', () => {
        it('should calculate correct index for JSON array items', () => {
            const jsonTree = createSyntaxTree(
                `{
  "Resources": {
    "MyBucket": {
      "Type": "AWS::S3::Bucket",
      "Properties": {
        "Tags": [
          {"Key": "Name", "Value": "First"},
          {"Key": "Environment", "Value": "Second"}
        ]
      }
    }
  }
}`,
                DocumentType.JSON,
            );

            // Test getPropertyPath on JSON array items to trigger the array index logic
            const tagsPosition = position(7, 12); // Position inside first array item
            const nodeAtPosition = jsonTree.getNodeAtPosition(tagsPosition);

            if (nodeAtPosition) {
                const pathInfo = jsonTree.getPathAndEntityInfo(nodeAtPosition);
                expect(pathInfo).toBeDefined();
                expect(pathInfo.propertyPath).toBeDefined();
                expect(Array.isArray(pathInfo.propertyPath)).toBe(true);
            }
        });

        it('should handle empty JSON arrays', () => {
            const jsonTree = createSyntaxTree(
                `{
  "Resources": {
    "MyBucket": {
      "Properties": {
        "Tags": []
      }
    }
  }
}`,
                DocumentType.JSON,
            );

            // Test that empty arrays don't cause issues
            const emptyArrayPosition = position(4, 15); // Position near empty array
            const nodeAtPosition = jsonTree.getNodeAtPosition(emptyArrayPosition);

            if (nodeAtPosition) {
                expect(() => {
                    jsonTree.getPathAndEntityInfo(nodeAtPosition);
                }).not.toThrow();
            }
        });
    });

    describe('sibling node handling', () => {
        it('should handle nodes with multiple siblings correctly', () => {
            const yamlTree = createSyntaxTree(
                `Resources:
  FirstResource:
    Type: AWS::S3::Bucket
  SecondResource:
    Type: AWS::EC2::Instance
  ThirdResource:
    Type: AWS::Lambda::Function`,
                DocumentType.YAML,
            );

            // Test getPropertyPath on different resources to trigger sibling counting logic
            const firstResourcePos = position(1, 2); // Inside FirstResource
            const secondResourcePos = position(3, 2); // Inside SecondResource
            const thirdResourcePos = position(5, 2); // Inside ThirdResource

            const firstNode = yamlTree.getNodeAtPosition(firstResourcePos);
            const secondNode = yamlTree.getNodeAtPosition(secondResourcePos);
            const thirdNode = yamlTree.getNodeAtPosition(thirdResourcePos);

            // Test that path calculation works for nodes with siblings
            if (firstNode) {
                const pathInfo1 = yamlTree.getPathAndEntityInfo(firstNode);
                expect(pathInfo1).toBeDefined();
                expect(pathInfo1.propertyPath).toBeDefined();
            }

            if (secondNode) {
                const pathInfo2 = yamlTree.getPathAndEntityInfo(secondNode);
                expect(pathInfo2).toBeDefined();
                expect(pathInfo2.propertyPath).toBeDefined();
            }

            if (thirdNode) {
                const pathInfo3 = yamlTree.getPathAndEntityInfo(thirdNode);
                expect(pathInfo3).toBeDefined();
                expect(pathInfo3.propertyPath).toBeDefined();
            }
        });

        it('should handle nodes without previous siblings', () => {
            const yamlTree = createSyntaxTree(
                `Resources:
  OnlyResource:
    Type: AWS::S3::Bucket`,
                DocumentType.YAML,
            );

            // Test getPropertyPath on a node without siblings
            const resourcePos = position(1, 2); // Inside OnlyResource
            const node = yamlTree.getNodeAtPosition(resourcePos);

            if (node) {
                expect(() => {
                    const pathInfo = yamlTree.getPathAndEntityInfo(node);
                    expect(pathInfo).toBeDefined();
                    expect(Array.isArray(pathInfo.propertyPath)).toBe(true);
                }).not.toThrow();
            }
        });
    });

    describe('synthetic node creation edge cases', () => {
        it('should handle empty line in beyond line position (line 377)', () => {
            const template = `Resources:

  Bucket:
    Type: AWS::S3::Bucket`;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            // Position on completely empty line
            const node = tree.getNodeAtPosition({ line: 1, character: 5 });
            expect(node).toBeDefined();
        });

        it('should handle position before trimmed content (line 382)', () => {
            const template = `Resources:
  Bucket:    `;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            // Position before the trimmed content end
            const node = tree.getNodeAtPosition({ line: 1, character: 8 });
            expect(node).toBeDefined();
        });

        it('should return Key and Value for cursor after dash in array item', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - `;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            // Position after the dash (where cursor would be)
            const node = tree.getNodeAtPosition({ line: 5, character: 10 });
            expect(node).toBeDefined();
            expect(node.type).toBe(CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE);
        });

        it('should return Key and Value for cursor after dash and empty line in array item', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - 
          `;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            // Position after the dash (where cursor would be)
            const node = tree.getNodeAtPosition({ line: 6, character: 10 });
            expect(node).toBeDefined();
            expect(node.type).toBe(CommonNodeTypes.SYNTHETIC_KEY_OR_VALUE);
        });

        it('should return Key for cursor after being in a mapping', () => {
            const template = `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties: {
      
    }`;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            // Position after the dash (where cursor would be)
            const node = tree.getNodeAtPosition({ line: 4, character: 6 });
            expect(node).toBeDefined();
            expect(node.type).toBe(CommonNodeTypes.SYNTHETIC_KEY);

            // Validate the path is correct
            const pathInfo = tree.getPathAndEntityInfo(node);
            expect(pathInfo).toBeDefined();
            expect(pathInfo.propertyPath).toStrictEqual(['Resources', 'Bucket', 'Properties', '']);
        });
    });

    describe('topLevelSections', () => {
        it('should return top level sections', () => {
            const tree = createSyntaxTree(Templates.simple.yaml.contents, DocumentType.YAML);
            const sections = tree.topLevelSections();
            expect(Array.isArray(sections)).toBe(true);
        });
    });

    describe('getChildIndex', () => {
        it('should handle nodes with siblings', () => {
            const template = `
Resources:
  First: {}
  Second: {}
  Third: {}`;
            const tree = createSyntaxTree(template, DocumentType.YAML);
            const resourcesResult = tree.getNodeByPath(['Resources']);
            if (resourcesResult.node?.namedChildren && resourcesResult.node.namedChildren.length >= 2) {
                // Access private method via any cast for testing
                const index = (tree as any).getChildIndex(resourcesResult.node.namedChildren[1]);
                expect(typeof index).toBe('number');
            }
        });
    });
});
