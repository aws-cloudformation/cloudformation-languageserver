import { describe, it, expect, beforeAll } from 'vitest';
import { MappingHoverProvider } from '../../../src/hover/MappingHoverProvider';
import { createMappingContext } from '../../utils/MockContext';

describe('MappingHoverProvider', () => {
    const mappingHoverProvider = new MappingHoverProvider();
    beforeAll(() => {});
    describe('Mapping Hover', () => {
        it('should return mapping information from template', () => {
            const mappingData = {
                dev: {
                    InstanceType: 't2.micro',
                    MinSize: 1,
                    MaxSize: 2,
                },
                test: {
                    InstanceType: 't2.small',
                    MinSize: 2,
                    MaxSize: 4,
                },
                prod: {
                    InstanceType: 't2.medium',
                    MinSize: 3,
                    MaxSize: 6,
                },
            };
            const mockContext = createMappingContext('EnvironmentMap', { data: mappingData });
            const result = mappingHoverProvider.getInformation(mockContext);

            expect(result).toContain('**Mapping:** EnvironmentMap');
            expect(result).toContain('**dev:**');
            expect(result).toContain('- InstanceType: "t2.micro"');
            expect(result).toContain('- MinSize: 1');
            expect(result).toContain('- MaxSize: 2');
            expect(result).toContain('**test:**');
            expect(result).toContain('- InstanceType: "t2.small"');
            expect(result).toContain('**prod:**');
            expect(result).toContain('- InstanceType: "t2.medium"');
        });
    });
});
