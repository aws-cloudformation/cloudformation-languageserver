import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentType } from '../../../../src/document/Document';
import { AllOccurrencesFinder } from '../../../../src/services/extractToParameter/AllOccurrencesFinder';
import { LiteralValueType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';

describe('AllOccurrencesFinder - YAML', () => {
    let finder: AllOccurrencesFinder;

    beforeEach(() => {
        finder = new AllOccurrencesFinder();
    });

    describe('findAllOccurrences - YAML plain scalars', () => {
        it('should find all plain scalar string occurrences in YAML template', () => {
            // Mock YAML syntax tree with Resources section containing multiple plain_scalar occurrences
            const mockRootNode = {
                type: 'stream',
                children: [
                    {
                        type: 'block_mapping_pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: 'Resources',
                                    type: 'plain_scalar',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 9 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'block_node',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'plain_scalar',
                                            text: 'my-test-bucket',
                                            startPosition: { row: 5, column: 18 },
                                            endPosition: { row: 5, column: 32 },
                                            children: [],
                                        },
                                        {
                                            type: 'plain_scalar',
                                            text: 'my-test-bucket',
                                            startPosition: { row: 9, column: 18 },
                                            endPosition: { row: 9, column: 32 },
                                            children: [],
                                        },
                                        {
                                            type: 'plain_scalar',
                                            text: 'different-bucket',
                                            startPosition: { row: 13, column: 18 },
                                            endPosition: { row: 13, column: 34 },
                                            children: [],
                                        },
                                    ],
                                };
                            }
                            return null;
                        },
                        children: [],
                    },
                ],
            };

            const occurrences = finder.findAllOccurrences(
                mockRootNode as any,
                'my-test-bucket',
                LiteralValueType.STRING,
                DocumentType.YAML,
            );

            expect(occurrences).toHaveLength(2);
            expect(occurrences[0].start.line).toBe(5);
            expect(occurrences[0].start.character).toBe(18);
            expect(occurrences[1].start.line).toBe(9);
            expect(occurrences[1].start.character).toBe(18);
        });

        it('should find all quoted scalar string occurrences in YAML template', () => {
            const mockRootNode = {
                type: 'stream',
                children: [
                    {
                        type: 'block_mapping_pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: 'Resources',
                                    type: 'plain_scalar',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 9 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'block_node',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'double_quote_scalar',
                                            text: '"my-test-bucket"',
                                            startPosition: { row: 5, column: 18 },
                                            endPosition: { row: 5, column: 34 },
                                            children: [],
                                        },
                                        {
                                            type: 'double_quote_scalar',
                                            text: '"my-test-bucket"',
                                            startPosition: { row: 9, column: 18 },
                                            endPosition: { row: 9, column: 34 },
                                            children: [],
                                        },
                                    ],
                                };
                            }
                            return null;
                        },
                        children: [],
                    },
                ],
            };

            const occurrences = finder.findAllOccurrences(
                mockRootNode as any,
                'my-test-bucket',
                LiteralValueType.STRING,
                DocumentType.YAML,
            );

            expect(occurrences).toHaveLength(2);
        });
    });
});
