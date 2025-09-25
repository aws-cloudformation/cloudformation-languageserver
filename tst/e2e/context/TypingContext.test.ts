import { describe, it } from 'vitest';
import { TopLevelSection } from '../../../src/context/ContextType';
import { EntityType } from '../../../src/context/semantic/SemanticTypes';
import { DocumentType } from '../../../src/document/Document';
import { ContextExpectationBuilder, TemplateBuilder, TemplateScenario } from '../../utils/TemplateBuilder';

describe('Typing Context', () => {
    describe('YAML', () => {
        it('Create partial template', () => {
            const template = new TemplateBuilder(DocumentType.YAML);
            const scenario: TemplateScenario = {
                name: 'Simple Template',
                steps: [
                    {
                        action: 'type',
                        content: 'AWSTemplateFormatVersion: "2010-09-09"',
                        position: { line: 0, character: 0 },
                        verification: {
                            position: { line: 0, character: 30 },
                            expectation: ContextExpectationBuilder.topLevel(
                                '2010-09-09',
                                TopLevelSection.AWSTemplateFormatVersion,
                            )
                                .setTopLevel(true)
                                .setPropertyPath([TopLevelSection.AWSTemplateFormatVersion])
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '\nResources:',
                        position: { line: 0, character: 38 },
                        verification: {
                            position: { line: 1, character: 5 },
                            expectation: ContextExpectationBuilder.topLevel('Resources', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources])
                                .setTopLevel(true)
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '\n  MyBucket:',
                        position: { line: 1, character: 10 },
                        verification: {
                            position: { line: 2, character: 4 },
                            expectation: ContextExpectationBuilder.topLevel('MyBucket', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '\n    Type:',
                        position: { line: 2, character: 11 },
                        verification: {
                            position: { line: 3, character: 8 },
                            expectation: ContextExpectationBuilder.topLevel('Type', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket', 'Type'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: ' AWS::S3::Bucket',
                        position: { line: 3, character: 11 },
                        verification: {
                            position: { line: 3, character: 14 },
                            expectation: ContextExpectationBuilder.topLevel(
                                'AWS::S3::Bucket',
                                TopLevelSection.Resources,
                            )
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket', 'Type'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .withEntity(EntityType.Resource, {
                                    Type: 'AWS::S3::Bucket',
                                })
                                .build(),
                        },
                    },
                    {
                        action: 'type',
                        content: '\n    ',
                        position: { line: 3, character: 25 },
                    },
                    {
                        action: 'type',
                        content: 'Prop',
                        position: { line: 4, character: 4 },
                        verification: {
                            position: { line: 4, character: 8 },
                            expectation: ContextExpectationBuilder.topLevel('Prop', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .withEntity(EntityType.Resource, {
                                    Type: 'AWS::S3::Bucket',
                                })
                                .build(),
                        },
                    },
                ],
            };

            template.executeScenario(scenario);
        });
    });

    describe('JSON', () => {
        it('Create partial template', () => {
            const template = new TemplateBuilder(DocumentType.JSON, '{}');
            const scenario: TemplateScenario = {
                name: 'Simple JSON Template',
                steps: [
                    {
                        action: 'replace',
                        range: { start: { line: 0, character: 1 }, end: { line: 0, character: 1 } },
                        content: '\n  "AWSTemplateFormatVersion": "2010-09-09"\n',
                        verification: {
                            position: { line: 1, character: 30 },
                            expectation: ContextExpectationBuilder.topLevel(
                                '2010-09-09',
                                TopLevelSection.AWSTemplateFormatVersion,
                            )
                                .setTopLevel(true)
                                .setPropertyPath([TopLevelSection.AWSTemplateFormatVersion])
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 1, character: 43 }, end: { line: 1, character: 43 } },
                        content: ',\n  "Resources": {}',
                        verification: {
                            position: { line: 2, character: 5 },
                            expectation: ContextExpectationBuilder.topLevel('Resources', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources])
                                .setTopLevel(true)
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 2, character: 15 }, end: { line: 2, character: 17 } },
                        content: '{\n    "MyBucket": {}\n  }',
                        verification: {
                            position: { line: 3, character: 6 },
                            expectation: ContextExpectationBuilder.topLevel('MyBucket', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 3, character: 16 }, end: { line: 3, character: 18 } },
                        content: '{\n      "Type": \n    }',
                        verification: {
                            position: { line: 4, character: 8 },
                            expectation: ContextExpectationBuilder.topLevel('Type', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket', 'Type'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 4, character: 14 }, end: { line: 4, character: 14 } },
                        content: '"AWS::S3::Bucket"',
                        verification: {
                            position: { line: 4, character: 16 },
                            expectation: ContextExpectationBuilder.topLevel(
                                'AWS::S3::Bucket',
                                TopLevelSection.Resources,
                            )
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket', 'Type'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .withEntity(EntityType.Resource, {
                                    Type: 'AWS::S3::Bucket',
                                })
                                .build(),
                        },
                    },
                    {
                        action: 'replace',
                        range: { start: { line: 4, character: 31 }, end: { line: 4, character: 31 } },
                        content: ',\n      "Prop',
                        verification: {
                            position: { line: 5, character: 10 },
                            expectation: ContextExpectationBuilder.topLevel('Prop', TopLevelSection.Resources)
                                .setPropertyPath([TopLevelSection.Resources, 'MyBucket'])
                                .setTopLevel(false)
                                .setLogicalId('MyBucket')
                                .withEntity(EntityType.Resource, {
                                    Type: 'AWS::S3::Bucket',
                                })
                                .build(),
                        },
                    },
                ],
            };

            template.executeScenario(scenario);
        });
    });
});
