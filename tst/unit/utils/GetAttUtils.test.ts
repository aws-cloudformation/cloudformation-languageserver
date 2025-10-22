import { describe, expect, it } from 'vitest';
import { determineGetAttPosition, extractGetAttResourceLogicalId } from '../../../src/utils/GetAttUtils';
import { createResourceContext } from '../../utils/MockContext';

describe('GetAttUtils', () => {
    describe('determineGetAttPosition', () => {
        it('should return 1 for resource name in array format', () => {
            const context = createResourceContext('MyBucket', { text: 'MyBucket' });
            const args = ['MyBucket', 'Arn'];

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 2 for attribute name in array format', () => {
            const context = createResourceContext('MyBucket', { text: 'Arn' });
            const args = ['MyBucket', 'Arn'];

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(2);
        });

        it('should return 1 for resource name in dot notation format', () => {
            const context = createResourceContext('MyBucket', { text: 'MyBucket' });
            const args = 'MyBucket.Arn';

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 2 for attribute name in dot notation format', () => {
            const context = createResourceContext('MyBucket', { text: 'Arn' });
            const args = 'MyBucket.Arn';

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(2);
        });

        it('should return 1 for partial resource name match in dot notation', () => {
            const context = createResourceContext('MyBucket', { text: 'MyB' });
            const args = 'MyBucket.Arn';

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 1 for single resource name without dot', () => {
            const context = createResourceContext('MyBucket', { text: 'MyBucket' });
            const args = 'MyBucket';

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 1 for single element array', () => {
            const context = createResourceContext('MyBucket', { text: 'SomeText' });
            const args = ['MyBucket'];

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 1 for empty array', () => {
            const context = createResourceContext('MyBucket', { text: 'SomeText' });
            const args: string[] = [];

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(1);
        });

        it('should return 0 for non-string, non-array args', () => {
            const context = createResourceContext('MyBucket', { text: 'SomeText' });
            const args = { invalid: 'object' };

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(0);
        });

        it('should return 2 for nested attribute with dots', () => {
            const context = createResourceContext('MyTable', { text: 'StreamSpecification.StreamArn' });
            const args = ['MyTable', 'StreamSpecification.StreamArn'];

            const result = determineGetAttPosition(args, context);

            expect(result).toBe(2);
        });
    });

    describe('extractGetAttResourceLogicalId', () => {
        it('should extract resource ID from array format', () => {
            const args = ['MyBucket', 'Arn'];

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBe('MyBucket');
        });

        it('should extract resource ID from dot notation format', () => {
            const args = 'MyBucket.Arn';

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBe('MyBucket');
        });

        it('should return full string when no dot in string format', () => {
            const args = 'MyBucket';

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBe('MyBucket');
        });

        it('should return undefined for empty array', () => {
            const args: string[] = [];

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-string first element in array', () => {
            const args = [123, 'Arn'];

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBeUndefined();
        });

        it('should return undefined for non-string, non-array args', () => {
            const args = { invalid: 'object' };

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBeUndefined();
        });

        it('should handle complex resource names with dots', () => {
            const args = 'My.Complex.Resource.Name.Arn';

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBe('My');
        });

        it('should handle nested attributes in array format', () => {
            const args = ['MyTable', 'StreamSpecification.StreamArn'];

            const result = extractGetAttResourceLogicalId(args);

            expect(result).toBe('MyTable');
        });
    });
});
