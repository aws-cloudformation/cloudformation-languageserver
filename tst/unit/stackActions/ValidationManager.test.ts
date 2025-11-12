import { describe, it, expect, beforeEach } from 'vitest';
import { Validation } from '../../../src/stacks/actions/Validation';
import { ValidationManager } from '../../../src/stacks/actions/ValidationManager';

describe('ValidationManager', () => {
    let manager: ValidationManager;
    let validation: Validation;

    beforeEach(() => {
        manager = new ValidationManager();
        validation = new Validation('test.yaml', 'test-stack', 'test-changeset');
    });

    it('should add validation', () => {
        manager.add(validation);
        expect(manager.get('test-stack')).toBe(validation);
    });

    it('should get validation by stack name', () => {
        manager.add(validation);
        const retrieved = manager.get('test-stack');
        expect(retrieved).toBe(validation);
    });

    it('should return undefined for non-existent stack', () => {
        const retrieved = manager.get('non-existent');
        expect(retrieved).toBeUndefined();
    });

    it('should remove validation and URI mapping', () => {
        manager.add(validation);
        expect(manager.get('test-stack')).toBe(validation);
        expect(manager.getLastValidationByUri('test.yaml')).toBe(validation);

        manager.remove('test-stack');

        expect(manager.get('test-stack')).toBeUndefined();
        expect(manager.getLastValidationByUri('test.yaml')).toBeUndefined();
    });

    it('should replace existing validation for same stack', () => {
        const validation2 = new Validation('test2.yaml', 'test-stack', 'test-changeset-2');

        manager.add(validation);
        manager.add(validation2);

        expect(manager.get('test-stack')).toBe(validation2);
    });

    describe('getLastValidationByUri', () => {
        it('should return validation by URI', () => {
            const validation = new Validation('file:///test.yaml', 'test-stack', 'test-changeset');
            manager.add(validation);

            expect(manager.getLastValidationByUri('file:///test.yaml')).toBe(validation);
        });

        it('should return undefined for non-existent URI', () => {
            expect(manager.getLastValidationByUri('file:///nonexistent.yaml')).toBeUndefined();
        });

        it('should update URI mapping when validation is removed', () => {
            const validation = new Validation('file:///test.yaml', 'test-stack', 'test-changeset');
            manager.add(validation);

            expect(manager.getLastValidationByUri('file:///test.yaml')).toBe(validation);

            manager.remove('test-stack');

            expect(manager.getLastValidationByUri('file:///test.yaml')).toBeUndefined();
        });

        it('should clear URI mappings when manager is cleared', () => {
            const validation = new Validation('file:///test.yaml', 'test-stack', 'test-changeset');
            manager.add(validation);

            expect(manager.getLastValidationByUri('file:///test.yaml')).toBe(validation);

            manager.clear();

            expect(manager.getLastValidationByUri('file:///test.yaml')).toBeUndefined();
        });
    });
});
