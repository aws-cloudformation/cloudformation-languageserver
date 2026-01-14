import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DefinitionParams, Location } from 'vscode-languageserver';
import { TopLevelSection } from '../../../src/context/CloudFormationEnums';
import { DefinitionProvider } from '../../../src/definition/DefinitionProvider';
import { createResourceContext } from '../../utils/MockContext';
import { createMockComponents } from '../../utils/MockServerComponents';

describe('DefinitionProvider', () => {
    let mockComponents: ReturnType<typeof createMockComponents>;
    let definitionProvider: DefinitionProvider;
    let params: DefinitionParams;

    beforeEach(() => {
        vi.clearAllMocks();
        mockComponents = createMockComponents();
        definitionProvider = new DefinitionProvider(mockComponents.core.contextManager);
        params = {
            textDocument: { uri: 'file:///test.yaml' },
            position: { line: 0, character: 0 },
        };
    });

    describe('getDefinitions', () => {
        it('should return undefined when no context is found', () => {
            mockComponents.contextManager.getContextAndRelatedEntities.returns(undefined);

            const result = definitionProvider.getDefinitions(params);

            expect(result).toBeUndefined();
            expect(mockComponents.contextManager.getContextAndRelatedEntities.calledWith(params)).toBe(true);
        });

        it('should return undefined when no related entities are found', () => {
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' });

            mockComponents.contextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = definitionProvider.getDefinitions(params);

            expect(result).toBeUndefined();
        });

        it('should return a single Location when one related entity is found', () => {
            const mockRelatedContext = {
                startPosition: { row: 5, column: 10 },
                endPosition: { row: 5, column: 20 },
            };
            const mockSection = new Map();
            mockSection.set('MyResource', mockRelatedContext);
            const relatedEntities = new Map([[TopLevelSection.Parameters, mockSection]]);
            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockComponents.contextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = definitionProvider.getDefinitions(params);

            expect(result).toEqual(
                Location.create(params.textDocument.uri, {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                }),
            );
        });

        it('should handle GetAtt expressions by extracting resource name', () => {
            const mockRelatedContext = {
                startPosition: { row: 2, column: 5 },
                endPosition: { row: 2, column: 15 },
            };
            const mockSection = new Map();
            mockSection.set('MyVpc', mockRelatedContext);
            const relatedEntities = new Map([[TopLevelSection.Resources, mockSection]]);
            // Context text contains the full GetAtt expression "MyVpc.VpcId"
            const mockContext = createResourceContext('MySubnet', { text: 'MyVpc.VpcId' }, relatedEntities);

            mockComponents.contextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = definitionProvider.getDefinitions(params);

            expect(result).toEqual(
                Location.create(params.textDocument.uri, {
                    start: { line: 2, character: 5 },
                    end: { line: 2, character: 15 },
                }),
            );
        });

        it('should return multiple Locations when multiple related entities are found', () => {
            const logicalId = 'MyResource';
            const mockRelatedContext1 = {
                startPosition: { row: 5, column: 10 },
                endPosition: { row: 5, column: 20 },
            };
            const mockRelatedContext2 = {
                startPosition: { row: 10, column: 15 },
                endPosition: { row: 10, column: 25 },
            };
            const mockSection1 = new Map();
            mockSection1.set(logicalId, mockRelatedContext1);
            const mockSection2 = new Map();
            mockSection2.set(logicalId, mockRelatedContext2);

            const relatedEntities = new Map([
                [TopLevelSection.Parameters, mockSection1],
                [TopLevelSection.Conditions, mockSection2],
            ]);

            const mockContext = createResourceContext('MyResourceId', { text: 'MyResource' }, relatedEntities);

            mockComponents.contextManager.getContextAndRelatedEntities.returns(mockContext);

            const result = definitionProvider.getDefinitions(params) as Location[];

            expect(Array.isArray(result)).toBe(true);
            expect(result.length).toBe(2);
            expect(result).toEqual([
                Location.create(params.textDocument.uri, {
                    start: { line: 5, character: 10 },
                    end: { line: 5, character: 20 },
                }),
                Location.create(params.textDocument.uri, {
                    start: { line: 10, character: 15 },
                    end: { line: 10, character: 25 },
                }),
            ]);
        });
    });
});
