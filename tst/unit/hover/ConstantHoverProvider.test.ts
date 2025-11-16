import { describe, it, expect } from 'vitest';
import { Constant } from '../../../src/context/semantic/Entity';
import { ConstantHoverProvider } from '../../../src/hover/ConstantHoverProvider';
import { createMockContext } from '../../utils/MockContext';

describe('ConstantHoverProvider', () => {
    const provider = new ConstantHoverProvider();

    it('should return hover information for string constant', () => {
        const constant = new Constant('foo', 'bar');
        const context = createMockContext('Constants', 'foo');
        Object.defineProperty(context, 'entity', { value: constant, writable: false });

        const result = provider.getInformation(context);

        expect(result).toBeDefined();
        expect(result).toContain('(constant) foo: string');
        expect(result).toContain('**Value:** bar');
    });

    it('should return hover information for object constant', () => {
        const constant = new Constant('obj', { TestObject: { A: 'b' } });
        const context = createMockContext('Constants', 'obj');
        Object.defineProperty(context, 'entity', { value: constant, writable: false });

        const result = provider.getInformation(context);

        expect(result).toBeDefined();
        expect(result).toContain('(constant) obj: object');
        expect(result).toContain('**Value:** [Object]');
    });

    it('should return undefined when entity is not present', () => {
        const context = createMockContext('Constants', 'foo');

        const result = provider.getInformation(context);

        expect(result).toBeUndefined();
    });
});
