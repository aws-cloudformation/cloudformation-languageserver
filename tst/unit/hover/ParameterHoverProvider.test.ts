import { describe, it, expect } from 'vitest';
import { ParameterType } from '../../../src/context/semantic/ParameterType';
import { ParameterHoverProvider } from '../../../src/hover/ParameterHoverProvider';
import { createParameterContext } from '../../utils/MockContext';

describe('ParameterHoverProvider', () => {
    const parameterHoverProvider = new ParameterHoverProvider();
    describe('Parameter Hover', () => {
        it('should return parameter information from template', () => {
            const mockContext = createParameterContext('EnvironmentType', {
                data: {
                    Type: ParameterType.String,
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

        it('should handle parameter with intrinsic function in Description without crashing', () => {
            const mockContext = createParameterContext('EcrRepoName', {
                data: {
                    Type: 'String' as any,
                    Default: 'my-repo',
                    Description: { 'Fn::Sub': 'Repository for ${AWS::StackName}' },
                },
            });

            // Should not throw an error
            const result = parameterHoverProvider.getInformation(mockContext);

            expect(result).toContain('(parameter) EcrRepoName: string');
            expect(result).toContain('**Type:** String');
            expect(result).toContain('**Default Value:** "my-repo"');
            expect(result).not.toContain('Description');
            expect(result).not.toContain('Fn::Sub');
        });
    });
});
