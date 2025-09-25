import { describe, it, expect } from 'vitest';
import { ParameterHoverProvider } from '../../../src/hover/ParameterHoverProvider';
import { createParameterContext } from '../../utils/MockContext';

describe('ParameterHoverProvider', () => {
    const parameterHoverProvider = new ParameterHoverProvider();
    describe('Parameter Hover', () => {
        it('should return parameter information from template', () => {
            const mockContext = createParameterContext('EnvironmentType', {
                data: {
                    Type: 'String' as any,
                    Default: 'dev',
                    Description: 'Environment type',
                    AllowedValues: ['dev', 'test', 'prod'],
                    ConstraintDescription: 'Must be dev, test, or prod',
                },
            });
            const result = parameterHoverProvider.getInformation(mockContext);

            expect(result).toContain('(parameter) EnvironmentType: string');
            expect(result).toContain('Environment type');
            expect(result).toContain('**Type:** String');
            expect(result).toContain('**Default Value:** "dev"');
            expect(result).toContain('**Allowed Values:**');
            expect(result).toContain('- dev');
            expect(result).toContain('- test');
            expect(result).toContain('- prod');
            expect(result).toContain('**Constraint Description:** Must be dev, test, or prod');
        });
    });
});
