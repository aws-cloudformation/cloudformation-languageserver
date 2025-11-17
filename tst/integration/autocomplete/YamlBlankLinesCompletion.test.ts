import { describe, it } from 'vitest';
import { DocumentType } from '../../../src/document/Document';
import { CompletionExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('YAML End of File Properties', () => {
    const content = `Resources:
  TestPolicy:
    Type: AWS::SSM::Parameter
    Properties:
      T`;

    describe('No empty lines start', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Property key Type', async () => {
            const scenario: TemplateScenario = {
                name: 'No empty lines Type property key',
                steps: [
                    {
                        action: 'initialize',
                        content: content,
                        verification: {
                            position: { line: 4, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'Type',
                                    'Tier',
                                    'Tags',
                                    'DataType',
                                    'Description',
                                    'AllowedPattern',
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Property key Value', async () => {
            const scenario: TemplateScenario = {
                name: 'No empty lines Value property key',
                steps: [
                    {
                        action: 'initialize',
                        content: `${content}ype: String\n      V`,
                        verification: {
                            position: { line: 5, character: 7 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Value']).build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });

    describe('Empty lines start', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Property key Type', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty lines Type property key',
                steps: [
                    {
                        action: 'initialize',
                        content: `\n${content}`,
                        verification: {
                            position: { line: 5, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'Type',
                                    'Tier',
                                    'Tags',
                                    'DataType',
                                    'Description',
                                    'AllowedPattern',
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Property key Value', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty lines Value property key',
                steps: [
                    {
                        action: 'initialize',
                        content: `\n${content}ype: String\n      V`,
                        verification: {
                            position: { line: 6, character: 7 },
                            expectation: CompletionExpectationBuilder.create().expectContainsItems(['Value']).build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });

    describe('Blank lines in middle of document', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Blank line after Properties before Tags', async () => {
            const scenario: TemplateScenario = {
                name: 'Blank line after Properties in middle of document',
                steps: [
                    {
                        action: 'initialize',
                        content: `Parameters:
  Type:
    Type: String
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      
      Tags:
        - Key: test
  Parameter:
    Type: AWS::SSM::Parameter
    Properties:
      Type: String
      Value: test`,
                        verification: {
                            position: { line: 7, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'BucketName',
                                    'VersioningConfiguration',
                                    'PublicAccessBlockConfiguration',
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Blank line after Tags array item before next resource', async () => {
            const scenario: TemplateScenario = {
                name: 'Blank line after Tags array item in middle of document',
                steps: [
                    {
                        action: 'initialize',
                        content: `Parameters:
  Type:
    Type: String
Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        - Key: test
      
  Parameter:
    Type: AWS::SSM::Parameter
    Properties:
      Type: String
      Value: test`,
                        verification: {
                            position: { line: 9, character: 6 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'BucketName',
                                    'VersioningConfiguration',
                                    'PublicAccessBlockConfiguration',
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });

    describe('Comments with empty lines', () => {
        const template = new TemplateBuilder(DocumentType.YAML);

        it('Empty line after comment should provide property completions', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty line after comment',
                steps: [
                    {
                        action: 'initialize',
                        content: `Resources:
  TestPolicy:
    Type: AWS::SSM::Parameter
    Properties:
      # This is a comment
      T`,
                        verification: {
                            position: { line: 5, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'Type',
                                    'Tier',
                                    'Tags',
                                    'DataType',
                                    'Description',
                                    'AllowedPattern',
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Empty line after inline comment should provide remaining property completions', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty line after inline comment',
                steps: [
                    {
                        action: 'initialize',
                        content: `Resources:
  TestPolicy:
    Type: AWS::SSM::Parameter
    Properties:
      Type: String # inline comment
      V`,
                        verification: {
                            position: { line: 5, character: 7 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems([
                                    'Value', // This should be the primary completion
                                ])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });

        it('Empty line in array after comment should provide key-value completions', async () => {
            const scenario: TemplateScenario = {
                name: 'Empty line in array after comment',
                steps: [
                    {
                        action: 'initialize',
                        content: `Resources:
  Bucket:
    Type: AWS::S3::Bucket
    Properties:
      Tags:
        # Comment before array item
        - 
          `,
                        verification: {
                            position: { line: 7, character: 10 },
                            expectation: CompletionExpectationBuilder.create()
                                .expectContainsItems(['Key', 'Value'])
                                .build(),
                        },
                    },
                ],
            };
            await template.executeScenario(scenario);
        });
    });
});
