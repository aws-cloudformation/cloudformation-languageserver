import { describe, it, expect } from 'vitest';
import { TopLevelSection, EntityType } from '../../../../src/context/CloudFormationEnums';
import { logicalIdAndSection } from '../../../../src/context/Context';
import { entityTypeFromSection } from '../../../../src/context/semantic/EntityBuilder';

describe('EntityBuilder', () => {
    describe('logicalIdAndSection', () => {
        it('should return undefined logicalId when propertyPath[1] is a number', () => {
            // This simulates malformed templates like: Resources: [...]
            const propertyPath = ['Resources', 0, 'Type'] as any;

            const result = logicalIdAndSection(propertyPath);

            expect(result.section).toBe(TopLevelSection.Resources);
            expect(result.logicalId).toBeUndefined();
        });

        it('should return string logicalId when propertyPath[1] is a string', () => {
            const propertyPath = ['Resources', 'MyBucket', 'Type'];

            const result = logicalIdAndSection(propertyPath);

            expect(result.section).toBe(TopLevelSection.Resources);
            expect(result.logicalId).toBe('MyBucket');
        });
    });

    describe('entityTypeFromSection', () => {
        it('should return Resource type for string logicalId', () => {
            const result = entityTypeFromSection(TopLevelSection.Resources, 'MyBucket');
            expect(result).toBe(EntityType.Resource);
        });

        it('should return ForEachResource type for Fn::ForEach logicalId', () => {
            const result = entityTypeFromSection(TopLevelSection.Resources, 'Fn::ForEach::LoopName');
            expect(result).toBe(EntityType.ForEachResource);
        });

        it('should return Output type for Outputs section', () => {
            const result = entityTypeFromSection(TopLevelSection.Outputs, 'MyOutput');
            expect(result).toBe(EntityType.Output);
        });

        it('should return Metadata type for Metadata section', () => {
            const result = entityTypeFromSection(TopLevelSection.Metadata);
            expect(result).toBe(EntityType.Metadata);
        });
    });
});
