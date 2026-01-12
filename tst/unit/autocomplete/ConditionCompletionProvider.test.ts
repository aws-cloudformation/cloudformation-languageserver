import { SyntaxNode } from 'tree-sitter';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { ConditionCompletionProvider } from '../../../src/autocomplete/ConditionCompletionProvider';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { Context } from '../../../src/context/Context';
import { getEntityMap } from '../../../src/context/SectionContextBuilder';
import { ExtensionName } from '../../../src/utils/ExtensionConfig';
import { createMockSyntaxTreeManager } from '../../utils/MockServerComponents';
import { createMockYamlSyntaxTree } from '../../utils/TestTree';

describe('ConditionCompletionProvider', () => {
    const mockSyntaxTreeManager = createMockSyntaxTreeManager();
    const mockSyntaxTree = createMockYamlSyntaxTree();
    const mockContext: any = {
        text: '',
    };
    const mockParams: CompletionParams = {
        textDocument: { uri: 'file:///test.yaml' },
        position: { line: 10, character: 15 },
    };
    const conditionCompletionProvider = new ConditionCompletionProvider(mockSyntaxTreeManager);

    const mockConditionKeys = [
        'IsProduction',
        'IsDevelopment',
        'IsStaging',
        'ShouldCreateDatabase',
        'ShouldCreateCache',
        'EnableLogging',
        'EnableMonitoring',
        'IsHighAvailability',
        'IsMultiAZ',
        'UseSSL',
        'EnableBackups',
        'IsTestEnvironment',
        'CreateLoadBalancer',
        'EnableAutoScaling',
        'UseSpotInstances',
        'EnableEncryption',
        'IsPublicSubnet',
        'CreateNATGateway',
        'EnableVPCFlowLogs',
        'IsComplianceRequired',
    ];

    vi.mock('../../../src/context/SectionContextBuilder', () => ({
        getEntityMap: vi.fn(),
    }));

    beforeEach(() => {
        vi.clearAllMocks();
    });

    function mockGetEntityMap(result: Map<string, Context> = new Map()) {
        (getEntityMap as any).mockReturnValue(result);
    }

    describe('getCompletions', () => {
        test('should return undefined when syntax tree is not found', () => {
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeUndefined();
        });

        test('should return undefined when no condition section is found in tree', () => {
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(new Map());

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeUndefined();
        });

        test('should return undefined when getEntityMap returns no conditions', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            mockGetEntityMap();

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeUndefined();
            expect(getEntityMap).toHaveBeenCalledOnce();
        });

        test('should return undefined when no condition keys are found', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            mockGetEntityMap(new Map());

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeUndefined();
        });

        test('should return all condition completions when context text is empty', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = '';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result).toHaveLength(20);

            const labels = result!.map((item) => item.label);
            for (const key of mockConditionKeys) {
                expect(labels).toContain(key);
            }

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
                expect(mockConditionKeys).toContain(item.label);
            }
        });

        test('should return filtered condition completions when context text has partial match', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'Is';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);
            expect(result!.length).toBeLessThan(20); // Should be filtered

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('IsProduction');
            expect(labels).toContain('IsDevelopment');
            expect(labels).toContain('IsStaging');
        });

        test('should return filtered condition completions for "Should" prefix', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'Should';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('ShouldCreateDatabase');
            expect(labels).toContain('ShouldCreateCache');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });

        test('should return filtered condition completions for "Enable" prefix', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'Enable';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('EnableLogging');
            expect(labels).toContain('EnableMonitoring');
            expect(labels).toContain('EnableBackups');
            expect(labels).toContain('EnableAutoScaling');
            expect(labels).toContain('EnableEncryption');
            expect(labels).toContain('EnableVPCFlowLogs');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });

        test('should return empty array when no conditions match partial text', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'XYZNonExistent';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result).toHaveLength(0);
        });

        test('should return fuzzy matched results for partial condition names', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'Prod';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('IsProduction');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });

        test('should handle case-insensitive fuzzy matching', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'create';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).toContain('CreateLoadBalancer');
            expect(labels).toContain('CreateNATGateway');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });
        test('should filter out condition logical name of conditon being authored', () => {
            const mockSectionNodeMap = new Map();
            mockSectionNodeMap.set(TopLevelSection.Conditions, {} as SyntaxNode);

            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);
            mockSyntaxTree.findTopLevelSections.returns(mockSectionNodeMap);

            const mockConditionsMap = new Map();
            for (const key of mockConditionKeys) {
                mockConditionsMap.set(key, {} as Context);
            }
            mockGetEntityMap(mockConditionsMap);

            mockContext.text = 'create';
            mockContext.section = TopLevelSection.Conditions;
            mockContext.logicalId = 'CreateLoadBalancer';

            const result = conditionCompletionProvider.getCompletions(mockContext, mockParams);

            expect(result).toBeDefined();
            expect(result!.length).toBeGreaterThan(0);

            const labels = result!.map((item) => item.label);
            expect(labels).not.toContain('CreateLoadBalancer');
            expect(labels).toContain('CreateNATGateway');

            for (const item of result!) {
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });
    });

    describe('getConditionsAsCompletionItems', () => {
        test('should convert condition keys to completion items with correct properties', () => {
            const testKeys = ['TestCondition1', 'TestCondition2', 'TestCondition3'];

            const result = (conditionCompletionProvider as any).getConditionsAsCompletionItems(testKeys);

            expect(result).toHaveLength(3);

            for (const [index, item] of result.entries()) {
                expect(item.label).toBe(testKeys[index]);
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });

        test('should handle empty array of condition keys', () => {
            const result = (conditionCompletionProvider as any).getConditionsAsCompletionItems([]);

            expect(result).toHaveLength(0);
            expect(Array.isArray(result)).toBe(true);
        });

        test('should handle all 20 mock condition keys', () => {
            const result = (conditionCompletionProvider as any).getConditionsAsCompletionItems(mockConditionKeys);

            expect(result).toHaveLength(20);

            for (const [index, item] of result.entries()) {
                expect(item.label).toBe(mockConditionKeys[index]);
                expect(item.kind).toBe(CompletionItemKind.Reference);
                expect(item.detail).toBe(ExtensionName);
            }
        });
    });
});
