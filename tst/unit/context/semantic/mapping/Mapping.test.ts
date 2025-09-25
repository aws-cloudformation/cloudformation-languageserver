import { describe, it, expect } from 'vitest';
import { Mapping } from '../../../../../src/context/semantic/Entity';

describe('Mapping', () => {
    const sampleMappingData = {
        'us-east-1': {
            AMI: 'ami-0123456789abcdef0',
            InstanceType: 't2.micro',
        },
        'us-west-2': {
            AMI: 'ami-0abcdef1234567890',
            InstanceType: 't2.small',
        },
    };

    describe('getTopLevelKeys', () => {
        it('should return all top-level keys', () => {
            const mapping = new Mapping('RegionMap', sampleMappingData);
            const keys = mapping.getTopLevelKeys();

            expect(keys).toHaveLength(2);
            expect(keys).toContain('us-east-1');
            expect(keys).toContain('us-west-2');
        });

        it('should return an empty array for empty mapping data', () => {
            const mapping = new Mapping('EmptyMap', {});

            expect(mapping.getTopLevelKeys()).toEqual([]);
        });
    });

    describe('getSecondLevelKeys', () => {
        it('should return all second-level keys for a given top-level key', () => {
            const mapping = new Mapping('RegionMap', sampleMappingData);
            const keys = mapping.getSecondLevelKeys('us-east-1');

            expect(keys).toHaveLength(2);
            expect(keys).toContain('AMI');
            expect(keys).toContain('InstanceType');
        });

        it('should return an empty array for a non-existent top-level key', () => {
            const mapping = new Mapping('RegionMap', sampleMappingData);

            expect(mapping.getSecondLevelKeys('non-existent')).toEqual([]);
        });
    });
});
