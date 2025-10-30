import { describe, it, expect } from 'vitest';
import { TransformContext } from '../../../src/context/TransformContext';
import { DocumentType } from '../../../src/document/Document';

describe('TransformContext', () => {
    it('should detect SAM transform when present', () => {
        // Mock syntax tree with SAM transform
        const mockNode = {
            childCount: 2,
            descendantsOfType: () => [mockNode],
            namedChildren: [
                {
                    type: 'block_mapping_pair',
                    childForFieldName: (field: string) => {
                        if (field === 'key') return { text: 'Transform' };
                        if (field === 'value') return { text: 'AWS::Serverless-2016-10-31' };
                        return null;
                    },
                },
                {
                    type: 'block_mapping_pair',
                    childForFieldName: (field: string) => {
                        if (field === 'key') return { text: 'Resources' };
                        if (field === 'value') return { text: '{}' };
                        return null;
                    },
                },
            ],
            child: (index: number) => {
                if (index === 0) {
                    return {
                        type: 'block_mapping_pair',
                        childForFieldName: (field: string) => {
                            if (field === 'key') return { text: 'Transform' };
                            if (field === 'value') return { text: 'AWS::Serverless-2016-10-31' };
                            return null;
                        },
                    };
                }
                if (index === 1) {
                    return {
                        type: 'block_mapping_pair',
                        childForFieldName: (field: string) => {
                            if (field === 'key') return { text: 'Resources' };
                            if (field === 'value') return { text: '{}' };
                            return null;
                        },
                    };
                }
                return null;
            },
            type: 'block_mapping',
        } as any;

        const context = new TransformContext(mockNode, DocumentType.YAML);
        expect(context.hasSamTransform()).toBe(true);
    });

    it('should return false when no SAM transform present', () => {
        const mockNode = {
            childCount: 0,
            child: () => null,
            descendantsOfType: () => [],
            namedChildren: [],
        } as any;
        const context = new TransformContext(mockNode, DocumentType.YAML);
        expect(context.hasSamTransform()).toBe(false);
    });
});
