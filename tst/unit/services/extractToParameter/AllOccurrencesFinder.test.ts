import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach } from 'vitest';
import { TopLevelSection } from '../../../../src/context/ContextType';
import { SyntaxTree } from '../../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { AllOccurrencesFinder } from '../../../../src/services/extractToParameter/AllOccurrencesFinder';
import { LiteralValueType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';

describe('AllOccurrencesFinder', () => {
    let finder: AllOccurrencesFinder;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;
    let mockSyntaxTree: ReturnType<typeof stubInterface<SyntaxTree>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        mockSyntaxTree = stubInterface<SyntaxTree>();
        finder = new AllOccurrencesFinder(mockSyntaxTreeManager);
    });

    describe('findAllOccurrences', () => {
        it('should find all string occurrences in template', () => {
            // Create mock Resources section with string literals
            const mockResourcesSection = {
                type: 'object',
                children: [
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 11 },
                        children: [],
                    },
                    {
                        type: 'string',
                        text: '"my-bucket"',
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 11 },
                        children: [],
                    },
                    {
                        type: 'string',
                        text: '"different-bucket"',
                        startPosition: { row: 2, column: 0 },
                        endPosition: { row: 2, column: 18 },
                        children: [],
                    },
                ],
            };

            // Setup mock to return Resources section
            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);

            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const occurrences = finder.findAllOccurrences('file:///test.json', 'my-bucket', LiteralValueType.STRING);

            expect(occurrences).toHaveLength(2);
        });

        it('should return empty array when SyntaxTree not found', () => {
            mockSyntaxTreeManager.getSyntaxTree.returns(undefined);

            const occurrences = finder.findAllOccurrences('file:///test.json', 'my-bucket', LiteralValueType.STRING);

            expect(occurrences).toHaveLength(0);
        });

        it('should return empty array when no Resources or Outputs sections found', () => {
            const emptySectionsMap = new Map();
            mockSyntaxTree.findTopLevelSections.returns(emptySectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const occurrences = finder.findAllOccurrences('file:///test.json', 'my-bucket', LiteralValueType.STRING);

            expect(occurrences).toHaveLength(0);
        });

        it('should find occurrences in both Resources and Outputs sections', () => {
            const mockResourcesSection = {
                type: 'object',
                children: [
                    {
                        type: 'string',
                        text: '"shared-value"',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 14 },
                        children: [],
                    },
                ],
            };

            const mockOutputsSection = {
                type: 'object',
                children: [
                    {
                        type: 'string',
                        text: '"shared-value"',
                        startPosition: { row: 5, column: 0 },
                        endPosition: { row: 5, column: 14 },
                        children: [],
                    },
                ],
            };

            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);
            sectionsMap.set(TopLevelSection.Outputs, mockOutputsSection as any);

            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const occurrences = finder.findAllOccurrences('file:///test.json', 'shared-value', LiteralValueType.STRING);

            expect(occurrences).toHaveLength(2);
        });
    });
});
