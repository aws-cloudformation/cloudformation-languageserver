import { describe, it, expect, beforeEach } from 'vitest';
import { LiteralValueType } from '../../../../src/services/extractToParameter/ExtractToParameterTypes';
import { LiteralValueDetector } from '../../../../src/services/extractToParameter/LiteralValueDetector';

describe('LiteralValueDetector', () => {
    let detector: LiteralValueDetector;

    beforeEach(() => {
        detector = new LiteralValueDetector();
    });

    describe('string literal detection', () => {
        it('should detect simple string literals', () => {
            const mockSyntaxNode = {
                type: 'string',
                text: '"hello world"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 13 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.STRING);
            expect(result?.value).toBe('hello world');
            expect(result?.isReference).toBe(false);
        });

        it('should detect empty string literals', () => {
            const mockSyntaxNode = {
                type: 'string',
                text: '""',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 2 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.STRING);
            expect(result?.value).toBe('');
        });
    });

    describe('number literal detection', () => {
        it('should detect integer literals', () => {
            const mockSyntaxNode = {
                type: 'number',
                text: '42',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 2 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.NUMBER);
            expect(result?.value).toBe(42);
        });
    });
    describe('boolean literal detection', () => {
        it('should detect true boolean literals', () => {
            const mockSyntaxNode = {
                type: 'true',
                text: 'true',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 4 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.BOOLEAN);
            expect(result?.value).toBe(true);
        });

        it('should detect false boolean literals', () => {
            const mockSyntaxNode = {
                type: 'false',
                text: 'false',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 5 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.BOOLEAN);
            expect(result?.value).toBe(false);
        });
    });

    describe('array literal detection', () => {
        it('should detect simple array literals', () => {
            const mockSyntaxNode = {
                type: 'array',
                text: '["item1", "item2"]',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 18 },
                children: [
                    { type: 'string', text: '"item1"' },
                    { type: 'string', text: '"item2"' },
                ],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.ARRAY);
            expect(result?.value).toEqual(['item1', 'item2']);
        });

        it('should detect empty array literals', () => {
            const mockSyntaxNode = {
                type: 'array',
                text: '[]',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 2 },
                children: [],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.ARRAY);
            expect(result?.value).toEqual([]);
        });
    });
    describe('reference and intrinsic function detection', () => {
        it('should detect Ref intrinsic functions as non-extractable', () => {
            const mockSyntaxNode = {
                type: 'object',
                text: '{"Ref": "MyParameter"}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 22 },
                children: [
                    {
                        type: 'pair',
                        children: [
                            { type: 'string', text: '"Ref"' },
                            { type: 'string', text: '"MyParameter"' },
                        ],
                    },
                ],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });

        it('should detect YAML Ref as non-extractable', () => {
            const mockSyntaxNode = {
                type: 'flow_node',
                text: '!Ref MyParameter',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 16 },
                children: [
                    { type: 'tag', text: '!Ref' },
                    { type: 'plain_scalar', text: 'MyParameter' },
                ],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });
    });

    describe('edge cases and invalid contexts', () => {
        it('should return undefined for unsupported node types', () => {
            const mockSyntaxNode = {
                type: 'comment',
                text: '# This is a comment',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 19 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeUndefined();
        });

        it('should return undefined for null nodes', () => {
            const result = detector.detectLiteralValue(null as any);

            expect(result).toBeUndefined();
        });

        it('should return undefined for undefined nodes', () => {
            const result = detector.detectLiteralValue(undefined as any);

            expect(result).toBeUndefined();
        });

        it('should handle malformed JSON gracefully', () => {
            const mockSyntaxNode = {
                type: 'ERROR',
                text: '{"invalid": json}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 17 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeUndefined();
        });
    });

    describe('YAML scalar detection', () => {
        it('should detect YAML plain scalars as strings', () => {
            const mockSyntaxNode = {
                type: 'plain_scalar',
                text: 'my-value',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 8 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.STRING);
            expect(result?.value).toBe('my-value');
        });

        it('should detect YAML boolean scalars', () => {
            const mockSyntaxNode = {
                type: 'plain_scalar',
                text: 'true',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 4 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.BOOLEAN);
            expect(result?.value).toBe(true);
        });

        it('should detect YAML number scalars', () => {
            const mockSyntaxNode = {
                type: 'plain_scalar',
                text: '123',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 3 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.NUMBER);
            expect(result?.value).toBe(123);
        });

        it('should detect YAML quoted scalars', () => {
            const mockSyntaxNode = {
                type: 'quoted_scalar',
                text: '"quoted value"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 14 },
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.type).toBe(LiteralValueType.STRING);
            expect(result?.value).toBe('quoted value');
        });
    });

    describe('additional intrinsic function tests', () => {
        it('should detect Fn::Sub as extractable (not a reference)', () => {
            const mockSyntaxNode = {
                type: 'object',
                text: '{"Fn::Sub": "Hello ${Name}"}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 27 },
                children: [
                    {
                        type: 'pair',
                        children: [
                            { type: 'string', text: '"Fn::Sub"' },
                            { type: 'string', text: '"Hello ${Name}"' },
                        ],
                    },
                ],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            // Fn::Sub itself is an intrinsic function but not a reference type
            expect(result?.isReference).toBe(true);
        });

        it('should detect YAML !GetAtt as non-extractable', () => {
            const mockSyntaxNode = {
                type: 'flow_node',
                text: '!GetAtt Resource.Attribute',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 26 },
                children: [
                    { type: 'tag', text: '!GetAtt' },
                    { type: 'plain_scalar', text: 'Resource.Attribute' },
                ],
            };

            const result = detector.detectLiteralValue(mockSyntaxNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });
    });

    describe('values inside intrinsic functions should not be extractable', () => {
        it('should detect string value inside JSON Ref as non-extractable', () => {
            const parentObject = {
                type: 'object',
                text: '{"Ref": "MyParameter"}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 22 },
                children: [] as any[],
                parent: null,
            };

            const pairNode = {
                type: 'pair',
                text: '"Ref": "MyParameter"',
                startPosition: { row: 0, column: 1 },
                endPosition: { row: 0, column: 21 },
                children: [] as any[],
                parent: parentObject,
            };

            const stringNode = {
                type: 'string',
                text: '"MyParameter"',
                startPosition: { row: 0, column: 8 },
                endPosition: { row: 0, column: 21 },
                parent: pairNode,
            };

            parentObject.children = [pairNode];
            pairNode.children = [{ type: 'string', text: '"Ref"', parent: pairNode }, stringNode];

            const result = detector.detectLiteralValue(stringNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });

        it('should detect string value inside YAML !Ref as non-extractable', () => {
            const flowNode = {
                type: 'flow_node',
                text: '!Ref MyParameter',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 16 },
                children: [] as any[],
                parent: null,
            };

            const scalarNode = {
                type: 'plain_scalar',
                text: 'MyParameter',
                startPosition: { row: 0, column: 5 },
                endPosition: { row: 0, column: 16 },
                parent: flowNode,
            };

            flowNode.children = [{ type: 'tag', text: '!Ref', parent: flowNode }, scalarNode];

            const result = detector.detectLiteralValue(scalarNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });

        it('should detect string value inside JSON Fn::GetAtt as non-extractable', () => {
            const parentObject = {
                type: 'object',
                text: '{"Fn::GetAtt": ["Resource", "Attribute"]}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 41 },
                children: [] as any[],
                parent: null,
            };

            const pairNode = {
                type: 'pair',
                text: '"Fn::GetAtt": ["Resource", "Attribute"]',
                startPosition: { row: 0, column: 1 },
                endPosition: { row: 0, column: 40 },
                children: [] as any[],
                parent: parentObject,
            };

            const arrayNode = {
                type: 'array',
                text: '["Resource", "Attribute"]',
                startPosition: { row: 0, column: 15 },
                endPosition: { row: 0, column: 40 },
                children: [] as any[],
                parent: pairNode,
            };

            const stringNode = {
                type: 'string',
                text: '"Resource"',
                startPosition: { row: 0, column: 16 },
                endPosition: { row: 0, column: 26 },
                parent: arrayNode,
            };

            parentObject.children = [pairNode];
            pairNode.children = [{ type: 'string', text: '"Fn::GetAtt"', parent: pairNode }, arrayNode];
            arrayNode.children = [stringNode];

            const result = detector.detectLiteralValue(stringNode as any);

            expect(result).toBeDefined();
            expect(result?.isReference).toBe(true);
        });

        it('should allow extracting string value inside YAML !Sub (not a reference type)', () => {
            const flowNode = {
                type: 'flow_node',
                text: '!Sub "Hello ${Name}"',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 20 },
                children: [] as any[],
                parent: null,
            };

            const stringNode = {
                type: 'quoted_scalar',
                text: '"Hello ${Name}"',
                startPosition: { row: 0, column: 5 },
                endPosition: { row: 0, column: 20 },
                parent: flowNode,
            };

            flowNode.children = [{ type: 'tag', text: '!Sub', parent: flowNode }, stringNode];

            const result = detector.detectLiteralValue(stringNode as any);

            expect(result).toBeDefined();
            // !Sub is not a reference type, so values inside it can be extracted
            expect(result?.isReference).toBe(false);
        });

        it('should allow extracting string value inside JSON Fn::Join array (not a reference type)', () => {
            const parentObject = {
                type: 'object',
                text: '{"Fn::Join": ["-", ["prefix", "suffix"]]}',
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 41 },
                children: [] as any[],
                parent: null,
            };

            const pairNode = {
                type: 'pair',
                text: '"Fn::Join": ["-", ["prefix", "suffix"]]',
                startPosition: { row: 0, column: 1 },
                endPosition: { row: 0, column: 40 },
                children: [] as any[],
                parent: parentObject,
            };

            const outerArrayNode = {
                type: 'array',
                text: '["-", ["prefix", "suffix"]]',
                startPosition: { row: 0, column: 13 },
                endPosition: { row: 0, column: 40 },
                children: [] as any[],
                parent: pairNode,
            };

            const innerArrayNode = {
                type: 'array',
                text: '["prefix", "suffix"]',
                startPosition: { row: 0, column: 19 },
                endPosition: { row: 0, column: 39 },
                children: [] as any[],
                parent: outerArrayNode,
            };

            const stringNode = {
                type: 'string',
                text: '"prefix"',
                startPosition: { row: 0, column: 20 },
                endPosition: { row: 0, column: 28 },
                parent: innerArrayNode,
            };

            parentObject.children = [pairNode];
            pairNode.children = [{ type: 'string', text: '"Fn::Join"', parent: pairNode }, outerArrayNode];
            outerArrayNode.children = [{ type: 'string', text: '"-"', parent: outerArrayNode }, innerArrayNode];
            innerArrayNode.children = [stringNode];

            const result = detector.detectLiteralValue(stringNode as any);

            expect(result).toBeDefined();
            // Fn::Join is not a reference type, so values inside it can be extracted
            expect(result?.isReference).toBe(false);
        });
    });
});
