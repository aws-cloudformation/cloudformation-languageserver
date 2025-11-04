import { describe, expect, it } from 'vitest';
import { PlaceholderConstants, PlaceholderReplacer } from '../../../../src/schema/transformers/PlaceholderConstants';

describe('PlaceholderConstants', () => {
    describe('createPlaceholder', () => {
        it('should create placeholder with correct format', () => {
            const result = PlaceholderConstants.createPlaceholder('TEST_PURPOSE', 'MyResource');
            expect(result).toBe('__PLACEHOLDER__TEST_PURPOSE__MyResource');
        });

        it('should create placeholder for WRITE_ONLY_REQUIRED', () => {
            const result = PlaceholderConstants.createPlaceholder(PlaceholderConstants.WRITE_ONLY_REQUIRED, 'IAMRole');
            expect(result).toBe('__PLACEHOLDER__WRITE_ONLY_REQUIRED__IAMRole');
        });

        it('should create placeholder for CLONE_INPUT_REQUIRED', () => {
            const result = PlaceholderConstants.createPlaceholder(
                PlaceholderConstants.CLONE_INPUT_REQUIRED,
                'S3Bucket',
            );
            expect(result).toBe('__PLACEHOLDER__CLONE_INPUT_REQUIRED__S3Bucket');
        });
    });

    describe('hasPlaceholders', () => {
        it('should return true when text contains placeholder', () => {
            const text = 'some text __PLACEHOLDER__TEST__Resource more text';
            expect(PlaceholderConstants.hasPlaceholders(text)).toBe(true);
        });

        it('should return false when text does not contain placeholder', () => {
            const text = 'some text without placeholder';
            expect(PlaceholderConstants.hasPlaceholders(text)).toBe(false);
        });
    });
});

describe('PlaceholderReplacer', () => {
    describe('replaceWithTabStops', () => {
        it('should replace single WRITE_ONLY_REQUIRED placeholder', () => {
            const input = '__PLACEHOLDER__WRITE_ONLY_REQUIRED__MyResource';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe('${1:write only required property for MyResource}');
        });

        it('should replace single CLONE_INPUT_REQUIRED placeholder', () => {
            const input = '__PLACEHOLDER__CLONE_INPUT_REQUIRED__MyBucket';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe('${1:enter new identifier for MyBucket}');
        });

        it('should replace multiple placeholders with sequential tabstops', () => {
            const input = `{
  "Prop1": "__PLACEHOLDER__WRITE_ONLY_REQUIRED__Resource1",
  "Prop2": "__PLACEHOLDER__CLONE_INPUT_REQUIRED__Resource2",
  "Prop3": "__PLACEHOLDER__WRITE_ONLY_REQUIRED__Resource3"
}`;
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toContain('${1:write only required property for Resource1}');
            expect(result).toContain('${2:enter new identifier for Resource2}');
            expect(result).toContain('${3:write only required property for Resource3}');
        });

        it('should handle placeholders with underscores in purpose', () => {
            const input = '__PLACEHOLDER__SOME_LONG_PURPOSE_NAME__MyResource';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe('${1:enter new identifier for MyResource}');
        });

        it('should handle placeholders with numbers in logical ID', () => {
            const input = '__PLACEHOLDER__CLONE_INPUT_REQUIRED__Resource123';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe('${1:enter new identifier for Resource123}');
        });

        it('should return unchanged text when no placeholders present', () => {
            const input = 'regular text without placeholders';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe(input);
        });

        it('should handle mixed content with placeholders', () => {
            const input =
                'Before __PLACEHOLDER__WRITE_ONLY_REQUIRED__Res1 Middle __PLACEHOLDER__CLONE_INPUT_REQUIRED__Res2 After';
            const result = PlaceholderReplacer.replaceWithTabStops(input);
            expect(result).toBe(
                'Before ${1:write only required property for Res1} Middle ${2:enter new identifier for Res2} After',
            );
        });

        it('should use independent counter for each call', () => {
            const input1 = '__PLACEHOLDER__WRITE_ONLY_REQUIRED__Res1';
            const input2 = '__PLACEHOLDER__CLONE_INPUT_REQUIRED__Res2';

            const result1 = PlaceholderReplacer.replaceWithTabStops(input1);
            const result2 = PlaceholderReplacer.replaceWithTabStops(input2);

            expect(result1).toBe('${1:write only required property for Res1}');
            expect(result2).toBe('${1:enter new identifier for Res2}');
        });
    });

    describe('hasPlaceholders', () => {
        it('should return true when text contains placeholder', () => {
            const text = '__PLACEHOLDER__TEST__Resource';
            expect(PlaceholderReplacer.hasPlaceholders(text)).toBe(true);
        });

        it('should return false when text does not contain placeholder', () => {
            const text = 'no placeholder here';
            expect(PlaceholderReplacer.hasPlaceholders(text)).toBe(false);
        });
    });
});
