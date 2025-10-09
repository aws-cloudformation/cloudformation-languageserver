import { afterAll, beforeAll, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionList, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import {
    CompletionRouter,
    createCompletionProviders,
    createEntityFieldProviders,
} from '../../../src/autocomplete/CompletionRouter';
import { ContextManager } from '../../../src/context/ContextManager';
import { EntityType } from '../../../src/context/semantic/SemanticTypes';
import { SyntaxTreeManager } from '../../../src/context/syntaxtree/SyntaxTreeManager';
import { DocumentType } from '../../../src/document/Document';
import { CombinedSchemas } from '../../../src/schema/CombinedSchemas';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createResourceContext, createTopLevelContext } from '../../utils/MockContext';
import {
    createMockClientMessage,
    createMockComponents,
    createMockDocumentManager,
    createMockResourceStateManager,
    createMockSettingsManager,
} from '../../utils/MockServerComponents';
import { docPosition, Templates } from '../../utils/TemplateUtils';

/* eslint-disable vitest/expect-expect */
describe('CompletionRouter', () => {
    const mockComponents = createMockComponents();
    const completionRouter = CompletionRouter.create(mockComponents);
    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 0, character: 0 },
    };

    test('should return completion list with fuzzy search results when context exists', () => {
        const mockContext = createTopLevelContext('Unknown', { text: 'Res' });
        mockComponents.contextManager.getContext.returns(mockContext);

        const result = completionRouter.getCompletions(mockParams) as CompletionList | undefined;

        expect(result).toBeDefined();
        expect(result?.isIncomplete).toBe(false);
        expect(result?.items.length).toBeGreaterThan(0);

        const resourcesItem = result?.items.find((item) => item.label === 'Resources');
        expect(resourcesItem).toBeDefined();
        expect(resourcesItem!.kind).toBe(CompletionItemKind.Class);
        expect(resourcesItem!.detail).toBe(ExtensionName);
    });

    test('should return undefined when context is undefined', () => {
        mockComponents.contextManager.getContext.returns(undefined);

        const result = completionRouter.getCompletions(mockParams);

        expect(result).toBeUndefined();
    });

    test('should return top-level sections for document with single character', () => {
        const mockContext = createTopLevelContext('Unknown', { text: 'R' });

        mockComponents.contextManager.getContext.returns(mockContext);

        const result = completionRouter.getCompletions(mockParams) as CompletionList | undefined;

        expect(result).toBeDefined();
        expect(result?.isIncomplete).toBe(false);

        // Filter to get only regular sections (not snippets)
        const regularSections = result!.items.filter((item) => item.kind === CompletionItemKind.Class);

        // Check that we have the expected number of regular sections
        expect(regularSections.length).toBe(5);

        // Verify that Resources is in the results
        const resourcesItem = result?.items.find((item) => item.label === 'Resources');
        expect(resourcesItem).toBeDefined();
    });

    test('should return undefined when no context', () => {
        mockComponents.contextManager.getContext.returns(undefined);

        const result = completionRouter.getCompletions(mockParams);

        expect(result).toBeUndefined();
    });

    test('should return top-level sections when document cannot be retrieved', () => {
        const mockContext = createTopLevelContext('Unknown', { text: '' });

        mockComponents.contextManager.getContext.returns(mockContext);

        const result = completionRouter.getCompletions(mockParams) as CompletionList | undefined;

        expect(result).toBeDefined();
        expect(result?.isIncomplete).toBe(false);

        // Filter to get only regular sections (not snippets)
        const regularSections = result!.items.filter((item) => item.kind === CompletionItemKind.Class);

        // Check that we have the expected number of regular sections
        expect(regularSections.length).toBe(10); // Should suggest all template sections for missing document
    });

    test('should return resource section provider given context entity type of Resource', () => {
        const mockContext = createResourceContext('MyS3', { text: 'Type: ' });
        mockComponents.contextManager.getContext.returns(mockContext);
        const result = completionRouter.getCompletions(mockParams);
        expect(result).toBeDefined();
    });

    test('should return intrinsic functions when triggered with Fn:', () => {
        const mockContext = createTopLevelContext('Resources', { text: 'Fn:', type: DocumentType.YAML });
        mockComponents.contextManager.getContext.returns(mockContext);

        const fnColonParams = {
            ...mockParams,
            context: { triggerCharacter: ':', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const result = completionRouter.getCompletions(fnColonParams) as CompletionList | undefined;

        expect(result).toBeDefined();
        expect(result?.items.length).toBeGreaterThan(0);
        // Check that we have at least one intrinsic function
        const fnBase64 = result?.items.find((item) => item.label === 'Fn::Base64');
        expect(fnBase64).toBeDefined();
    });

    test('should return intrinsic functions when triggered with ! in YAML', () => {
        const mockContext = createTopLevelContext('Resources', { text: '!', type: DocumentType.YAML });
        mockComponents.contextManager.getContext.returns(mockContext);

        const bangParams = {
            ...mockParams,
            context: { triggerCharacter: '!', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const result = completionRouter.getCompletions(bangParams) as CompletionList | undefined;

        expect(result).toBeDefined();
        expect(result?.items.length).toBeGreaterThan(0);
        // Check that we have at least one intrinsic function with ! prefix
        const fnBase64 = result?.items.find((item) => item.label === '!Base64');
        expect(fnBase64).toBeDefined();
    });

    test('should not return intrinsic function completions for complete function name with colon', () => {
        // Create a context where the user has typed "Fn::Sub:" (complete function name)
        const mockContext = createTopLevelContext('Resources', { text: 'Fn::Sub:', type: DocumentType.YAML });

        // Mock the intrinsic context to indicate we're inside an intrinsic function
        const mockIntrinsicContext = {
            inIntrinsic: () => true,
            intrinsicFunction: () => ({
                type: 'Fn::Sub',
                args: 'Fn::Sub:',
            }),
            record: () => ({
                isInsideIntrinsic: true,
                intrinsicFunction: {
                    type: 'Fn::Sub',
                    args: 'Fn::Sub:',
                },
            }),
        };

        // Mock the intrinsicContext getter
        vi.spyOn(mockContext, 'intrinsicContext', 'get').mockReturnValue(mockIntrinsicContext as any);

        mockComponents.contextManager.getContext.returns(mockContext);

        const colonParams = {
            ...mockParams,
            context: { triggerCharacter: ':', triggerKind: CompletionTriggerKind.TriggerCharacter },
        };

        const result = completionRouter.getCompletions(colonParams) as CompletionList | undefined;

        // Should return argument completions since we're inside a Sub function
        expect(result).toBeDefined();
        expect(result?.items.length).toBeGreaterThan(0);
    });

    describe('Reference in template', () => {
        const mockClientMessage = createMockClientMessage();
        const mockDocumentManager = createMockDocumentManager();
        const mockResourceStateManager = createMockResourceStateManager();
        const mockSettingsManager = createMockSettingsManager();

        const syntaxTreeManager = new SyntaxTreeManager(mockClientMessage);
        const contextManager = new ContextManager(syntaxTreeManager);

        const mockTestComponents = createMockComponents({
            syntaxTreeManager,
            documentManager: mockDocumentManager,
            resourceStateManager: mockResourceStateManager,
            schemaRetriever: mockComponents.schemaRetriever,
            settingsManager: mockSettingsManager,
        });
        const completionProviderMap = createCompletionProviders(mockTestComponents);
        const entityFieldProviderMap = createEntityFieldProviders();
        const realCompletionRouter = new CompletionRouter(
            contextManager,
            completionProviderMap,
            mockDocumentManager,
            entityFieldProviderMap,
        );

        function expectCompletionProvider(
            line: number,
            character: number,
            uri: string,
            entityType: EntityType,
            description: string,
        ) {
            const conditionProvider = completionProviderMap.get(entityType);
            const getCompletionsSpy = vi.spyOn(conditionProvider!, 'getCompletions');

            const result = realCompletionRouter.getCompletions(docPosition(uri, line, character));
            expect(result, `Completion result should exist at ${description}`).toBeDefined();
            expect(getCompletionsSpy, `Should invoke ConditionCompletionProvider at ${description}`).toHaveBeenCalled();
            getCompletionsSpy.mockRestore();
        }

        function expectIntrinsicFunctionArgumentCompletionProvider(
            line: number,
            character: number,
            uri: string,
            description: string,
        ) {
            const intrinsicArgumentProvider = completionProviderMap.get('IntrinsicFunctionArgument');
            const getCompletionsSpy = vi.spyOn(intrinsicArgumentProvider!, 'getCompletions');

            const result = realCompletionRouter.getCompletions(docPosition(uri, line, character));
            expect(result, `Completion result should exist at ${description}`).toBeDefined();
            expect(
                getCompletionsSpy,
                `Should invoke IntrinsicFunctionArgumentCompletionProvider at ${description}`,
            ).toHaveBeenCalled();
            getCompletionsSpy.mockRestore();
        }

        describe('Condition Detection Tests', () => {
            const conditionJsonUri = Templates.conditionUsage.json.fileName;
            const conditionJsonContent = Templates.conditionUsage.json.contents;
            const conditionYamlUri = Templates.conditionUsage.yaml.fileName;
            const conditionYamlContent = Templates.conditionUsage.yaml.contents;

            beforeAll(() => {
                syntaxTreeManager.add(conditionJsonUri, conditionJsonContent);
                syntaxTreeManager.add(conditionYamlUri, conditionYamlContent);
                const combinedSchemas = new CombinedSchemas();
                mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            });

            afterAll(() => {
                syntaxTreeManager.deleteAllTrees();
            });

            function expectConditionCompletionProvider(
                line: number,
                character: number,
                uri: string,
                description: string,
            ) {
                expectCompletionProvider(line, character, uri, EntityType.Condition, description);
            }

            function expectNoConditionCompletionProvider(
                line: number,
                character: number,
                uri: string,
                description: string,
            ) {
                const conditionProvider = completionProviderMap.get(EntityType.Condition);
                const getCompletionsSpy = vi.spyOn(conditionProvider!, 'getCompletions');

                realCompletionRouter.getCompletions(docPosition(uri, line, character)) as CompletionList | undefined;

                expect(
                    getCompletionsSpy,
                    `Should NOT invoke ConditionCompletionProvider at ${description}`,
                ).not.toHaveBeenCalled();

                getCompletionsSpy.mockRestore();
            }

            describe('JSON Template Condition Detection', () => {
                const uri = conditionJsonUri;

                test('should invoke ConditionCompletionProvider for Resource Condition attribute', () => {
                    expectConditionCompletionProvider(55, 25, uri, 'JSON Resource Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for Resource UpdatePolicy Condition', () => {
                    expectConditionCompletionProvider(75, 25, uri, 'JSON Resource UpdatePolicy Condition');
                });

                test('should invoke ConditionCompletionProvider for Resource Metadata Condition', () => {
                    expectConditionCompletionProvider(78, 25, uri, 'JSON Resource Metadata Condition');
                });

                test('should invoke ConditionCompletionProvider for Output Condition attribute', () => {
                    expectConditionCompletionProvider(128, 25, uri, 'JSON Output Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for second Output Condition attribute', () => {
                    expectConditionCompletionProvider(135, 30, uri, 'JSON second Output Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for DevelopmentBucket Condition', () => {
                    expectConditionCompletionProvider(84, 25, uri, 'JSON DevelopmentBucket Condition');
                });

                test('should invoke ConditionCompletionProvider for Database Condition', () => {
                    expectConditionCompletionProvider(91, 35, uri, 'JSON Database Condition');
                });

                test('should invoke ConditionCompletionProvider for Fn::If first argument', () => {
                    expectConditionCompletionProvider(59, 15, uri, 'JSON Fn::If first argument');
                });

                test('should invoke ConditionCompletionProvider for second Fn::If first argument', () => {
                    expectConditionCompletionProvider(67, 15, uri, 'JSON second Fn::If first argument');
                });

                test('should invoke ConditionCompletionProvider for nested Fn::If', () => {
                    expectConditionCompletionProvider(106, 20, uri, 'JSON nested Fn::If first argument');
                });

                test('should invoke ConditionCompletionProvider for Tag Value Fn::If', () => {
                    expectConditionCompletionProvider(116, 17, uri, 'JSON Tag Value Fn::If');
                });

                test('should invoke ConditionCompletionProvider for Fn::And with Condition keyword - IsProduction', () => {
                    expectConditionCompletionProvider(
                        36,
                        30,
                        uri,
                        'JSON Fn::And with Condition keyword - IsProduction',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::And with Condition keyword - ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        37,
                        35,
                        uri,
                        'JSON Fn::And with Condition keyword - ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::Or with Condition keyword - IsDevelopment', () => {
                    expectConditionCompletionProvider(
                        42,
                        30,
                        uri,
                        'JSON Fn::Or with Condition keyword - IsDevelopment',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::Or with Condition keyword - ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        43,
                        35,
                        uri,
                        'JSON Fn::Or with Condition keyword - ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::Not with Condition keyword', () => {
                    expectConditionCompletionProvider(48, 30, uri, 'JSON Fn::Not with Condition keyword');
                });
            });

            describe('YAML Template Condition Detection', () => {
                const uri = conditionYamlUri;

                test('should invoke ConditionCompletionProvider for ProductionBucket Condition attribute', () => {
                    expectConditionCompletionProvider(53, 25, uri, 'YAML ProductionBucket Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for DevelopmentBucket Condition attribute', () => {
                    expectConditionCompletionProvider(86, 25, uri, 'YAML DevelopmentBucket Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for Database Condition attribute', () => {
                    expectConditionCompletionProvider(92, 30, uri, 'YAML Database Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for ProductionSecurityGroup Condition attribute', () => {
                    expectConditionCompletionProvider(134, 25, uri, 'YAML ProductionSecurityGroup Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for DevSecurityGroup Condition attribute', () => {
                    expectConditionCompletionProvider(140, 25, uri, 'YAML DevSecurityGroup Condition attribute');
                });

                test('should invoke ConditionCompletionProvider for Resource UpdatePolicy Condition', () => {
                    expectConditionCompletionProvider(78, 25, uri, 'YAML Resource UpdatePolicy Condition');
                });

                test('should invoke ConditionCompletionProvider for Resource Metadata Condition', () => {
                    expectConditionCompletionProvider(81, 25, uri, 'YAML Resource Metadata Condition');
                });

                test('should invoke ConditionCompletionProvider for ProductionBucketName Output Condition', () => {
                    expectConditionCompletionProvider(198, 25, uri, 'YAML ProductionBucketName Output Condition');
                });

                test('should invoke ConditionCompletionProvider for DatabaseEndpoint Output Condition', () => {
                    expectConditionCompletionProvider(203, 30, uri, 'YAML DatabaseEndpoint Output Condition');
                });

                test('should invoke ConditionCompletionProvider for LogicalConditionalOutput Condition', () => {
                    expectConditionCompletionProvider(231, 25, uri, 'YAML LogicalConditionalOutput Condition');
                });

                test('should invoke ConditionCompletionProvider for short-form !If single line', () => {
                    expectConditionCompletionProvider(56, 30, uri, 'YAML short-form !If single line');
                });

                test('should invoke ConditionCompletionProvider for full-form Fn::If single line', () => {
                    expectConditionCompletionProvider(61, 25, uri, 'YAML full-form Fn::If single line');
                });

                test('should invoke ConditionCompletionProvider for short-form !If multi-line', () => {
                    expectConditionCompletionProvider(66, 15, uri, 'YAML short-form !If multi-line');
                });

                test('should invoke ConditionCompletionProvider for full-form Fn::If multi-line', () => {
                    expectConditionCompletionProvider(73, 15, uri, 'YAML full-form Fn::If multi-line');
                });

                test('should invoke ConditionCompletionProvider for InstanceType !If', () => {
                    expectConditionCompletionProvider(106, 30, uri, 'YAML InstanceType !If');
                });

                test('should invoke ConditionCompletionProvider for SecurityGroups Fn::If', () => {
                    expectConditionCompletionProvider(111, 15, uri, 'YAML SecurityGroups Fn::If');
                });

                test('should invoke ConditionCompletionProvider for Tag Value !If', () => {
                    expectConditionCompletionProvider(118, 25, uri, 'YAML Tag Value !If');
                });

                test('should invoke ConditionCompletionProvider for Tag Value Fn::If', () => {
                    expectConditionCompletionProvider(123, 25, uri, 'YAML Tag Value Fn::If');
                });

                test('should invoke ConditionCompletionProvider for ComplexTag !If', () => {
                    expectConditionCompletionProvider(128, 15, uri, 'YAML ComplexTag !If');
                });

                test('should invoke ConditionCompletionProvider for NestedConditionResource Fn::If', () => {
                    expectConditionCompletionProvider(150, 15, uri, 'YAML NestedConditionResource Fn::If');
                });

                test('should invoke ConditionCompletionProvider for BucketArn !If', () => {
                    expectConditionCompletionProvider(162, 20, uri, 'YAML BucketArn !If');
                });

                test('should invoke ConditionCompletionProvider for AlarmName !If with Fn::And', () => {
                    expectConditionCompletionProvider(172, 25, uri, 'YAML AlarmName !If with Fn::And');
                });

                test('should invoke ConditionCompletionProvider for AlarmName Condition in Fn::And', () => {
                    expectConditionCompletionProvider(173, 30, uri, 'YAML AlarmName Condition in Fn::And');
                });

                test('should invoke ConditionCompletionProvider for Threshold !If with Fn::Or', () => {
                    expectConditionCompletionProvider(184, 25, uri, 'YAML Threshold !If with Fn::Or');
                });

                test('should invoke ConditionCompletionProvider for Threshold !Condition in Fn::Or', () => {
                    expectConditionCompletionProvider(185, 30, uri, 'YAML Threshold !Condition in Fn::Or');
                });

                test('should invoke ConditionCompletionProvider for TreatMissingData !If with Fn::Not', () => {
                    expectConditionCompletionProvider(192, 25, uri, 'YAML TreatMissingData !If with Fn::Not');
                });

                test('should invoke ConditionCompletionProvider for FullFormConditionalOutput Fn::If', () => {
                    expectConditionCompletionProvider(217, 15, uri, 'YAML FullFormConditionalOutput Fn::If');
                });

                test('should invoke ConditionCompletionProvider for MultiLineConditionalOutput !If', () => {
                    expectConditionCompletionProvider(225, 15, uri, 'YAML MultiLineConditionalOutput !If');
                });

                test('should invoke ConditionCompletionProvider for Complex Prod !If', () => {
                    expectConditionCompletionProvider(226, 25, uri, 'YAML Complex Prod !If');
                });

                test('should invoke ConditionCompletionProvider for LogicalConditionalOutput !Condition IsDevelopment', () => {
                    expectConditionCompletionProvider(
                        236,
                        25,
                        uri,
                        'YAML LogicalConditionalOutput !Condition IsDevelopment',
                    );
                });

                test('should invoke ConditionCompletionProvider for LogicalConditionalOutput Condition ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        237,
                        35,
                        uri,
                        'YAML LogicalConditionalOutput Condition ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for nested Fn::Or Condition IsProduction', () => {
                    expectConditionCompletionProvider(241, 30, uri, 'YAML nested Fn::Or Condition IsProduction');
                });

                test('should invoke ConditionCompletionProvider for nested Fn::Or !Condition ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        242,
                        35,
                        uri,
                        'YAML nested Fn::Or !Condition ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for EdgeCaseOutput Fn::And Condition IsProduction', () => {
                    expectConditionCompletionProvider(
                        252,
                        30,
                        uri,
                        'YAML EdgeCaseOutput Fn::And Condition IsProduction',
                    );
                });

                test('should invoke ConditionCompletionProvider for EdgeCaseOutput Fn::And !Condition ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        253,
                        35,
                        uri,
                        'YAML EdgeCaseOutput Fn::And !Condition ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::And with Condition keyword - IsProduction', () => {
                    expectConditionCompletionProvider(
                        29,
                        30,
                        uri,
                        'YAML Fn::And with Condition keyword - IsProduction',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::And with Condition keyword - ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        30,
                        35,
                        uri,
                        'YAML Fn::And with Condition keyword - ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for !Or with Condition keyword - IsDevelopment', () => {
                    expectConditionCompletionProvider(34, 30, uri, 'YAML !Or with Condition keyword - IsDevelopment');
                });

                test('should invoke ConditionCompletionProvider for !Or with Condition keyword - ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        35,
                        35,
                        uri,
                        'YAML !Or with Condition keyword - ShouldCreateDatabase',
                    );
                });

                test('should invoke ConditionCompletionProvider for Fn::Not with !Condition', () => {
                    expectConditionCompletionProvider(40, 25, uri, 'YAML Fn::Not with !Condition');
                });

                test('should invoke ConditionCompletionProvider for ComplexCondition Fn::Or !Condition IsProduction', () => {
                    expectConditionCompletionProvider(
                        46,
                        25,
                        uri,
                        'YAML ComplexCondition Fn::Or !Condition IsProduction',
                    );
                });

                test('should invoke ConditionCompletionProvider for ComplexCondition Fn::Or Condition IsDevelopment', () => {
                    expectConditionCompletionProvider(
                        47,
                        30,
                        uri,
                        'YAML ComplexCondition Fn::Or Condition IsDevelopment',
                    );
                });

                test('should invoke ConditionCompletionProvider for ComplexCondition !Not !Condition ShouldCreateDatabase', () => {
                    expectConditionCompletionProvider(
                        48,
                        35,
                        uri,
                        'YAML ComplexCondition !Not !Condition ShouldCreateDatabase',
                    );
                });
            });

            describe('Edge Cases and Negative Tests', () => {
                test('should NOT invoke ConditionCompletionProvider for resource types', () => {
                    // JSON: Line 36: "Type": "AWS::S3::Bucket",
                    expectNoConditionCompletionProvider(36, 20, conditionJsonUri, 'JSON resource type');
                });

                test('should NOT invoke ConditionCompletionProvider for property values', () => {
                    // YAML: Line 71: BucketName: my-dev-bucket
                    expectNoConditionCompletionProvider(71, 20, conditionYamlUri, 'YAML property value');
                });

                test('should NOT invoke ConditionCompletionProvider at template root level', () => {
                    // Test at template root level
                    expectNoConditionCompletionProvider(1, 0, conditionYamlUri, 'YAML template root');
                });

                test('should NOT invoke ConditionCompletionProvider for parameter values', () => {
                    // JSON: Line 11: "Default": "dev",
                    expectNoConditionCompletionProvider(11, 20, conditionJsonUri, 'JSON parameter default value');
                });

                test('should NOT invoke ConditionCompletionProvider for resource property names', () => {
                    // YAML: Line 44: BucketName: (property name)
                    expectNoConditionCompletionProvider(44, 10, conditionYamlUri, 'YAML property name');
                });
            });
        });

        describe('GetAtt Detection Tests', () => {
            const getAttJsonUri = Templates.comprehensive.json.fileName;
            const getAttJsonContent = Templates.comprehensive.json.contents;

            beforeAll(() => {
                syntaxTreeManager.add(getAttJsonUri, getAttJsonContent);
                const combinedSchemas = new CombinedSchemas();
                mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            });

            afterAll(() => {
                syntaxTreeManager.deleteAllTrees();
            });

            function expectIntrinsicFunctionArgumentCompletionProvider(
                line: number,
                character: number,
                uri: string,
                description: string,
            ) {
                const intrinsicArgumentProvider = completionProviderMap.get('IntrinsicFunctionArgument');
                const getCompletionsSpy = vi.spyOn(intrinsicArgumentProvider!, 'getCompletions');

                const result = realCompletionRouter.getCompletions(docPosition(uri, line, character));
                expect(result, `Completion result should exist at ${description}`).toBeDefined();
                expect(
                    getCompletionsSpy,
                    `Should invoke IntrinsicFunctionArgumentCompletionProvider at ${description}`,
                ).toHaveBeenCalled();
                getCompletionsSpy.mockRestore();
            }

            test('should invoke IntrinsicFunctionArgumentCompletionProvider for LaunchTemplate GetAtt', () => {
                expectIntrinsicFunctionArgumentCompletionProvider(573, 15, getAttJsonUri, 'JSON LaunchTemplate GetAtt');
            });

            test('should invoke IntrinsicFunctionArgumentCompletionProvider for LambdaRole GetAtt', () => {
                expectIntrinsicFunctionArgumentCompletionProvider(741, 15, getAttJsonUri, 'JSON LambdaRole GetAtt');
            });

            test('should invoke IntrinsicFunctionArgumentCompletionProvider for Database GetAtt in Lambda Environment', () => {
                expectIntrinsicFunctionArgumentCompletionProvider(
                    757,
                    20,
                    getAttJsonUri,
                    'JSON Database GetAtt in Lambda Environment',
                );
            });
        });

        describe('Parameter Detection Tests', () => {
            const parameterJsonUri = Templates.parameterUsage.json.fileName;
            const parameterJsonContent = Templates.parameterUsage.json.contents;
            const parameterYamlUri = Templates.parameterUsage.yaml.fileName;
            const parameterYamlContent = Templates.parameterUsage.yaml.contents;

            beforeAll(() => {
                syntaxTreeManager.add(parameterJsonUri, parameterJsonContent);
                syntaxTreeManager.add(parameterYamlUri, parameterYamlContent);
                const combinedSchemas = new CombinedSchemas();
                mockComponents.schemaRetriever.getDefault.returns(combinedSchemas);
            });

            afterAll(() => {
                syntaxTreeManager.deleteAllTrees();
            });

            function expectParameterCompletionProvider(
                line: number,
                character: number,
                uri: string,
                description: string,
            ) {
                expectIntrinsicFunctionArgumentCompletionProvider(line, character, uri, description);
            }

            describe('JSON Template Parameter Detection', () => {
                const uri = parameterJsonUri;

                test('should invoke ParameterCompletionProvider for Ref in Conditions in JSON', () => {
                    expectParameterCompletionProvider(21, 33, uri, 'JSON Ref in Conditions');
                });

                test('should invoke ParameterCompletionProvider for Fn::Sub Conditions in JSON', () => {
                    expectParameterCompletionProvider(24, 45, uri, 'JSON Fn::Sub in Conditions');
                });

                test('should invoke ParameterCompletionProvider for Ref in Resources in JSON', () => {
                    expectParameterCompletionProvider(33, 14, uri, 'JSON Ref in Resources');
                });

                test('should invoke ParameterCompletionProvider for Fn::Sub in Resource in JSON', () => {
                    expectParameterCompletionProvider(57, 40, uri, 'JSON Fn::Sub in Resource');
                });

                test('should invoke ParameterCompletionProvider for Ref in Outputs in JSON', () => {
                    expectParameterCompletionProvider(73, 17, uri, 'JSON Ref in Outputs');
                });

                test('should invoke ParameterCompletionProvider for nested Ref in JSON', () => {
                    expectParameterCompletionProvider(49, 37, uri, 'JSON nested Ref');
                });

                test('should invoke ParameterCompletionProvider for PseudoParam in Ref in JSON', () => {
                    expectParameterCompletionProvider(41, 49, uri, 'JSON PseudoParam Ref');
                });

                test('should invoke ParameterCompletionProvider for PseudoParam for Fn::Sub in JSON', () => {
                    expectParameterCompletionProvider(65, 40, uri, 'JSON PseudoParam Fn::Sub');
                });
            });

            describe('YAML Template Parameter Detection', () => {
                const uri = parameterYamlUri;

                test('should invoke ParameterCompletionProvider for Ref in Conditions in Yaml', () => {
                    expectParameterCompletionProvider(19, 35, uri, 'Yaml Ref in Conditions');
                });

                test('should invoke ParameterCompletionProvider for Fn::Sub in Conditions in Yaml', () => {
                    expectParameterCompletionProvider(20, 35, uri, 'Yaml Fn::Sub in Conditions');
                });

                test('should invoke ParameterCompletionProvider for Ref in Resources in Yaml', () => {
                    expectParameterCompletionProvider(28, 30, uri, 'Yaml Ref in Resources');
                });

                test('should invoke ParameterCompletionProvider for Fn::Sub in Resources in Yaml', () => {
                    expectParameterCompletionProvider(52, 40, uri, 'Yaml Fn::Sub in Resources');
                });

                test('should invoke ParameterCompletionProvider for Ref in Outputs in Yaml', () => {
                    expectParameterCompletionProvider(68, 20, uri, 'Yaml Ref in Outputs');
                });

                test('should invoke ParameterCompletionProvider for full-form Ref in in Yaml', () => {
                    expectParameterCompletionProvider(35, 20, uri, 'Yaml full-form Ref');
                });

                test('should invoke ParameterCompletionProvider for full-form Fn::Sub in in Yaml', () => {
                    expectParameterCompletionProvider(58, 35, uri, 'Yaml full-form Fn::Sub');
                });

                test('should invoke ParameterCompletionProvider for nested Ref in Yaml', () => {
                    expectParameterCompletionProvider(47, 40, uri, 'Yaml nested Ref');
                });

                test('should invoke ParameterCompletionProvider for PseudoParam in Ref in Yaml', () => {
                    expectParameterCompletionProvider(41, 45, uri, 'Yaml PseudoParam Ref');
                });

                test('should invoke ParameterCompletionProvider for PseudoParam in Fn::Sub in Yaml', () => {
                    expectParameterCompletionProvider(63, 40, uri, 'Yaml PseudoParam Ref');
                });
            });
        });
    });
});
