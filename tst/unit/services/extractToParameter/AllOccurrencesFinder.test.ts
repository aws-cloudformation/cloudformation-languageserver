import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentType } from '../../../../src/document/Document';
import { AllOccurrencesFinder } from '../../../../src/services/extractToParameter/AllOccurrencesFinder';
import { LiteralValueType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';

describe('AllOccurrencesFinder', () => {
    let finder: AllOccurrencesFinder;

    beforeEach(() => {
        finder = new AllOccurrencesFinder();
    });

    describe('findAllOccurrences', () => {
        it('should find all string occurrences in template', () => {
            // Mock syntax tree with Resources section containing multiple string occurrences
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: '"Resources"',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'object',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
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
                            }
                            return null;
                        },
                        children: [],
                    },
                ],
            };

            const occurrences = finder.findAllOccurrences(
                mockRootNode as any,
                'my-bucket',
                LiteralValueType.STRING,
                DocumentType.JSON,
            );

            expect(occurrences).toHaveLength(2);
            expect(occurrences[0].start.line).toBe(0);
            expect(occurrences[1].start.line).toBe(1);
        });

        it('should find all number occurrences in template', () => {
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: '"Resources"',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'object',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'number',
                                            text: '1',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 1 },
                                            children: [],
                                        },
                                        {
                                            type: 'number',
                                            text: '1',
                                            startPosition: { row: 1, column: 0 },
                                            endPosition: { row: 1, column: 1 },
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
                1,
                LiteralValueType.NUMBER,
                DocumentType.JSON,
            );

            expect(occurrences).toHaveLength(2);
        });

        it('should find all boolean occurrences in template', () => {
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: '"Outputs"',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'object',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'true',
                                            text: 'true',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 4 },
                                            children: [],
                                        },
                                        {
                                            type: 'true',
                                            text: 'true',
                                            startPosition: { row: 1, column: 0 },
                                            endPosition: { row: 1, column: 4 },
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
                true,
                LiteralValueType.BOOLEAN,
                DocumentType.JSON,
            );

            expect(occurrences).toHaveLength(2);
        });

        it('should not find intrinsic function references', () => {
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: '"Resources"',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'object',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'string',
                                            text: '"my-bucket"',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 11 },
                                            children: [],
                                        },
                                        {
                                            type: 'object',
                                            text: '{"Ref": "BucketNameParam"}',
                                            startPosition: { row: 1, column: 0 },
                                            endPosition: { row: 1, column: 26 },
                                            children: [
                                                {
                                                    type: 'pair',
                                                    startPosition: { row: 1, column: 1 },
                                                    endPosition: { row: 1, column: 25 },
                                                    children: [
                                                        {
                                                            type: 'string',
                                                            text: '"Ref"',
                                                            startPosition: { row: 1, column: 1 },
                                                            endPosition: { row: 1, column: 6 },
                                                            children: [],
                                                        },
                                                        {
                                                            type: 'string',
                                                            text: '"BucketNameParam"',
                                                            startPosition: { row: 1, column: 8 },
                                                            endPosition: { row: 1, column: 25 },
                                                            children: [],
                                                        },
                                                    ],
                                                },
                                            ],
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
                'my-bucket',
                LiteralValueType.STRING,
                DocumentType.JSON,
            );

            // Should only find the literal occurrence, not the Ref
            expect(occurrences).toHaveLength(1);
        });

        it('should handle empty results when no matches found', () => {
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'string',
                        text: '"different-bucket"',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 18 },
                        children: [],
                    },
                ],
            };

            const occurrences = finder.findAllOccurrences(
                mockRootNode as any,
                'my-bucket',
                LiteralValueType.STRING,
                DocumentType.JSON,
            );

            expect(occurrences).toHaveLength(0);
        });

        it('should handle array values', () => {
            const mockRootNode = {
                type: 'document',
                children: [
                    {
                        type: 'pair',
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        childForFieldName: (field: string) => {
                            if (field === 'key') {
                                return {
                                    text: '"Resources"',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                };
                            }
                            if (field === 'value') {
                                return {
                                    type: 'object',
                                    startPosition: { row: 0, column: 0 },
                                    endPosition: { row: 0, column: 0 },
                                    children: [
                                        {
                                            type: 'array',
                                            text: '[80, 443]',
                                            startPosition: { row: 0, column: 0 },
                                            endPosition: { row: 0, column: 9 },
                                            children: [
                                                {
                                                    type: 'number',
                                                    text: '80',
                                                    startPosition: { row: 0, column: 1 },
                                                    endPosition: { row: 0, column: 3 },
                                                    children: [],
                                                },
                                                {
                                                    type: 'number',
                                                    text: '443',
                                                    startPosition: { row: 0, column: 5 },
                                                    endPosition: { row: 0, column: 8 },
                                                    children: [],
                                                },
                                            ],
                                        },
                                        {
                                            type: 'array',
                                            text: '[80, 443]',
                                            startPosition: { row: 1, column: 0 },
                                            endPosition: { row: 1, column: 9 },
                                            children: [
                                                {
                                                    type: 'number',
                                                    text: '80',
                                                    startPosition: { row: 1, column: 1 },
                                                    endPosition: { row: 1, column: 3 },
                                                    children: [],
                                                },
                                                {
                                                    type: 'number',
                                                    text: '443',
                                                    startPosition: { row: 1, column: 5 },
                                                    endPosition: { row: 1, column: 8 },
                                                    children: [],
                                                },
                                            ],
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
                [80, 443],
                LiteralValueType.ARRAY,
                DocumentType.JSON,
            );

            expect(occurrences).toHaveLength(2);
        });
    });
});
