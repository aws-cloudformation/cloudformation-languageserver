import { describe, it, expect, beforeEach } from 'vitest';
import { intrinsicFunctionsDocsMap } from '../../../src/artifacts/IntrinsicFunctionsDocs';
import { IntrinsicFunction } from '../../../src/context/ContextType';
import { IntrinsicFunctionHoverProvider } from '../../../src/hover/IntrinsicFunctionHoverProvider';
import { createMockContext as mockContext } from '../../utils/MockContext';

describe('IntrinsicFunctionHoverProvider', () => {
    let hoverProvider: IntrinsicFunctionHoverProvider;

    beforeEach(() => {
        hoverProvider = new IntrinsicFunctionHoverProvider();
    });

    function createMockContext(intrinsicText: string) {
        return mockContext('Unknown', undefined, { text: intrinsicText });
    }

    it('should return documentation for Fn::Ref', () => {
        const mockContext = createMockContext('Ref');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Ref));
    });

    it('should return documentation for Fn::GetAtt', () => {
        const mockContext = createMockContext('Fn::GetAtt');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(intrinsicFunctionsDocsMap.get(IntrinsicFunction.GetAtt));
    });

    it('should return documentation for Fn::FindInMap', () => {
        const mockContext = createMockContext('Fn::FindInMap');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(intrinsicFunctionsDocsMap.get(IntrinsicFunction.FindInMap));
    });

    it('should return documentation for Fn::Join', () => {
        const mockContext = createMockContext('Fn::Join');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Join));
    });

    it('should return documentation for Fn::Sub', () => {
        const mockContext = createMockContext('Fn::Sub');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBe(intrinsicFunctionsDocsMap.get(IntrinsicFunction.Sub));
    });

    it('should return undefined for unknown function', () => {
        const mockContext = createMockContext('UnknownFunction');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });

    it('should return undefined for empty text', () => {
        const mockContext = createMockContext('');

        const result = hoverProvider.getInformation(mockContext);

        expect(result).toBeUndefined();
    });
});
