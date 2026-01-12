import { stubInterface } from 'ts-sinon';
import { describe, it, expect, beforeEach } from 'vitest';
import { TopLevelSection } from '../../../../src/context/CloudFormationEnums';
import { SyntaxTree } from '../../../../src/context/syntaxtree/SyntaxTree';
import { SyntaxTreeManager } from '../../../../src/context/syntaxtree/SyntaxTreeManager';
import { AllOccurrencesFinder } from '../../../../src/services/extractToParameter/AllOccurrencesFinder';
import { LiteralValueType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';

describe('AllOccurrencesFinder - YAML', () => {
    let finder: AllOccurrencesFinder;
    let mockSyntaxTreeManager: ReturnType<typeof stubInterface<SyntaxTreeManager>>;
    let mockSyntaxTree: ReturnType<typeof stubInterface<SyntaxTree>>;

    beforeEach(() => {
        mockSyntaxTreeManager = stubInterface<SyntaxTreeManager>();
        mockSyntaxTree = stubInterface<SyntaxTree>();
        finder = new AllOccurrencesFinder(mockSyntaxTreeManager);
    });

    describe('findAllOccurrences - YAML plain scalars', () => {
        it('should find all plain scalar string occurrences in YAML template', () => {
            // Create mock Resources section with YAML plain scalars
            const mockResourcesSection = {
                type: 'block_mapping',
                children: [
                    {
                        type: 'string_scalar',
                        text: 'my-bucket',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 9 },
                        children: [],
                    },
                    {
                        type: 'string_scalar',
                        text: 'my-bucket',
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 9 },
                        children: [],
                    },
                ],
            };

            // Setup mock to return Resources section
            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);

            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const occurrences = finder.findAllOccurrences('file:///test.yaml', 'my-bucket', LiteralValueType.STRING);

            expect(occurrences).toHaveLength(2);
        });

        it('should find number occurrences in YAML template', () => {
            const mockResourcesSection = {
                type: 'block_mapping',
                children: [
                    {
                        type: 'integer_scalar',
                        text: '80',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 2 },
                        children: [],
                    },
                    {
                        type: 'integer_scalar',
                        text: '80',
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 2 },
                        children: [],
                    },
                ],
            };

            const sectionsMap = new Map();
            sectionsMap.set(TopLevelSection.Resources, mockResourcesSection as any);

            mockSyntaxTree.findTopLevelSections.returns(sectionsMap);
            mockSyntaxTreeManager.getSyntaxTree.returns(mockSyntaxTree);

            const occurrences = finder.findAllOccurrences('file:///test.yaml', 80, LiteralValueType.NUMBER);

            expect(occurrences).toHaveLength(2);
        });
    });
});
