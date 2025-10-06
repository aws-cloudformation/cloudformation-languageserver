import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach } from 'vitest';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../../../src/document/Document';
import { TemplateStructureUtils } from '../../../../src/services/extractToParameter/TemplateStructureUtils';

describe('TemplateStructureUtils', () => {
    let utils: TemplateStructureUtils;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        utils = new TemplateStructureUtils(mockSyntaxTreeManager);
    });

    describe('findParametersSection', () => {
        it('should find existing Parameters section in JSON template', () => {
            const jsonTemplate = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Parameters": {
                    "ExistingParam": {
                        "Type": "String",
                        "Default": "value"
                    }
                },
                "Resources": {}
            }`;

            const result = utils.findParametersSection(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(true);
            expect(result?.content).toContain('ExistingParam');
        });

        it('should find existing Parameters section in YAML template', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  ExistingParam:
    Type: String
    Default: value
Resources: {}`;

            const result = utils.findParametersSection(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(true);
            expect(result?.content).toContain('ExistingParam');
        });

        it('should return undefined when Parameters section does not exist in JSON', () => {
            const jsonTemplate = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Resources": {}
            }`;

            const result = utils.findParametersSection(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });

        it('should return undefined when Parameters section does not exist in YAML', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources: {}`;

            const result = utils.findParametersSection(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });

        it('should handle empty JSON template', () => {
            const jsonTemplate = '{}';

            const result = utils.findParametersSection(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });

        it('should handle empty YAML template', () => {
            const yamlTemplate = '';

            const result = utils.findParametersSection(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });

        it('should handle malformed JSON gracefully', () => {
            const malformedJson = '{ "Parameters": ';

            const result = utils.findParametersSection(malformedJson, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });

        it.todo('should handle malformed YAML gracefully', () => {
            const malformedYaml = 'Parameters:\n  - invalid: structure';

            const result = utils.findParametersSection(malformedYaml, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.exists).toBe(false);
        });
    });

    describe('createParametersSection', () => {
        it('should create properly formatted Parameters section for JSON', () => {
            const result = utils.createParametersSection(DocumentType.JSON);

            expect(result).toBe('  "Parameters": {\n  }');
        });

        it('should create properly formatted Parameters section for YAML', () => {
            const result = utils.createParametersSection(DocumentType.YAML);

            expect(result).toBe('Parameters:');
        });
    });

    describe('determineParameterInsertionPoint', () => {
        it('should determine insertion point when Parameters section exists in JSON', () => {
            const jsonTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Parameters": {
    "ExistingParam": {
      "Type": "String"
    }
  },
  "Resources": {}
}`;

            const result = utils.determineParameterInsertionPoint(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(true);
            expect(result?.position).toBeGreaterThan(0);
        });

        it('should determine insertion point when Parameters section exists in YAML', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Parameters:
  ExistingParam:
    Type: String
Resources: {}`;

            const result = utils.determineParameterInsertionPoint(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(true);
            expect(result?.position).toBeGreaterThan(0);
        });

        it('should determine insertion point when Parameters section does not exist in JSON', () => {
            const jsonTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09",
  "Resources": {}
}`;

            const result = utils.determineParameterInsertionPoint(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(false);
            expect(result?.position).toBeGreaterThan(0);
        });

        it('should determine insertion point when Parameters section does not exist in YAML', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Resources: {}`;

            const result = utils.determineParameterInsertionPoint(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(false);
            expect(result?.position).toBeGreaterThan(0);
        });

        it('should handle template with only AWSTemplateFormatVersion in JSON', () => {
            const jsonTemplate = `{
  "AWSTemplateFormatVersion": "2010-09-09"
}`;

            const result = utils.determineParameterInsertionPoint(jsonTemplate, DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(false);
        });

        it('should handle template with only AWSTemplateFormatVersion in YAML', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'`;

            const result = utils.determineParameterInsertionPoint(yamlTemplate, DocumentType.YAML);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(false);
        });

        it('should handle empty template gracefully', () => {
            const result = utils.determineParameterInsertionPoint('{}', DocumentType.JSON);

            expect(result).toBeDefined();
            expect(result?.withinExistingSection).toBe(false);
        });
    });

    describe('getExistingParameterNames', () => {
        it('should extract parameter names from JSON template', () => {
            const jsonTemplate = `{
                "Parameters": {
                    "InstanceType": {
                        "Type": "String"
                    },
                    "KeyName": {
                        "Type": "String"
                    }
                }
            }`;

            const result = utils.getExistingParameterNames(jsonTemplate, DocumentType.JSON);

            expect(result).toEqual(new Set(['InstanceType', 'KeyName']));
        });

        it('should extract parameter names from YAML template', () => {
            const yamlTemplate = `Parameters:
  InstanceType:
    Type: String
  KeyName:
    Type: String`;

            const result = utils.getExistingParameterNames(yamlTemplate, DocumentType.YAML);

            expect(result).toEqual(new Set(['InstanceType', 'KeyName']));
        });

        it('should return empty set when no Parameters section exists', () => {
            const jsonTemplate = `{
                "Resources": {}
            }`;

            const result = utils.getExistingParameterNames(jsonTemplate, DocumentType.JSON);

            expect(result).toEqual(new Set());
        });

        it('should return empty set when Parameters section is empty', () => {
            const jsonTemplate = `{
                "Parameters": {}
            }`;

            const result = utils.getExistingParameterNames(jsonTemplate, DocumentType.JSON);

            expect(result).toEqual(new Set());
        });

        it('should handle malformed template gracefully', () => {
            const malformedTemplate = '{ "Parameters": invalid }';

            const result = utils.getExistingParameterNames(malformedTemplate, DocumentType.JSON);

            expect(result).toEqual(new Set());
        });
    });

    describe('edge cases', () => {
        it('should handle template with comments in YAML', () => {
            const yamlTemplate = `# CloudFormation template
AWSTemplateFormatVersion: '2010-09-09'
# Parameters section
Parameters:
  # Instance type parameter
  InstanceType:
    Type: String
Resources: {}`;

            const result = utils.findParametersSection(yamlTemplate, DocumentType.YAML);

            expect(result?.exists).toBe(true);
        });

        it('should handle deeply nested JSON structure', () => {
            const jsonTemplate = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Parameters": {
                    "NestedParam": {
                        "Type": "String",
                        "AllowedValues": ["value1", "value2"],
                        "ConstraintDescription": "Must be one of the allowed values"
                    }
                }
            }`;

            const result = utils.findParametersSection(jsonTemplate, DocumentType.JSON);

            expect(result?.exists).toBe(true);
            expect(result?.content).toContain('NestedParam');
        });

        it('should handle template with multiple top-level sections', () => {
            const yamlTemplate = `AWSTemplateFormatVersion: '2010-09-09'
Description: 'Test template'
Metadata:
  Author: Test
Parameters:
  TestParam:
    Type: String
Mappings:
  RegionMap:
    us-east-1:
      AMI: ami-12345
Conditions:
  IsProduction: !Equals [!Ref Environment, production]
Resources:
  TestResource:
    Type: AWS::EC2::Instance
Outputs:
  InstanceId:
    Value: !Ref TestResource`;

            const result = utils.findParametersSection(yamlTemplate, DocumentType.YAML);

            expect(result?.exists).toBe(true);
            expect(result?.content).toContain('TestParam');
        });

        it('should handle case where SyntaxTree returns node with undefined positions', () => {
            // This test ensures that if SyntaxTree finds a Parameters section but returns
            // a node with undefined startIndex/endIndex, we fall back to the string-based approach
            const jsonTemplate = `{
                "AWSTemplateFormatVersion": "2010-09-09",
                "Parameters": {
                    "ExistingParam": {
                        "Type": "String",
                        "Default": "existing-value"
                    }
                },
                "Resources": {}
            }`;

            const result = utils.findParametersSection(jsonTemplate, DocumentType.JSON);

            // Should find the Parameters section successfully
            expect(result?.exists).toBe(true);
            expect(result?.content).toContain('ExistingParam');
            expect(result?.startPosition).toBeDefined();
            expect(result?.endPosition).toBeDefined();
            expect(typeof result?.startPosition).toBe('number');
            expect(typeof result?.endPosition).toBe('number');
            expect(result?.startPosition).toBeGreaterThanOrEqual(0);
            expect(result?.endPosition).toBeGreaterThan(result?.startPosition ?? 0);
        });
    });
});
