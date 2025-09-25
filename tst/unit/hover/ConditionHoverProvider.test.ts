import { describe, it, expect } from 'vitest';
import { ConditionHoverProvider } from '../../../src/hover/ConditionHoverProvider';
import { createConditionContext } from '../../utils/MockContext';

describe('ConditionHoverProvider', () => {
    const conditionHoverProvider = new ConditionHoverProvider();

    describe('Condition Hover', () => {
        it('should return condition information from template', () => {
            const conditionData = { 'Fn::Equals': [{ Ref: 'EnvironmentType' }, 'prod'] };
            const mockContext = createConditionContext('IsProd', { data: conditionData });
            const result = conditionHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Condition:** IsProd');
            expect(result).toContain("{'Fn::Equals': [{Ref: 'EnvironmentType'}, 'prod']}");
        });
    });
});
