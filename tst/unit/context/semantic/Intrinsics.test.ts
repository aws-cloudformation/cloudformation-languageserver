import { describe, it, expect } from 'vitest';
import {
    normalizeIntrinsicFunction,
    normalizeIntrinsicFunctionAndCondition,
} from '../../../../src/context/semantic/Intrinsics';

describe('Intrinsics', () => {
    describe('normalizeIntrinsicFunction', () => {
        it('should normalize Ref shorthand', () => {
            expect(normalizeIntrinsicFunction('!Ref')).toBe('Ref');
        });

        it('should normalize other function shorthands', () => {
            expect(normalizeIntrinsicFunction('!GetAtt')).toBe('Fn::GetAtt');
            expect(normalizeIntrinsicFunction('!Join')).toBe('Fn::Join');
            expect(normalizeIntrinsicFunction('!Sub')).toBe('Fn::Sub');
        });

        it('should return unchanged for non-shorthand functions', () => {
            expect(normalizeIntrinsicFunction('Ref')).toBe('Ref');
            expect(normalizeIntrinsicFunction('Fn::GetAtt')).toBe('Fn::GetAtt');
            expect(normalizeIntrinsicFunction('someProperty')).toBe('someProperty');
        });
    });

    describe('normalizeIntrinsicFunctionAndCondition', () => {
        it('should handle Condition specially', () => {
            expect(normalizeIntrinsicFunctionAndCondition('!Condition')).toBe('Condition');
        });

        it('should delegate to normalizeIntrinsicFunction for other cases', () => {
            expect(normalizeIntrinsicFunctionAndCondition('!Ref')).toBe('Ref');
            expect(normalizeIntrinsicFunctionAndCondition('!GetAtt')).toBe('Fn::GetAtt');
            expect(normalizeIntrinsicFunctionAndCondition('someProperty')).toBe('someProperty');
        });
    });
});
